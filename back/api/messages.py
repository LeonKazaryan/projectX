from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
import asyncio
from pydantic import BaseModel
from typing import List, Optional
from back.globals import get_telegram_manager
from back.telegram.telegram_client import TelegramClientManager
from back.ai.message_analyzer import message_analyzer
from back.ai.secure_rag_engine import secure_rag_engine

messages_router = APIRouter()

class Message(BaseModel):
    id: int
    text: str
    date: str
    sender_id: int
    is_outgoing: bool

class MessagesResponse(BaseModel):
    success: bool
    messages: List[Message]
    error: Optional[str] = None

class SendMessageRequest(BaseModel):
    dialog_id: int
    text: str
    session_id: str

class SendMessageResponse(BaseModel):
    success: bool
    message: Optional[dict] = None
    error: Optional[str] = None

@messages_router.get("/history", response_model=MessagesResponse)
async def get_message_history(
    session_id: str = Query(..., description="ID сессии"),
    dialog_id: int = Query(..., description="ID диалога"),
    limit: int = Query(50, description="Количество сообщений"),
    offset_id: int = Query(0, description="ID сообщения, с которого начать (для пагинации)"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    manager = Depends(get_telegram_manager)
):
    """Получить историю сообщений из диалога и синхронизировать с RAG"""
    result = await manager.get_messages(session_id, dialog_id, limit, offset_id=offset_id)
    
    if result["success"]:
        # Add messages to AI context and RAG asynchronously
        background_tasks.add_task(
            add_messages_to_ai_and_rag_context, 
            session_id, 
            dialog_id, 
            result["messages"]
        )
        # Синхронизируем всю историю с RAG (без force_resync)
        background_tasks.add_task(
            secure_rag_engine.sync_chat_history,
            session_id,
            dialog_id,
            result["messages"],
            False
        )
        return MessagesResponse(
            success=True,
            messages=result["messages"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"])

async def add_messages_to_ai_and_rag_context(session_id: str, dialog_id: int, messages: List[dict]):
    """Add batch of messages to AI context and RAG vector store"""
    try:
        for message in messages:
            # Add to traditional AI context
            message_analyzer.add_message_to_context(session_id, dialog_id, message, 50)
            
            # Store securely in RAG vector store (embeddings only)
            await secure_rag_engine.store_message_securely(session_id, dialog_id, message)
            
        print(f"Successfully processed {len(messages)} messages for RAG and AI context")
    except Exception as e:
        print(f"Error adding messages to AI and RAG context: {e}")

@messages_router.post("/send", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    manager = Depends(get_telegram_manager)
):
    """Отправить сообщение"""
    result = await manager.send_message(
        request.session_id, 
        request.dialog_id, 
        request.text
    )
    
    if result["success"]:
        # Add sent message to AI context and RAG
        sent_message = {
            "id": result["message"].get("id", 0),
            "text": request.text,
            "date": result["message"].get("date", ""),
            "sender_id": result["message"].get("sender_id", 0),
            "is_outgoing": True
        }
        
        # Add to traditional AI context immediately
        message_analyzer.add_message_to_context(
            request.session_id, 
            request.dialog_id, 
            sent_message
        )
        
        # Store securely in RAG in background
        background_tasks.add_task(
            secure_rag_engine.store_message_securely,
            request.session_id,
            request.dialog_id,
            sent_message
        )
        
        return SendMessageResponse(
            success=True,
            message=result["message"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"]) 
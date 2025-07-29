from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from back.globals import get_telegram_manager

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
    manager = Depends(get_telegram_manager)
):
    """Получить историю сообщений из диалога"""
    result = await manager.get_messages(session_id, dialog_id, limit, offset_id=offset_id)
    
    if result["success"]:
        return MessagesResponse(
            success=True,
            messages=result["messages"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"])

@messages_router.post("/send", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    manager = Depends(get_telegram_manager)
):
    """Отправить сообщение"""
    result = await manager.send_message(
        request.session_id, 
        request.dialog_id, 
        request.text
    )
    
    if result["success"]:
        return SendMessageResponse(
            success=True,
            message=result["message"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"]) 
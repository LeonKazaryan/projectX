from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

from .auth import get_current_user
from ..models.database import User
from ..services.ai_service import AIService
from ..services.context_service import ContextService

router = APIRouter()

class ChatContextRequest(BaseModel):
    query: str
    session_id: str
    chat_id: str  # can be int for telegram or str for whatsapp
    source: str  # "telegram" or "whatsapp"
    chat_name: str
    context_messages: List[Dict[str, Any]] = []

class ChatContextResponse(BaseModel):
    success: bool
    response: str
    error: Optional[str] = None
    context_used: Optional[int] = None
    memory_updated: Optional[bool] = None

class SuggestionRequest(BaseModel):
    session_id: str
    chat_id: str
    source: str  # "telegram" or "whatsapp"
    chat_name: str
    recent_messages: List[Dict[str, Any]] = []
    user_style: Optional[str] = None

class SuggestionResponse(BaseModel):
    success: bool
    suggestion: str
    error: Optional[str] = None

# Initialize services
ai_service = AIService()
context_service = ContextService()

@router.post("/chat-context", response_model=ChatContextResponse)
async def ai_chat_context(
    request: ChatContextRequest,
    current_user: User = Depends(get_current_user)
):
    """
    AI chat assistant with full context memory and analysis
    """
    try:
        # Get user ID
        user_id = current_user.id
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found"
            )

        # Process the AI request with context
        result = await ai_service.process_chat_query(
            user_id=user_id,
            session_id=request.session_id,
            chat_id=request.chat_id,
            source=request.source,
            chat_name=request.chat_name,
            query=request.query,
            context_messages=request.context_messages
        )

        return ChatContextResponse(
            success=True,
            response=result["response"],
            context_used=result.get("context_used", 0),
            memory_updated=result.get("memory_updated", False)
        )

    except Exception as e:
        print(f"AI Error: {str(e)}")
        return ChatContextResponse(
            success=False,
            response="",
            error=str(e)
        )

@router.get("/health")
async def ai_health():
    """Check AI service health"""
    try:
        health = await ai_service.health_check()
        return {
            "status": "healthy",
            "services": health,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service unhealthy: {str(e)}"
        )

@router.post("/analyze-full-chat")
async def analyze_full_chat(
    request: ChatContextRequest,
    current_user: User = Depends(get_current_user)
):
    """Analyze and vectorize entire chat history for smart search"""
    try:
        user_id = current_user.id
        
        # Process ALL messages for this chat
        result = await ai_service.vectorize_chat_history(
            user_id=user_id,
            session_id=request.session_id,
            chat_id=request.chat_id,
            source=request.source,
            chat_name=request.chat_name,
            all_messages=request.context_messages
        )
        
        return {
            "success": True,
            "vectorized_messages": result.get("vectorized_count", 0),
            "memory_updated": True
        }
        
    except Exception as e:
        print(f"Full chat analysis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/clear-memory/{chat_id}")
async def clear_chat_memory(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Clear AI memory for specific chat"""
    try:
        user_id = current_user.id
        await context_service.clear_chat_memory(user_id, chat_id)
        return {"success": True, "message": "Chat memory cleared"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/suggest-response", response_model=SuggestionResponse)
async def suggest_response(
    request: SuggestionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate AI-powered response suggestions in user's style
    """
    try:
        # Get recent messages for context
        context_messages = request.recent_messages[-10:]  # Last 10 messages
        
        # Find the last message from contact (not outgoing)
        last_contact_message = None
        for msg in reversed(context_messages):
            if not msg.get('isOutgoing', False):
                last_contact_message = msg
                break
        
        if not last_contact_message:
            return SuggestionResponse(
                success=True,
                suggestion="Привет! Как дела?"
            )
        
        # Analyze user's writing style from outgoing messages
        user_messages = [msg['text'] for msg in context_messages if msg.get('isOutgoing', False)]
        user_style_analysis = ""
        if user_messages:
            avg_length = sum(len(msg) for msg in user_messages) / len(user_messages)
            if avg_length < 20:
                user_style_analysis = "краткий стиль, короткие сообщения"
            elif avg_length > 100:
                user_style_analysis = "подробный стиль, длинные сообщения"
            else:
                user_style_analysis = "средний стиль сообщений"
        
        # Create suggestion prompt
        prompt = f"""
Проанализируй переписку и предложи подходящий ответ в стиле пользователя.

Последнее сообщение собеседника: "{last_contact_message.get('text', '')}"

Стиль пользователя: {user_style_analysis}

Контекст последних сообщений:
{chr(10).join([f"{'Я' if msg.get('isOutgoing') else 'Собеседник'}: {msg.get('text', '')}" for msg in context_messages[-5:]])}

Предложи естественный ответ в стиле пользователя. Ответ должен быть:
- В том же тоне что и предыдущие сообщения пользователя
- Подходящий по контексту
- Естественный и живой
- Не более 100 символов

Только текст ответа, без кавычек и объяснений:
"""

        # Get suggestion from AI service
        suggestion = await ai_service.process_request(
            user_id=current_user.id,
            chat_id=request.chat_id,
            query=prompt,
            context_messages=[],  # Using embedded context in prompt
            source=request.source
        )
        
        return SuggestionResponse(
            success=True,
            suggestion=suggestion.strip()
        )
        
    except Exception as e:
        print(f"AI suggestion error: {str(e)}")
        return SuggestionResponse(
            success=False,
            suggestion="Не удалось сгенерировать предложение",
            error=str(e)
        )

@router.get("/health")
async def ai_health():
    """Check AI service health"""
    return {"status": "healthy", "service": "ai"} 
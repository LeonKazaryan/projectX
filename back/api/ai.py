from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Union
import os
import logging

from back.globals import get_telegram_manager
from back.telegram.telegram_client import TelegramClientManager
from back.agents.chief_agent import ChiefAgent
from back.ai.gemini_client import gemini_client

logger = logging.getLogger(__name__)
router = APIRouter()

class AISettings(BaseModel):
    memory_limit: int = 20
    enabled: bool = True
    suggestion_delay: float = 1.0  # Delay in seconds before showing suggestion
    continuous_suggestions: bool = True  # Whether to provide continuous suggestions
    proactive_suggestions: bool = True  # Whether to suggest when conversation is quiet

class AISettingsResponse(BaseModel):
    success: bool
    settings: Optional[AISettings] = None
    error: Optional[str] = None

# In-memory settings storage (in production, use database)
user_ai_settings: dict = {}

def get_user_ai_settings(session_id: str) -> AISettings:
    """Get AI settings for a user"""
    return user_ai_settings.get(session_id, AISettings())


@router.get("/settings", response_model=AISettingsResponse)
async def get_ai_settings(session_id: str = Query(...)):
    """Get the current AI settings for a session."""
    try:
        settings = get_user_ai_settings(session_id)
        return AISettingsResponse(success=True, settings=settings)
    except Exception as e:
        logger.error(f"Error getting AI settings for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve AI settings.")

@router.post("/settings")
async def update_ai_settings(
    session_id: str = Body(...),
    settings: AISettings = Body(...)
):
    """Update the AI settings for a session."""
    try:
        user_ai_settings[session_id] = settings
        logger.info(f"Updated AI settings for session {session_id}")
        return {"success": True, "message": "Settings updated successfully."}
    except Exception as e:
        logger.error(f"Error updating AI settings for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update AI settings.")

@router.get("/health")
async def ai_health_check():
    """Check AI system health (e.g., connection to Gemini)."""
    # Check if Gemini API key is configured
    is_configured = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "ok" if is_configured else "degraded",
        "details": "Gemini API key is configured." if is_configured else "Gemini API key not set.",
        "components": {
            "gemini": "configured" if is_configured else "not_configured"
        }
    }

class AgentResponseRequest(BaseModel):
    session_id: str
    chat_id: int
    query: str
    message_history: List[Dict] # e.g. {"sender": "user", "text": "Hello"}

def normalize_message_history(message_history: List[Dict], user_id: Union[str, int, None] = None) -> List[Dict]:
    """
    Преобразует историю сообщений так, чтобы у каждого сообщения была роль:
    - 'Вы' если исходящее (is_outgoing == True или sender == 'user')
    - 'Собеседник' если входящее
    """
    normalized = []
    for msg in message_history:
        # Определяем, кто автор
        is_out = msg.get('is_outgoing') or msg.get('isOutgoing')
        sender = msg.get('sender', '')
        # Если явно указано outgoing
        if is_out:
            role = 'Вы'
        # Если sender явно user
        elif sender == 'user' or sender == user_id:
            role = 'Вы'
        else:
            role = 'Собеседник'
        normalized.append({
            **msg,
            'role': role
        })
    return normalized

@router.post("/generate-agent-response")
async def generate_agent_response(
    request: AgentResponseRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """
    Handles a user query by executing a multi-agent workflow 
    to generate a human-like, personalized response.
    """
    try:
        # Use our gemini_client singleton
        if not gemini_client.client:
            raise HTTPException(status_code=500, detail="Gemini client not initialized")

        chief_agent = ChiefAgent(llm_client=gemini_client, telegram_manager=manager)
        
        # Prepare last_message for agents expecting it
        last_message = {
            "sender": "user",
            "text": request.query
        }

        # Нормализуем историю сообщений
        normalized_history = normalize_message_history(request.message_history)

        initial_state = {
            "session_id": request.session_id,
            "chat_id": request.chat_id,
            "query": request.query,
            "message_history": normalized_history,
            "last_message": last_message,
        }

        result_state = await chief_agent.execute(initial_state)

        if 'error' in result_state:
            raise HTTPException(status_code=500, detail=result_state['error'])

        return {
            "success": True,
            "response": result_state.get('final_response', 'No response generated.'),
            "debug_data": {
                "persona_profile": result_state.get('persona_profile'),
                "context": result_state.get('context'),
                "draft_response": result_state.get('draft_response'),
                "similar_messages": result_state.get('similar_messages', [])
            }
        }

    except Exception as e:
        logger.error(f"Error in agent response generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AIChatContextRequest(BaseModel):
    query: str
    session_id: str
    chat_id: Union[int, str]
    source: str = "telegram"  # telegram or whatsapp
    chat_name: str = ""
    context_messages: List[Dict] = []

@router.post("/chat-context")
async def ai_chat_with_context(
    request: AIChatContextRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """
    AI chat that can answer questions about the conversation context.
    Uses RAG to find relevant information and provides intelligent responses.
    """
    try:
        if not gemini_client.client:
            raise HTTPException(status_code=500, detail="AI service not available")

        # Build smart RAG context
        from back.ai.rag_pipeline import build_context_for_ai

        if request.source == "whatsapp":
            # WhatsApp: simple prompt using provided recent messages only
            lines = []
            for msg in request.context_messages[-50:]:
                who = "Вы" if msg.get("isOutgoing") else "Контакт"
                text = msg.get("text", "")
                lines.append(f"{who}: {text}")
            recent_block = "\n".join(lines)
            prompt = f"Контекст WhatsApp:\n{recent_block}\n\nВопрос: {request.query}\nОтвет:"
            ctx_meta = {"recent": len(lines)}
            tokens_cnt = len(prompt)//4
        else:
            ctx_info = await build_context_for_ai(request.session_id, int(request.chat_id), request.query, recent_limit=50, provided_recent=request.context_messages)
            prompt = ctx_info["prompt"]
            ctx_meta = ctx_info["sections"]
            tokens_cnt = ctx_info["tokens"]

        # Generate response
        response = await gemini_client.generate_text(prompt=prompt, max_tokens=400, temperature=0.7)
        if not response:
            raise HTTPException(status_code=500, detail="Failed to generate AI response")

        return {
            "success": True,
            "response": response.strip(),
            "context_meta": ctx_meta,
            "prompt_tokens": tokens_cnt,
            "source": request.source
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI chat context: {e}")
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")
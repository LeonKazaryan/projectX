from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import logging

from back.globals import get_telegram_manager
from back.telegram.telegram_client import TelegramClientManager
from back.agents.chief_agent import ChiefAgent
import openai

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
    """Check AI system health (e.g., connection to OpenAI)."""
    # Check if OpenAI API key is configured
    is_configured = bool(os.getenv("OPENAI_API_KEY"))
    return {
        "status": "ok" if is_configured else "degraded",
        "details": "OpenAI API key is configured." if is_configured else "OpenAI API key not set.",
        "components": {
            "openai": "configured" if is_configured else "not_configured"
        }
    }

class AgentResponseRequest(BaseModel):
    session_id: str
    chat_id: int
    query: str
    message_history: List[Dict] # e.g. {"sender": "user", "text": "Hello"}

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
        # We need an OpenAI client instance. 
        # Assuming it's configured somewhere globally or we create it here.
        # For this example, let's assume it's available.
        # In a real app, this should be managed properly (e.g., dependency injection).
        llm_client = openai.AsyncOpenAI()

        chief_agent = ChiefAgent(llm_client=llm_client, telegram_manager=manager)
        
        # Prepare last_message for agents expecting it
        last_message = {
            "sender": "user",
            "text": request.query
        }

        initial_state = {
            "session_id": request.session_id,
            "chat_id": request.chat_id,
            "query": request.query,
            "message_history": request.message_history,
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
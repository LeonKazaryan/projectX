from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from back.globals import get_telegram_manager
from back.telegram.telegram_client import TelegramClientManager
import logging

chats_router = APIRouter()
logger = logging.getLogger("chathut.chats")

class Dialog(BaseModel):
    id: int
    name: str
    is_user: bool
    is_group: bool
    is_channel: bool
    can_send_messages: bool
    is_archived: bool
    unread_count: int
    last_message: dict

class DialogsResponse(BaseModel):
    success: bool
    dialogs: List[Dialog]
    error: Optional[str] = None

@chats_router.get("/dialogs", response_model=DialogsResponse)
async def get_dialogs(
    session_id: str = Query(..., description="ID сессии"),
    limit: int = Query(50, description="Количество диалогов"),
    include_archived: bool = Query(False, description="Включить архивированные чаты"),
    include_readonly: bool = Query(False, description="Включить каналы только для чтения"),
    include_groups: bool = Query(True, description="Включить групповые чаты"),
    manager = Depends(get_telegram_manager)
):
    """Получить список диалогов (чатов)"""
    logger.info(f"[get_dialogs] session_id={session_id} limit={limit} archived={include_archived} readonly={include_readonly} groups={include_groups}")
    try:
        result = await manager.get_dialogs(session_id, limit, include_archived, include_readonly, include_groups)
        logger.info(f"[get_dialogs] manager.get_dialogs result: {result}")
        if result["success"]:
            return DialogsResponse(
                success=True,
                dialogs=result["dialogs"]
            )
        else:
            logger.error(f"[get_dialogs] ERROR: {result.get('error')} (session_id={session_id})")
            raise HTTPException(status_code=400, detail=result["error"])
    except Exception as e:
        logger.exception(f"[get_dialogs] EXCEPTION: {e} (session_id={session_id})")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}") 
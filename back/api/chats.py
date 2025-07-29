from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from back.globals import get_telegram_manager
from back.telegram.telegram_client import TelegramClientManager
import logging
import time
import asyncio

chats_router = APIRouter()
logger = logging.getLogger("chathut.chats")

# Simple in-memory cache for dialogs (production should use Redis)
dialog_cache = {}
CACHE_TTL = 30  # 30 seconds cache

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
    cached: Optional[bool] = False
    load_time: Optional[float] = None

@chats_router.get("/dialogs", response_model=DialogsResponse)
async def get_dialogs(
    session_id: str = Query(..., description="ID сессии"),
    limit: int = Query(30, description="Количество диалогов (max 50)"),  # Default reduced to 30
    include_archived: bool = Query(False, description="Включить архивированные чаты"),
    include_readonly: bool = Query(False, description="Включить каналы только для чтения"),
    include_groups: bool = Query(True, description="Включить групповые чаты"),
    manager = Depends(get_telegram_manager)
):
    """Получить список диалогов (чатов) с кэшированием"""
    start_time = time.time()
    
    # Create cache key
    cache_key = f"{session_id}_{limit}_{include_archived}_{include_readonly}_{include_groups}"
    
    # Check cache first
    if cache_key in dialog_cache:
        cached_data, cache_time = dialog_cache[cache_key]
        if time.time() - cache_time < CACHE_TTL:
            load_time = time.time() - start_time
            logger.info(f"[get_dialogs] Cache hit for session {session_id[:20]}... (load_time: {load_time:.3f}s)")
            return DialogsResponse(
                success=True,
                dialogs=cached_data,
                cached=True,
                load_time=load_time
            )
    
    logger.info(f"[get_dialogs] session_id={session_id[:20]}... limit={limit} archived={include_archived} readonly={include_readonly} groups={include_groups}")
    
    try:
        # Limit maximum dialogs to prevent slow responses
        actual_limit = min(limit, 50)
        
        result = await manager.get_dialogs(session_id, actual_limit, include_archived, include_readonly, include_groups)
        load_time = time.time() - start_time
        
        logger.info(f"[get_dialogs] manager.get_dialogs result: success={result.get('success')}, dialogs_count={len(result.get('dialogs', []))}, load_time={load_time:.3f}s")
        
        if result["success"]:
            # Cache the result
            dialog_cache[cache_key] = (result["dialogs"], time.time())
            
            # Cleanup old cache entries (keep only last 100)
            if len(dialog_cache) > 100:
                oldest_key = min(dialog_cache.keys(), key=lambda k: dialog_cache[k][1])
                del dialog_cache[oldest_key]
            
            return DialogsResponse(
                success=True,
                dialogs=result["dialogs"],
                cached=False,
                load_time=load_time
            )
        else:
            logger.error(f"[get_dialogs] ERROR: {result.get('error')} (session_id={session_id[:20]}..., load_time={load_time:.3f}s)")
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        load_time = time.time() - start_time
        logger.exception(f"[get_dialogs] EXCEPTION: {e} (session_id={session_id[:20]}..., load_time={load_time:.3f}s)")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}") 
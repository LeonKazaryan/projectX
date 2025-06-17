from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from api.auth import get_telegram_manager

chats_router = APIRouter()

class Dialog(BaseModel):
    id: int
    name: str
    is_user: bool
    is_group: bool
    is_channel: bool
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
    manager = Depends(get_telegram_manager)
):
    """Получить список диалогов (чатов)"""
    result = await manager.get_dialogs(session_id, limit)
    
    if result["success"]:
        return DialogsResponse(
            success=True,
            dialogs=result["dialogs"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"]) 
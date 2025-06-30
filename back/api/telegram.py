from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from back.database.config import get_async_db
from back.models.database import (
    User, 
    create_or_update_telegram_connection_async,
    deactivate_telegram_connection_async
)
from back.api.auth import get_current_user
from pydantic import BaseModel
from back.globals import get_telegram_manager

router = APIRouter(prefix="/telegram", tags=["Telegram"])

class ConnectRequest(BaseModel):
    session_string: str

@router.post("/connect", status_code=status.HTTP_200_OK)
async def connect_telegram(
    request: ConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    manager = Depends(get_telegram_manager)
):
    session_id = f"user_{current_user.id}_temp_connect"
    
    result = await manager.restore_session(request.session_string, session_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail="Invalid session string")
    
    user_info = await manager.get_user_info(session_id)
    if not user_info["success"]:
        await manager.disconnect_client(session_id)
        raise HTTPException(status_code=500, detail="Could not get user info from Telegram")
    
    await manager.disconnect_client(session_id)

    connection_data = {
        "telegram_user_id": user_info["id"],
        "telegram_username": user_info["username"],
        "telegram_display_name": f"{user_info['first_name'] or ''} {user_info['last_name'] or ''}".strip(),
        "phone_number": user_info["phone"],
        "session_data": request.session_string, # Should be encrypted
        "is_active": True
    }

    await create_or_update_telegram_connection_async(
        db, 
        user_id=current_user.id,
        conn_data=connection_data
    )
    
    # Explicitly fetch user and update
    user_to_update = await db.get(User, current_user.id)
    if user_to_update:
        user_to_update.is_telegram_connected = True
        await db.commit()
    
    return {"message": "Telegram connected successfully"}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_telegram(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    success = await deactivate_telegram_connection_async(db, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="No active Telegram connection found")

    # Explicitly fetch user and update
    user_to_update = await db.get(User, current_user.id)
    if user_to_update:
        user_to_update.is_telegram_connected = False
        await db.commit()

    return {"message": "Telegram disconnected successfully"} 
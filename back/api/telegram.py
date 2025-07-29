from fastapi import APIRouter, Depends, HTTPException, status
from back.models.database import User
from back.api.auth import get_current_user
from pydantic import BaseModel
from back.globals import get_telegram_manager

router = APIRouter(tags=["Telegram"])

class ConnectRequest(BaseModel):
    session_string: str

@router.post("/connect", status_code=status.HTTP_200_OK)
async def connect_telegram(
    request: ConnectRequest,
    current_user: User = Depends(get_current_user),
    manager = Depends(get_telegram_manager)
):
    """Validate Telegram session string and mark user as connected"""
    session_id = f"user_{current_user.id}_temp_connect"
    
    # Validate session string
    result = await manager.restore_session(request.session_string, session_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail="Invalid session string")
    
    # Get user info to verify session is valid
    user_info = await manager.get_user_info(session_id)
    if not user_info["success"]:
        await manager.disconnect_client(session_id)
        raise HTTPException(status_code=500, detail="Could not get user info from Telegram")
    
    # Clean up temporary session
    await manager.disconnect_client(session_id)
    
    # Session is valid, return success
    # Note: We don't save to database anymore, session is stored locally in frontend
    return {
        "message": "Telegram connected successfully",
        "telegram_user_id": user_info["id"],
        "telegram_username": user_info["username"],
        "telegram_display_name": f"{user_info['first_name'] or ''} {user_info['last_name'] or ''}".strip(),
        "phone_number": user_info["phone"]
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_telegram(
    current_user: User = Depends(get_current_user)
):
    """Logout from Telegram (frontend handles session cleanup)"""
    return {"message": "Telegram disconnected successfully"}

@router.post("/restore-session", status_code=status.HTTP_200_OK)
async def restore_telegram_session(
    request: ConnectRequest,
    current_user: User = Depends(get_current_user),
    manager = Depends(get_telegram_manager)
):
    """Validate and restore Telegram session from frontend"""
    session_id = f"user_{current_user.id}_restore"
    
    # Validate session string
    result = await manager.restore_session(request.session_string, session_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail="Invalid session string")
    
    # Get user info to verify session is valid
    user_info = await manager.get_user_info(session_id)
    if not user_info["success"]:
        await manager.disconnect_client(session_id)
        raise HTTPException(status_code=500, detail="Could not get user info from Telegram")
    
    # Clean up temporary session
    await manager.disconnect_client(session_id)
    
    return {
        "message": "Telegram session restored successfully",
        "telegram_user_id": user_info["id"],
        "telegram_username": user_info["username"],
        "telegram_display_name": f"{user_info['first_name'] or ''} {user_info['last_name'] or ''}".strip(),
        "phone_number": user_info["phone"]
    } 
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
    
    # Validate and restore session
    result = await manager.restore_session(request.session_string, f"user_{current_user.id}_connect")
    if not result["success"]:
        raise HTTPException(status_code=400, detail="Invalid session string")
    
    # Get user info to verify session is valid
    user_info = await manager.get_user_info(request.session_string)  # Use session_string directly
    if not user_info["success"]:
        raise HTTPException(status_code=500, detail="Could not get user info from Telegram")
    
    # Don't clean up the session - keep it for API calls
    # Session is now stored under session_string for later use
    
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
    
    # Validate and restore session
    result = await manager.restore_session(request.session_string, f"user_{current_user.id}_restore")
    if not result["success"]:
        raise HTTPException(status_code=400, detail="Invalid session string")
    
    # Get user info to verify session is valid
    user_info = await manager.get_user_info(request.session_string)  # Use session_string directly
    if not user_info["success"]:
        raise HTTPException(status_code=500, detail="Could not get user info from Telegram")
    
    # Don't clean up the session - keep it for API calls
    # Session is now stored under session_string for later use
    
    return {
        "message": "Telegram session restored successfully",
        "telegram_user_id": user_info["id"],
        "telegram_username": user_info["username"],
        "telegram_display_name": f"{user_info['first_name'] or ''} {user_info['last_name'] or ''}".strip(),
        "phone_number": user_info["phone"]
    } 
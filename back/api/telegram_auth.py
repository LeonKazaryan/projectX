from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import uuid
from back.globals import get_telegram_manager
from back.telegram.telegram_client import TelegramClientManager
from back.globals import set_session_user_mapping
from back.auth.jwt_handler import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from back.models.database import User

# New router for Telegram authentication
telegram_auth_router = APIRouter(tags=["Telegram Authentication"])

security = HTTPBearer()

class PhoneRequest(BaseModel):
    phone: str

class RestoreSessionRequest(BaseModel):
    session_string: str

class CodeRequest(BaseModel):
    phone: str
    code: str
    phone_code_hash: str
    session_id: str

class PasswordRequest(BaseModel):
    password: str
    session_id: str

@telegram_auth_router.post("/send-code")
async def send_code(
    request: PhoneRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Initiates Telegram login by sending a code to the user's phone."""
    session_id = str(uuid.uuid4())
    try:
        result = await manager.authenticate_with_phone(request.phone, session_id)
        if result["success"]:
            return {
                "success": True, 
                "session_id": session_id, 
                "phone_code_hash": result["phone_code_hash"]
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to send code"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@telegram_auth_router.post("/verify-code")
async def verify_code(
    request: CodeRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Verifies the authentication code and logs the user in."""
    try:
        result = await manager.verify_phone_code(
            session_id=request.session_id,
            phone=request.phone,
            phone_code_hash=request.phone_code_hash,
            code=request.code
        )
        if result.get("success"):
            return {
                "success": True,
                "session_id": request.session_id,
                "session_string": result["session_string"],
            }
        elif result.get("need_password"):
             return {"success": False, "need_password": True}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Invalid code"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@telegram_auth_router.post("/verify-password")
async def verify_password(
    request: PasswordRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Verifies the 2FA password."""
    try:
        result = await manager.verify_2fa_password(
            session_id=request.session_id,
            password=request.password
        )
        if result["success"]:
            return {
                "success": True,
                "session_id": request.session_id,
                "session_string": result["session_string"],
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Invalid password"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@telegram_auth_router.post("/restore-session")
async def restore_session(
    request: RestoreSessionRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Restores a Telegram session from a session string."""
    
    # Get user info from JWT token
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Create user-specific session ID
    session_id = f"user_{user_id}_{str(uuid.uuid4())[:8]}"
    
    # Set up session mapping
    set_session_user_mapping(session_id, int(user_id))
    
    try:
        result = await manager.restore_session(request.session_string, session_id)
        if result["success"]:
            return {"success": True, "session_id": session_id}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to restore session"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}") 
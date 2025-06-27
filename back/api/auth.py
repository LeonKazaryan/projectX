from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
import uuid

from telegram.telegram_client import TelegramClientManager

auth_router = APIRouter()

# Pydantic models for request/response
class PhoneAuthRequest(BaseModel):
    phone: str

class CodeVerificationRequest(BaseModel):
    phone: str
    code: str
    phone_code_hash: str
    session_id: str

class PasswordAuthRequest(BaseModel):
    password: str
    session_id: str

class SessionRestoreRequest(BaseModel):
    session_string: str

class AuthResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    session_string: Optional[str] = None
    phone_code_hash: Optional[str] = None
    need_password: Optional[bool] = None
    message: Optional[str] = None
    error: Optional[str] = None

class UserInfoResponse(BaseModel):
    success: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    error: Optional[str] = None

# Dependency to get telegram manager
telegram_manager = None

def get_telegram_manager():
    global telegram_manager
    if not telegram_manager:
        telegram_manager = TelegramClientManager()
    return telegram_manager

@auth_router.post("/send-code", response_model=AuthResponse)
async def send_auth_code(
    request: PhoneAuthRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Отправить код аутентификации на номер телефона"""
    session_id = str(uuid.uuid4())
    
    result = await manager.authenticate_with_phone(request.phone, session_id)
    
    if result["success"]:
        return AuthResponse(
            success=True,
            session_id=session_id,
            phone_code_hash=result["phone_code_hash"],
            message=result["message"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"])

@auth_router.post("/verify-code", response_model=AuthResponse)
async def verify_auth_code(
    request: CodeVerificationRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Проверить код аутентификации"""
    result = await manager.verify_phone_code(
        request.phone, 
        request.code, 
        request.phone_code_hash, 
        request.session_id
    )
    
    if result["success"]:
        return AuthResponse(
            success=True,
            session_id=request.session_id,
            session_string=result["session_string"],
            message=result["message"]
        )
    elif result.get("need_password"):
        return AuthResponse(
            success=False,
            need_password=True,
            session_id=request.session_id,
            message=result["message"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"])

@auth_router.post("/verify-password", response_model=AuthResponse)
async def verify_2fa_password(
    request: PasswordAuthRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Проверить пароль двухфакторной аутентификации"""
    result = await manager.verify_2fa_password(request.password, request.session_id)
    
    if result["success"]:
        return AuthResponse(
            success=True,
            session_id=request.session_id,
            session_string=result["session_string"],
            message=result["message"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"])

@auth_router.post("/restore-session", response_model=AuthResponse)
async def restore_session(
    request: SessionRestoreRequest,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Восстановить сессию из строки"""
    session_id = str(uuid.uuid4())
    
    result = await manager.restore_session(request.session_string, session_id)
    
    if result["success"]:
        return AuthResponse(
            success=True,
            session_id=session_id,
            message=result["message"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"])

@auth_router.post("/logout")
async def logout(
    session_id: str,
    manager: TelegramClientManager = Depends(get_telegram_manager)
):
    """Выход из системы"""
    await manager.disconnect_client(session_id)
    return {"success": True, "message": "Сессия завершена"}



@auth_router.get("/user-info", response_model=UserInfoResponse)
async def get_user_info(session_id: str = Query(..., description="ID сессии")):
    """Получить информацию о текущем пользователе"""
    try:
        result = await telegram_manager.get_user_info(session_id)
        
        if result["success"]:
            return UserInfoResponse(
                success=True,
                user_id=result["user_info"].get("id"),
                username=result["user_info"].get("username"),
                first_name=result["user_info"].get("first_name"),
                last_name=result["user_info"].get("last_name"),
                phone=result["user_info"].get("phone")
            )
        else:
            return UserInfoResponse(success=False, error=result["error"])
    except Exception as e:
        return UserInfoResponse(success=False, error=str(e))

 
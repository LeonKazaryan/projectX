from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..database.config import get_db
from .auth import get_current_user
from ..models.database import User, PlatformSession
from sqlalchemy.orm import Session
import json

router = APIRouter(tags=["sessions"])

class SessionData(BaseModel):
    platform: str  # "telegram" or "whatsapp"
    session_string: str
    user_id: Optional[int] = None

class SessionResponse(BaseModel):
    success: bool
    session_string: Optional[str] = None
    message: str

@router.post("/save")
async def save_session(
    session_data: SessionData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить сессию Telegram или WhatsApp для пользователя"""
    try:
        user_id = current_user.id
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Проверяем, существует ли уже сессия для этого пользователя и платформы
        existing_session = db.query(PlatformSession).filter(
            PlatformSession.user_id == user_id,
            PlatformSession.platform == session_data.platform
        ).first()
        
        if existing_session:
            # Обновляем существующую сессию
            existing_session.session_string = session_data.session_string
        else:
            # Создаем новую сессию
            new_session = PlatformSession(
                user_id=user_id,
                platform=session_data.platform,
                session_string=session_data.session_string
            )
            db.add(new_session)
        
        db.commit()
        
        return SessionResponse(
            success=True,
            message=f"Session saved successfully for {session_data.platform}"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")

@router.get("/get/{platform}")
async def get_session(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить сохраненную сессию для пользователя"""
    try:
        user_id = current_user.id
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Получаем сессию из базы данных
        session = db.query(PlatformSession).filter(
            PlatformSession.user_id == user_id,
            PlatformSession.platform == platform
        ).first()
        
        if not session:
            return SessionResponse(
                success=False,
                message=f"No session found for {platform}"
            )
        
        return SessionResponse(
            success=True,
            session_string=session.session_string,
            message=f"Session retrieved successfully for {platform}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")

@router.delete("/delete/{platform}")
async def delete_session(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удалить сохраненную сессию для пользователя"""
    try:
        user_id = current_user.id
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Удаляем сессию из базы данных
        session = db.query(PlatformSession).filter(
            PlatformSession.user_id == user_id,
            PlatformSession.platform == platform
        ).first()
        
        if not session:
            return SessionResponse(
                success=False,
                message=f"No session found to delete for {platform}"
            )
        
        db.delete(session)
        db.commit()
        
        return SessionResponse(
            success=True,
            message=f"Session deleted successfully for {platform}"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@router.get("/list")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список всех сохраненных сессий пользователя"""
    try:
        user_id = current_user.id
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Получаем все сессии пользователя
        sessions = db.query(PlatformSession).filter(PlatformSession.user_id == user_id).all()
        
        return {
            "success": True,
            "sessions": [
                {
                    "platform": session.platform,
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "updated_at": session.updated_at.isoformat() if session.updated_at else None
                }
                for session in sessions
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}") 
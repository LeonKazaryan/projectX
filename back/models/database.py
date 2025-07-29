"""
SQLAlchemy Database Models 🤖
ChartHut Cyberpunk Data Layer
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text, 
    ForeignKey, BigInteger, Index, JSON, func
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session, selectinload
from sqlalchemy.sql import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


Base = declarative_base()


def generate_uuid():
    """Generate UUID for primary keys"""
    return str(uuid4())


class TimestampMixin:
    """Mixin for timestamp columns"""
    created_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class User(Base, TimestampMixin):
    """User model for authentication and profile management"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)  # UUID as string for SQLite
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(Text, nullable=True)
    language_preference = Column(String(10), default="en", nullable=False)
    theme_preference = Column(String(20), default="cyberpunk", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_telegram_connected = Column(Boolean, default=False, nullable=False)
    is_whatsapp_connected = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    # sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")  # Disabled for now
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": str(self.id),
            "username": self.username,
            "email": self.email,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "language_preference": self.language_preference,
            "theme_preference": self.theme_preference,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }











class PlatformSession(Base, TimestampMixin):
    """Platform sessions for Telegram and WhatsApp"""
    __tablename__ = "platform_sessions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(20), nullable=False)  # "telegram" or "whatsapp"
    session_string = Column(Text, nullable=False)
    
    # Relationships
    user = relationship("User")
    
    # Unique constraint for user-platform pair
    __table_args__ = (
        Index('ix_platform_session_unique', 'user_id', 'platform', unique=True),
    )
    
    def __repr__(self):
        return f"<PlatformSession(id={self.id}, user_id={self.user_id}, platform={self.platform})>"


# Database utility functions


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username.lower()).first()


def get_user_by_id(db: Session, user_id: UUID) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email_or_username(db: Session, email_or_username: str) -> Optional[User]:
    """Get user by email or username"""
    if "@" in email_or_username:
        return get_user_by_email(db, email_or_username)
    else:
        return get_user_by_username(db, email_or_username)


def create_user(db: Session, user_data: dict) -> User:
    """Create a new user"""
    user = User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


def update_user_last_login(db: Session, user_id: UUID):
    """Update user's last login timestamp"""
    db.query(User).filter(User.id == user_id).update({
        "last_login": datetime.now(timezone.utc)
    })
    db.commit()








# ==============================================================================
# ASYNC DATABASE UTILITY FUNCTIONS
# ==============================================================================
async def get_user_by_email_async(db, email: str) -> Optional[User]:
    """Fetch a user by email asynchronously."""
    return db.query(User).filter(User.email == email).first()


async def get_user_by_username_async(db, username: str) -> Optional[User]:
    """Fetch a user by username asynchronously."""
    return db.query(User).filter(User.username == username).first()


async def get_user_by_id_async(db, user_id: str) -> Optional[User]:
    """Get user by ID asynchronously"""
    return db.query(User).filter(User.id == user_id).first()


async def get_user_by_email_or_username_async(db, email_or_username: str) -> Optional[User]:
    """Get user by email or username asynchronously"""
    if "@" in email_or_username:
        return await get_user_by_email_async(db, email_or_username)
    else:
        return await get_user_by_username_async(db, email_or_username)


async def create_user_async(db, user_data: dict) -> User:
    """Create a new user (async)"""
    user = User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


async def update_user_last_login_async(db, user_id: UUID):
    """Update user's last login timestamp (async)"""
    db.query(User).filter(User.id == user_id).update({
        "last_login": datetime.now(timezone.utc)
    })
    db.commit()








 
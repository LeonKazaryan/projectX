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
from sqlalchemy.dialects.postgresql import UUID as PGUUID, INET, JSONB
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
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
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
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    telegram_connections = relationship("TelegramConnection", back_populates="user", cascade="all, delete-orphan")
    
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


class UserSession(Base, TimestampMixin):
    """User session management for JWT tokens"""
    __tablename__ = "user_sessions"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash = Column(String(255), nullable=False)
    device_info = Column(JSONB, nullable=True)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"
    
    def is_expired(self):
        """Check if session is expired"""
        return datetime.now(timezone.utc) > self.expires_at


class UserPreferences(Base, TimestampMixin):
    """User AI and app preferences"""
    __tablename__ = "user_preferences"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    ai_enabled = Column(Boolean, default=True, nullable=False)
    auto_suggest = Column(Boolean, default=False, nullable=False)
    continuous_suggestions = Column(Boolean, default=False, nullable=False)
    proactive_suggestions = Column(Boolean, default=True, nullable=False)
    suggestion_delay = Column(Integer, default=2, nullable=False)
    memory_limit = Column(Integer, default=20, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="preferences")
    
    def __repr__(self):
        return f"<UserPreferences(id={self.id}, user_id={self.user_id}, ai_enabled={self.ai_enabled})>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "ai_enabled": self.ai_enabled,
            "auto_suggest": self.auto_suggest,
            "continuous_suggestions": self.continuous_suggestions,
            "proactive_suggestions": self.proactive_suggestions,
            "suggestion_delay": self.suggestion_delay,
            "memory_limit": self.memory_limit,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class TelegramConnection(Base, TimestampMixin):
    """Telegram account connections for users"""
    __tablename__ = "telegram_connections"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    telegram_user_id = Column(BigInteger, nullable=False)
    telegram_username = Column(String(100), nullable=True)
    telegram_display_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    session_data = Column(Text, nullable=True)  # Encrypted telegram session
    is_active = Column(Boolean, default=True, nullable=False)
    connected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="telegram_connections")
    
    # Unique constraint for user-telegram pair
    __table_args__ = (
        Index('ix_telegram_user_unique', 'user_id', 'telegram_user_id', unique=True),
    )
    
    def __repr__(self):
        return f"<TelegramConnection(id={self.id}, user_id={self.user_id}, telegram_user_id={self.telegram_user_id})>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": str(self.id),
            "telegram_user_id": self.telegram_user_id,
            "telegram_username": self.telegram_username,
            "telegram_display_name": self.telegram_display_name,
            "phone_number": self.phone_number,
            "is_active": self.is_active,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None
        }


# Database utility functions
def create_default_user_preferences(db: Session, user_id: UUID):
    """Create default preferences for a new user"""
    preferences = UserPreferences(
        user_id=user_id,
        ai_enabled=True,
        auto_suggest=False,
        continuous_suggestions=False,
        proactive_suggestions=True,
        suggestion_delay=2,
        memory_limit=20
    )
    db.add(preferences)
    db.commit()
    return preferences


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
    
    # Create default preferences
    create_default_user_preferences(db, user.id)
    
    return user


def update_user_last_login(db: Session, user_id: UUID):
    """Update user's last login timestamp"""
    db.query(User).filter(User.id == user_id).update({
        "last_login": datetime.now(timezone.utc)
    })
    db.commit()


def get_active_user_session(db: Session, user_id: UUID, refresh_token_hash: str) -> Optional[UserSession]:
    """Get active user session by refresh token"""
    return db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.refresh_token_hash == refresh_token_hash,
        UserSession.is_active == True,
        UserSession.expires_at > datetime.now(timezone.utc)
    ).first()


def create_user_session(db: Session, session_data: dict) -> UserSession:
    """Create a new user session"""
    session = UserSession(**session_data)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def deactivate_user_session(db: Session, session_id: UUID):
    """Deactivate a user session"""
    db.query(UserSession).filter(UserSession.id == session_id).update({
        "is_active": False
    })
    db.commit()


def cleanup_expired_sessions(db: Session):
    """Clean up expired sessions"""
    expired_count = db.query(UserSession).filter(
        UserSession.expires_at < datetime.now(timezone.utc)
    ).update({"is_active": False})
    db.commit()
    return expired_count


def get_user_preferences(db: Session, user_id: UUID) -> Optional[UserPreferences]:
    """Get user preferences"""
    return db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()


def update_user_preferences(db: Session, user_id: UUID, preferences_data: dict) -> Optional[UserPreferences]:
    """Update user preferences"""
    preferences = get_user_preferences(db, user_id)
    if preferences:
        for key, value in preferences_data.items():
            if hasattr(preferences, key) and value is not None:
                setattr(preferences, key, value)
        db.commit()
        db.refresh(preferences)
    return preferences


# ==============================================================================
# ASYNC DATABASE UTILITY FUNCTIONS
# ==============================================================================
async def get_user_by_email_async(db: AsyncSession, email: str) -> Optional[User]:
    """Fetch a user by email asynchronously with related data."""
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.sessions),
            selectinload(User.preferences),
            selectinload(User.telegram_connections),
        )
        .filter(User.email == email)
    )
    return result.scalars().first()


async def get_user_by_username_async(db: AsyncSession, username: str) -> Optional[User]:
    """Fetch a user by username asynchronously with related data."""
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.sessions),
            selectinload(User.preferences),
            selectinload(User.telegram_connections),
        )
        .filter(User.username == username)
    )
    return result.scalars().first()


async def get_user_by_id_async(db: AsyncSession, user_id: UUID) -> Optional[User]:
    """Get user by ID asynchronously"""
    result = await db.execute(
        select(User).options(selectinload(User.telegram_connections)).filter(User.id == user_id)
    )
    return result.scalars().first()


async def get_user_by_email_or_username_async(db: AsyncSession, email_or_username: str) -> Optional[User]:
    """Get user by email or username asynchronously"""
    if "@" in email_or_username:
        return await get_user_by_email_async(db, email_or_username)
    else:
        return await get_user_by_username_async(db, email_or_username)


async def create_user_async(db: AsyncSession, user_data: dict) -> User:
    """Create a new user (async)"""
    user = User(**user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Create default preferences
    await create_default_user_preferences_async(db, user.id)
    
    return user


async def create_default_user_preferences_async(db: AsyncSession, user_id: UUID):
    """Create default preferences for a new user (async)"""
    preferences = UserPreferences(user_id=user_id)
    db.add(preferences)
    await db.commit()
    return preferences


async def update_user_last_login_async(db: AsyncSession, user_id: UUID):
    """Update user's last login timestamp (async)"""
    stmt = text("UPDATE users SET last_login = :last_login WHERE id = :user_id")
    await db.execute(stmt, {"last_login": datetime.now(timezone.utc), "user_id": user_id})
    await db.commit()


async def get_active_user_session_async(db: AsyncSession, user_id: UUID, refresh_token_hash: str) -> Optional[UserSession]:
    """Get active user session by refresh token (async)"""
    result = await db.execute(
        select(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.refresh_token_hash == refresh_token_hash,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        )
    )
    return result.scalars().first()


async def create_user_session_async(db: AsyncSession, session_data: dict) -> UserSession:
    """Create a new user session (async)"""
    session = UserSession(**session_data)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def deactivate_user_session_async(db: AsyncSession, session_id: UUID):
    """Deactivate a user session (async)"""
    stmt = text("UPDATE user_sessions SET is_active = :is_active WHERE id = :session_id")
    await db.execute(stmt, {"is_active": False, "session_id": session_id})
    await db.commit()


async def cleanup_expired_sessions_async(db: AsyncSession):
    """Clean up expired sessions (async)"""
    stmt = text("UPDATE user_sessions SET is_active = False WHERE expires_at < :now")
    result = await db.execute(stmt, {"now": datetime.now(timezone.utc)})
    await db.commit()
    return result.rowcount


async def get_user_preferences_async(db: AsyncSession, user_id: UUID) -> Optional[UserPreferences]:
    """Get user preferences (async)"""
    result = await db.execute(select(UserPreferences).filter(UserPreferences.user_id == user_id))
    return result.scalars().first()


async def update_user_preferences_async(db: AsyncSession, user_id: UUID, preferences_data: dict) -> Optional[UserPreferences]:
    """Update user preferences asynchronously"""
    result = await db.execute(
        select(UserPreferences).filter(UserPreferences.user_id == user_id)
    )
    preferences = result.scalars().first()
    if preferences:
        for key, value in preferences_data.items():
            setattr(preferences, key, value)
        await db.commit()
        await db.refresh(preferences)
    return preferences


async def get_telegram_connection_by_user_id_async(db: AsyncSession, user_id: UUID) -> Optional[TelegramConnection]:
    """Get active Telegram connection by user ID asynchronously"""
    result = await db.execute(
        select(TelegramConnection).filter(
            TelegramConnection.user_id == user_id,
            TelegramConnection.is_active == True
        )
    )
    return result.scalars().first()


async def create_or_update_telegram_connection_async(db: AsyncSession, user_id: UUID, conn_data: dict) -> TelegramConnection:
    """Create or update a telegram connection asynchronously"""
    result = await db.execute(
        select(TelegramConnection).filter(
            TelegramConnection.user_id == user_id,
            TelegramConnection.telegram_user_id == conn_data["telegram_user_id"]
        )
    )
    connection = result.scalars().first()

    if connection:
        # Update existing connection
        for key, value in conn_data.items():
            setattr(connection, key, value)
        connection.is_active = True
    else:
        # Create new connection
        connection = TelegramConnection(user_id=user_id, **conn_data)
        db.add(connection)
    
    await db.commit()
    await db.refresh(connection)
    return connection


async def deactivate_telegram_connection_async(db: AsyncSession, user_id: UUID) -> bool:
    """Deactivate a user's active telegram connection asynchronously"""
    result = await db.execute(
        select(TelegramConnection).filter(
            TelegramConnection.user_id == user_id,
            TelegramConnection.is_active == True
        )
    )
    connection = result.scalars().first()

    if connection:
        connection.is_active = False
        await db.commit()
        return True
    return False 
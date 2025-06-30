"""
Cyberpunk Authentication Models 🤖
ChartHut User Management System
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
from pydantic import BaseModel, EmailStr, Field, validator, constr
from enum import Enum


class LanguageCode(str, Enum):
    """Supported language codes for i18n"""
    EN = "en"
    RU = "ru"
    ES = "es"
    FR = "fr"
    DE = "de"
    JA = "ja"
    KO = "ko"
    ZH = "zh"


class ThemePreference(str, Enum):
    """UI Theme preferences"""
    CYBERPUNK = "cyberpunk"
    DARK = "dark"
    LIGHT = "light"
    NEON = "neon"
    MATRIX = "matrix"


# Base User Models
class UserBase(BaseModel):
    """Base user model with common fields"""
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    display_name: Optional[str] = Field(None, max_length=100)
    language_preference: LanguageCode = LanguageCode.EN
    theme_preference: ThemePreference = ThemePreference.CYBERPUNK
    
    @validator('username')
    def validate_username(cls, v):
        if v.lower() in ['admin', 'root', 'system', 'chathut']:
            raise ValueError('Username not allowed')
        return v.lower()


class UserCreate(UserBase):
    """User creation model"""
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    """User update model"""
    display_name: Optional[str] = Field(None, max_length=100)
    language_preference: Optional[LanguageCode] = None
    theme_preference: Optional[ThemePreference] = None
    avatar_url: Optional[str] = None


class UserLogin(BaseModel):
    """User login model"""
    email_or_username: str
    password: str
    remember_me: bool = False


class UserResponse(BaseModel):
    """User response model (no sensitive data)"""
    id: UUID
    username: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(UserResponse):
    """Extended user profile with additional data"""
    telegram_connected: bool = False
    ai_preferences: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


# Authentication Models
class Token(BaseModel):
    """JWT Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenData(BaseModel):
    """JWT Token payload data"""
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    email: Optional[str] = None
    exp: Optional[int] = None


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


# User Session Models
class DeviceInfo(BaseModel):
    """Device information for session tracking"""
    browser: Optional[str] = None
    os: Optional[str] = None
    device_type: Optional[str] = None
    screen_resolution: Optional[str] = None


class UserSessionCreate(BaseModel):
    """Create user session"""
    user_id: UUID
    refresh_token_hash: str
    device_info: Optional[DeviceInfo] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: datetime


class UserSessionResponse(BaseModel):
    """User session response"""
    id: UUID
    device_info: Optional[DeviceInfo] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool
    
    class Config:
        from_attributes = True


# User Preferences Models
class AIPreferences(BaseModel):
    """AI-related user preferences"""
    ai_enabled: bool = True
    auto_suggest: bool = False
    continuous_suggestions: bool = False
    proactive_suggestions: bool = True
    suggestion_delay: int = Field(2, ge=0, le=10)
    memory_limit: int = Field(20, ge=5, le=100)


class UserPreferencesUpdate(BaseModel):
    """Update user preferences"""
    ai_enabled: Optional[bool] = None
    auto_suggest: Optional[bool] = None
    continuous_suggestions: Optional[bool] = None
    proactive_suggestions: Optional[bool] = None
    suggestion_delay: Optional[int] = Field(None, ge=0, le=10)
    memory_limit: Optional[int] = Field(None, ge=5, le=100)


class UserPreferencesResponse(AIPreferences):
    """User preferences response"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Telegram Connection Models
class TelegramConnectionCreate(BaseModel):
    """Create Telegram connection"""
    telegram_user_id: int
    telegram_username: Optional[str] = None
    telegram_display_name: Optional[str] = None
    phone_number: Optional[str] = None
    session_data: str  # Encrypted


class TelegramConnectionResponse(BaseModel):
    """Telegram connection response"""
    id: UUID
    telegram_user_id: int
    telegram_username: Optional[str] = None
    telegram_display_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    connected_at: datetime
    last_sync: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Error Models
class AuthError(BaseModel):
    """Authentication error response"""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ValidationError(BaseModel):
    """Validation error response"""
    field: str
    message: str
    type: str


# API Response Models
class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: list
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool


# Email verification
class EmailVerificationRequest(BaseModel):
    """Email verification request"""
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    """Confirm email verification"""
    token: str


class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class ConnectedAccount(BaseModel):
    provider: str
    username: Optional[str] = None
    connected_at: Optional[datetime] = None
    is_active: bool
    phone_number: Optional[str] = None


class ProfileResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    created_at: datetime
    connected_accounts: List[ConnectedAccount]

    class Config:
        from_attributes = True 
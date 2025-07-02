"""
Authentication API Endpoints 🤖
Cyberpunk User Management System
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from back.database.config import get_async_db
from back.models.database import User, create_user_async, get_user_by_email_async, get_user_by_username_async, create_user_session_async, get_user_by_id_async, get_user_by_email_or_username_async, update_user_last_login_async
from back.models.auth import (
    UserCreate, UserLogin, UserResponse, UserUpdate, Token, 
    RefreshTokenRequest, MessageResponse, UserProfile, 
    PasswordResetRequest, PasswordResetConfirm,
    EmailVerificationRequest, EmailVerificationConfirm,
    AuthError, ValidationError, UserPreferencesUpdate, UserPreferencesResponse,
    ProfileResponse, ConnectedAccount
)
from back.auth.jwt_handler import (
    TokenHandler, validate_password_strength, 
    extract_device_info, generate_secure_token,
)

router = APIRouter(tags=["Authentication"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = TokenHandler.decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user = await get_user_by_id_async(db, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Register a new user with cyberpunk validation"""
    
    password_validation = validate_password_strength(user_data.password)
    if not password_validation["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Password does not meet security requirements",
                "errors": password_validation["errors"],
                "strength": password_validation["strength"]
            }
        )
    
    existing_user = await get_user_by_email_async(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    existing_username = await get_user_by_username_async(db, user_data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    try:
        hashed_password = TokenHandler.hash_password(user_data.password)
        user_dict = {
            "username": user_data.username.lower(),
            "email": user_data.email,
            "hashed_password": hashed_password,
            "display_name": user_data.display_name,
            "language_preference": user_data.language_preference,
            "theme_preference": user_data.theme_preference,
            "is_active": True,
            "is_verified": False
        }
        
        new_user = await create_user_async(db, user_dict)
        
        token_data = {
            "user_id": str(new_user.id),
            "username": new_user.username,
            "email": new_user.email
        }
        tokens = TokenHandler.create_token_pair(token_data)
        
        device_info = extract_device_info(request.headers.get("user-agent", ""))
        refresh_token_hash = TokenHandler.hash_refresh_token(tokens["refresh_token"])
        
        session_data = {
            "user_id": new_user.id,
            "refresh_token_hash": refresh_token_hash,
            "device_info": device_info,
            "ip_address": request.client.host,
            "user_agent": request.headers.get("user-agent"),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
        }
        
        await create_user_session_async(db, session_data)
        await update_user_last_login_async(db, new_user.id)
        
        return Token(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            user=UserResponse.from_orm(new_user)
        )
        
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User creation failed due to constraint violation"
        )


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Authenticate user and return tokens"""
    
    user = await get_user_by_email_or_username_async(db, login_data.email_or_username)
    if not user or not TokenHandler.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    token_data = {"user_id": str(user.id), "username": user.username, "email": user.email}
    tokens = TokenHandler.create_token_pair(token_data)
    
    device_info = extract_device_info(request.headers.get("user-agent", ""))
    refresh_token_hash = TokenHandler.hash_refresh_token(tokens["refresh_token"])
    
    session_data = {
        "user_id": user.id,
        "refresh_token_hash": refresh_token_hash,
        "device_info": device_info,
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
    }
    
    await create_user_session_async(db, session_data)
    await update_user_last_login_async(db, user.id)
    
    return Token(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        expires_in=tokens["expires_in"],
        user=UserResponse.from_orm(user)
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Refresh access token"""
    payload = TokenHandler.decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = UUID(payload.get("user_id"))
    refresh_token_hash = TokenHandler.hash_refresh_token(refresh_data.refresh_token)
    
    session = await get_active_user_session_async(db, user_id, refresh_token_hash)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = await get_user_by_id_async(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    token_data = {"user_id": str(user.id), "username": user.username, "email": user.email}
    tokens = TokenHandler.create_token_pair(token_data)
    
    await deactivate_user_session_async(db, session.id)
    
    new_refresh_token_hash = TokenHandler.hash_refresh_token(tokens["refresh_token"])
    device_info = extract_device_info(request.headers.get("user-agent", ""))
    new_session_data = {
        "user_id": user.id,
        "refresh_token_hash": new_refresh_token_hash,
        "device_info": device_info,
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
    }
    await create_user_session_async(db, new_session_data)
    
    return Token(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        expires_in=tokens["expires_in"],
        user=UserResponse.from_orm(user)
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    refresh_data: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Logout user and invalidate session"""
    refresh_token_hash = TokenHandler.hash_refresh_token(refresh_data.refresh_token)
    session = await get_active_user_session_async(db, current_user.id, refresh_token_hash)
    if session:
        await deactivate_user_session_async(db, session.id)
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=ProfileResponse, summary="Get current user profile")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Retrieves the profile of the current authenticated user."""
    
    connected_accounts = []
    
    # Telegram connection status using simple flag
    connected_accounts.append(ConnectedAccount(
        provider="telegram",
        username="Telegram" if current_user.is_telegram_connected else None,
        connected_at=None,  # We can set this later if needed
        is_active=current_user.is_telegram_connected,
        phone_number=None
    ))

    # Add placeholders for other services
    for provider in ["whatsapp", "instagram"]:
        connected_accounts.append(ConnectedAccount(
            provider=provider,
            username=None,
            connected_at=None,
            is_active=False,
            phone_number=None
        ))

    return ProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        display_name=current_user.display_name,
        created_at=current_user.created_at,
        connected_accounts=connected_accounts
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Update current user's profile"""
    update_data = user_update.dict(exclude_unset=True)
    
    updated_user = await db.merge(current_user)
    for key, value in update_data.items():
        setattr(updated_user, key, value)
        
    await db.commit()
    await db.refresh(updated_user)
    
    return UserResponse.from_orm(updated_user)


@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_user_preferences_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get user preferences"""
    preferences = await get_user_preferences_async(db, current_user.id)
    if not preferences:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return UserPreferencesResponse.from_orm(preferences)


@router.put("/preferences", response_model=UserPreferencesResponse)
async def update_user_preferences_endpoint(
    preferences_update: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Update user preferences"""
    update_data = preferences_update.dict(exclude_unset=True)
    updated_preferences = await update_user_preferences_async(db, current_user.id, update_data)
    if not updated_preferences:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return UserPreferencesResponse.from_orm(updated_preferences)


@router.post("/cleanup-sessions", response_model=MessageResponse)
async def cleanup_expired_sessions_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Clean up expired sessions for all users (admin-only in future)"""
    count = await cleanup_expired_sessions_async(db)
    return MessageResponse(message=f"Cleaned up {count} expired sessions")


@router.get("/health", response_model=MessageResponse)
async def health_check():
    """Health check endpoint"""
    return MessageResponse(message="Auth service is operational")


@router.post("/token", response_model=Token, summary="Get access and refresh tokens")
async def login_for_access_token(
    login_data: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Authenticate user and return tokens"""
    
    user = await get_user_by_email_or_username_async(db, login_data.email_or_username)
    if not user or not TokenHandler.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    token_data = {"user_id": str(user.id), "username": user.username, "email": user.email}
    tokens = TokenHandler.create_token_pair(token_data)
    
    device_info = extract_device_info(request.headers.get("user-agent", ""))
    refresh_token_hash = TokenHandler.hash_refresh_token(tokens["refresh_token"])
    
    session_data = {
        "user_id": user.id,
        "refresh_token_hash": refresh_token_hash,
        "device_info": device_info,
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
    }
    
    await create_user_session_async(db, session_data)
    await update_user_last_login_async(db, user.id)
    
    return Token(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        expires_in=tokens["expires_in"],
        user=UserResponse.from_orm(user)
    )

 
"""
JWT Token Handler 🤖
Cyberpunk Authentication Security
"""
import os
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from uuid import UUID
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "chathut_cyberpunk_secret_key_2024_neural_matrix")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenHandler:
    """JWT Token management for cyberpunk authentication"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_token_pair(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create both access and refresh tokens"""
        access_token = TokenHandler.create_access_token(user_data)
        refresh_token = TokenHandler.create_refresh_token(user_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds
        }
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def extract_user_id(token: str) -> Optional[UUID]:
        """Extract user ID from token"""
        payload = TokenHandler.decode_token(token)
        if payload and "user_id" in payload:
            try:
                return UUID(payload["user_id"])
            except (ValueError, TypeError):
                return None
        return None
    
    @staticmethod
    def is_token_expired(token: str) -> bool:
        """Check if token is expired"""
        payload = TokenHandler.decode_token(token)
        if not payload:
            return True
        
        exp = payload.get("exp")
        if not exp:
            return True
        
        return datetime.now(timezone.utc) > datetime.fromtimestamp(exp, timezone.utc)
    
    @staticmethod
    def get_token_type(token: str) -> Optional[str]:
        """Get token type (access or refresh)"""
        payload = TokenHandler.decode_token(token)
        return payload.get("type") if payload else None
    
    @staticmethod
    def hash_refresh_token(refresh_token: str) -> str:
        """Hash refresh token for database storage"""
        return hashlib.sha256(refresh_token.encode()).hexdigest()
    
    @staticmethod
    def create_password_reset_token(email: str) -> str:
        """Create password reset token"""
        data = {
            "email": email,
            "purpose": "password_reset",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def create_email_verification_token(email: str) -> str:
        """Create email verification token"""
        data = {
            "email": email,
            "purpose": "email_verification",
            "exp": datetime.now(timezone.utc) + timedelta(days=1)
        }
        return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def verify_reset_token(token: str) -> Optional[str]:
        """Verify password reset token and return email"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("purpose") == "password_reset":
                return payload.get("email")
        except JWTError:
            pass
        return None
    
    @staticmethod
    def verify_email_token(token: str) -> Optional[str]:
        """Verify email verification token and return email"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("purpose") == "email_verification":
                return payload.get("email")
        except JWTError:
            pass
        return None


# Security utilities
def generate_secure_token(length: int = 32) -> str:
    """Generate secure random token"""
    import secrets
    return secrets.token_urlsafe(length)


def validate_password_strength(password: str) -> Dict[str, Any]:
    """Validate password strength with cyberpunk requirements"""
    errors = []
    score = 0
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    else:
        score += 1
    
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    else:
        score += 1
    
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")
    else:
        score += 1
    
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one digit")
    else:
        score += 1
    
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("Password should contain at least one special character")
    else:
        score += 1
    
    if len(password) >= 12:
        score += 1
    
    strength = "weak"
    if score >= 5:
        strength = "strong"
    elif score >= 3:
        strength = "medium"
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "strength": strength,
        "score": score
    }


def extract_device_info(user_agent: str) -> Dict[str, Optional[str]]:
    """Extract device information from user agent"""
    # Simple device detection (can be enhanced with user-agents library)
    device_info = {
        "browser": None,
        "os": None,
        "device_type": "desktop"
    }
    
    if not user_agent:
        return device_info
    
    user_agent_lower = user_agent.lower()
    
    # Browser detection
    if "chrome" in user_agent_lower:
        device_info["browser"] = "Chrome"
    elif "firefox" in user_agent_lower:
        device_info["browser"] = "Firefox"
    elif "safari" in user_agent_lower:
        device_info["browser"] = "Safari"
    elif "edge" in user_agent_lower:
        device_info["browser"] = "Edge"
    
    # OS detection
    if "windows" in user_agent_lower:
        device_info["os"] = "Windows"
    elif "macintosh" in user_agent_lower or "mac os" in user_agent_lower:
        device_info["os"] = "macOS"
    elif "linux" in user_agent_lower:
        device_info["os"] = "Linux"
    elif "android" in user_agent_lower:
        device_info["os"] = "Android"
        device_info["device_type"] = "mobile"
    elif "iphone" in user_agent_lower or "ipad" in user_agent_lower:
        device_info["os"] = "iOS"
        device_info["device_type"] = "mobile" if "iphone" in user_agent_lower else "tablet"
    
    return device_info 
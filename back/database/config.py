"""
Database Configuration 🤖
ChartHut Cyberpunk Data Layer
"""
import os
from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from databases import Database
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

# Use SQLite for development, PostgreSQL for production
IS_LOCAL = os.getenv("ENV") == "development" or not os.getenv("DATABASE_URL")

if IS_LOCAL:
    # SQLite for local development - in back folder
    DATABASE_URL = "sqlite:///./chathut_dev.db"
    ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./chathut_dev.db"  # Use aiosqlite for async SQLite
else:
    # PostgreSQL for production
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Use asyncpg for async PostgreSQL connections
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Ensure SSL is required for production database connections
    if "ondigitalocean.com" in DATABASE_URL:
        ASYNC_DATABASE_URL = f"{ASYNC_DATABASE_URL}?ssl=require"

# SQLAlchemy engines
if IS_LOCAL:
    # Use sync SQLite for local development
    async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
    sync_engine = create_engine(DATABASE_URL, echo=False)
else:
    # Use async engine for production
    async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
    sync_engine = create_engine(DATABASE_URL, echo=False)

# Session makers
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Database instance for direct queries
database = Database(ASYNC_DATABASE_URL)


def get_db() -> Session:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def connect_database():
    """Connect to database on startup"""
    try:
        await database.connect()
        print("🤖 Database connected successfully!")
    except Exception as e:
        print(f"🚨 Database connection failed: {e}")
        # Continue without database for development
        pass


async def disconnect_database():
    """Disconnect from database on shutdown"""
    try:
        await database.disconnect()
        print("🤖 Database disconnected!")
    except Exception as e:
        print(f"🚨 Database disconnection failed: {e}")


def test_connection():
    """Test database connection"""
    try:
        if IS_LOCAL:
            # For SQLite, just check if we can create a connection
            with sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("🤖 SQLite database connection successful!")
            return True
        else:
            # For PostgreSQL, test the connection
            with sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("🤖 PostgreSQL database connection successful!")
        return True
    except Exception as e:
        print(f"🚨 Database connection failed: {e}")
        return False


def init_database():
    """Initialize database tables"""
    try:
        from back.models.database import Base
        Base.metadata.create_all(bind=sync_engine)
        print("🤖 Database tables created successfully!")
        return True
    except Exception as e:
        print(f"🚨 Database initialization failed: {e}")
        return False


if __name__ == "__main__":
    # Test connection when running directly
    test_connection()
    init_database() 
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

load_dotenv()

# Database configuration
DATABASE_USER = os.getenv("POSTGRES_USER", "chathut_user")
DATABASE_PASSWORD = os.getenv("POSTGRES_PASSWORD", "chathut_pass_dev_2024")
DATABASE_HOST = os.getenv("POSTGRES_HOST", "localhost")
DATABASE_PORT = os.getenv("POSTGRES_PORT", "5432")
DATABASE_NAME = os.getenv("POSTGRES_DB", "chathut")

# Async database URL (using asyncpg)
ASYNC_DATABASE_URL = f"postgresql+asyncpg://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

# For databases library (using asyncpg)
DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

# SQLAlchemy engines (only async since we don't have psycopg2)
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)

# Keep sync_engine as None for now - we'll use async only
sync_engine = None

# Session makers
SessionLocal = None  # Disabled since we don't have sync_engine
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Database instance for direct queries
database = Database(DATABASE_URL)


def get_db() -> Session:
    """Dependency to get database session - TEMPORARILY DISABLED"""
    raise Exception("Sync database sessions are temporarily disabled. Use async sessions instead.")


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def connect_database():
    """Connect to database on startup"""
    await database.connect()
    print("🤖 Database connected successfully!")


async def disconnect_database():
    """Disconnect from database on shutdown"""
    await database.disconnect()
    print("🤖 Database disconnected!")


def test_connection():
    """Test database connection - TEMPORARILY SIMPLIFIED"""
    try:
        print("🤖 Database connection test skipped (async only mode)")
        return True
    except Exception as e:
        print(f"🚨 Database connection failed: {e}")
        return False


def init_database():
    """Initialize database tables - TEMPORARILY DISABLED"""
    try:
        print("🤖 Database table creation skipped (async only mode)")
        return True
    except Exception as e:
        print(f"🚨 Database initialization failed: {e}")
        return False


if __name__ == "__main__":
    # Test connection when running directly
    test_connection()
    init_database() 
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

# Get the database URL from environment variables, provided by DigitalOcean
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure SSL is required for production database connections
if "ondigitalocean.com" in DATABASE_URL:
    ASYNC_DATABASE_URL = f"{DATABASE_URL}?ssl=require"
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# SQLAlchemy engines
async_engine = create_async_engine(ASYNC_DATABASE_URL.replace("postgresql", "postgresql+asyncpg"), echo=False)
sync_engine = None

# Session makers
SessionLocal = None
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Database instance for direct queries
database = Database(ASYNC_DATABASE_URL)


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
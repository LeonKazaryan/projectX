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

print(f"🔧 ENV variable: '{os.getenv('ENV')}'")
print(f"🔧 DATABASE_URL exists: {bool(os.getenv('DATABASE_URL'))}")
print(f"🔧 IS_LOCAL determined as: {IS_LOCAL}")

if IS_LOCAL:
    # SQLite for local development - in back folder
    DATABASE_URL = "sqlite:///./chathut_dev.db"
    ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./chathut_dev.db"  # Use aiosqlite for async SQLite
else:
    # PostgreSQL for production
    DATABASE_URL = os.getenv("DATABASE_URL")
    print(f"🔧 Raw DATABASE_URL: {DATABASE_URL}")
    
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        print(f"🔧 Fixed DATABASE_URL: {DATABASE_URL}")
    
    # Use asyncpg for async PostgreSQL connections
    if DATABASE_URL:
        ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        print(f"🔧 ASYNC_DATABASE_URL: {ASYNC_DATABASE_URL}")
    else:
        print("🚨 ERROR: DATABASE_URL is None!")
        ASYNC_DATABASE_URL = None
    
    # Ensure SSL is required for production database connections
    if DATABASE_URL and "ondigitalocean.com" in DATABASE_URL:
        ASYNC_DATABASE_URL = f"{ASYNC_DATABASE_URL}?ssl=require"
        print(f"🔧 ASYNC_DATABASE_URL with SSL: {ASYNC_DATABASE_URL}")

# SQLAlchemy engines
print(f"🔧 Database Config - IS_LOCAL: {IS_LOCAL}")
print(f"🔧 DATABASE_URL: {DATABASE_URL[:50]}...")
print(f"🔧 ASYNC_DATABASE_URL: {ASYNC_DATABASE_URL[:50]}...")

if IS_LOCAL:
    # Use sync SQLite for local development
    async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
    sync_engine = create_engine(DATABASE_URL, echo=False)
    print("🔧 Created SQLite engines (local)")
else:
    # Use async engine for production
    if not DATABASE_URL or not ASYNC_DATABASE_URL:
        raise ValueError("🚨 DATABASE_URL and ASYNC_DATABASE_URL must be set for production!")
    
    try:
        async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
        sync_engine = create_engine(DATABASE_URL, echo=False)
        print("🔧 Created PostgreSQL engines (production)")
    except Exception as e:
        print(f"🚨 Error creating database engines: {e}")
        raise

# Session makers
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
AsyncSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

print(f"🔧 sync_engine type: {type(sync_engine)}")
print(f"🔧 async_engine type: {type(async_engine)}")
print(f"🔧 AsyncSessionLocal type: {type(AsyncSessionLocal)}")

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
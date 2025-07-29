#!/usr/bin/env python3
"""
Simple database initialization script
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from models.database import Base

# SQLite database URL
DATABASE_URL = "sqlite:///./chathut_dev.db"

def init_database():
    """Initialize database tables"""
    try:
        engine = create_engine(DATABASE_URL, echo=True)
        Base.metadata.create_all(bind=engine)
        print("🤖 Database tables created successfully!")
        return True
    except Exception as e:
        print(f"🚨 Database initialization failed: {e}")
        return False

if __name__ == "__main__":
    init_database() 
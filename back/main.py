import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
from datetime import datetime
from dotenv import load_dotenv

from back.telegram.telegram_client import TelegramClientManager
from back.api.auth import router as auth_router
from back.api.telegram_auth import telegram_auth_router
from back.api.messages import messages_router
from back.api.chats import chats_router
from back.api.ai import router as ai_router
from back.api.rag import router as rag_router
from back.api.telegram import router as telegram_router
from back.database.config import connect_database, disconnect_database, init_database, test_connection
from back.utils.websocket_monitor import ws_monitor
import back.globals as globals

# Load environment variables
load_dotenv()

app = FastAPI(title="ChartHut Cyberpunk API 🤖", version="0.7.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Startup events
@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    print("🤖 Starting ChartHut Cyberpunk API...")
    
    # Test database connection
    if test_connection():
        print("🤖 Database connection successful!")
        # Initialize database tables
        init_database()
        # Connect database
        await connect_database()
    else:
        print("🚨 Database connection failed! Some features may not work.")
    
    print("🤖 ChartHut API is ready!")


# Shutdown events
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🤖 Shutting down ChartHut API...")
    await disconnect_database()
    print("🤖 Shutdown complete!")

# Initialize Telegram client manager - GLOBAL INSTANCE
telegram_manager = TelegramClientManager()

# Set the global telegram manager using globals module
globals.set_telegram_manager(telegram_manager)

# Include routers
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(telegram_auth_router, prefix="/api", tags=["Telegram Authentication"])
app.include_router(messages_router, prefix="/api/messages", tags=["messages"])
app.include_router(chats_router, prefix="/api/chats", tags=["chats"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(rag_router, prefix="/api/rag", tags=["rag"])
app.include_router(telegram_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "ChartHut Cyberpunk API 🤖",
        "status": "running",
        "version": "0.7.0",
        "features": [
            "🔐 Advanced Authentication System",
            "🤖 AI-Powered Messaging",
            "📡 Real-time Communication",
            "🗄️ PostgreSQL Database",
            "⚡ Neural Networks Integration"
        ]
    }

@app.get("/api/health")
async def health_check():
    total_websockets = sum(len(ws_list) for ws_list in telegram_manager.websockets.values())
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(telegram_manager.active_clients),
        "websocket_sessions": len(telegram_manager.websockets),
        "total_websocket_connections": total_websockets,
        "websocket_stats": ws_monitor.get_stats()
    }

# WebSocket для real-time обновлений
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    ws_monitor.log_connection(session_id, "CONNECTED", "WebSocket accepted")
    
    try:
        # Add to telegram manager
        await telegram_manager.add_websocket(session_id, websocket)
        ws_monitor.log_connection(session_id, "REGISTERED", "Added to telegram manager")
        
        while True:
            # Keep connection alive and listen for ping/pong
            try:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                await websocket.send_text('{"type": "ping"}')
                ws_monitor.log_message_sent(session_id, "ping", True)
            except Exception:
                ws_monitor.log_connection(session_id, "HEARTBEAT_FAILED", "Ping failed, breaking loop")
                break
            
    except WebSocketDisconnect:
        ws_monitor.log_connection(session_id, "DISCONNECTED", "Client disconnected")
        await telegram_manager.remove_websocket_connection(session_id, websocket)
        ws_monitor.cleanup_session(session_id)
    except Exception as e:
        ws_monitor.log_connection(session_id, "ERROR", f"Exception: {str(e)}")
        await telegram_manager.remove_websocket_connection(session_id, websocket)
        ws_monitor.cleanup_session(session_id)

# Monitoring endpoint
@app.get("/api/monitor")
async def monitor_websockets():
    total_websockets = sum(len(ws_list) for ws_list in telegram_manager.websockets.values())
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(telegram_manager.active_clients),
        "websocket_sessions": len(telegram_manager.websockets),
        "total_websocket_connections": total_websockets,
        "websocket_stats": ws_monitor.get_stats()
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
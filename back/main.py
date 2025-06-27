from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
from datetime import datetime
import os
from dotenv import load_dotenv

from telegram.telegram_client import TelegramClientManager
from api.auth import auth_router
from api.messages import messages_router
from api.chats import chats_router
from api.ai import router as ai_router
from api.rag import router as rag_router
from utils.websocket_monitor import ws_monitor

# Load environment variables
load_dotenv()

app = FastAPI(title="Telegram Web Client API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Telegram client manager - GLOBAL INSTANCE
telegram_manager = TelegramClientManager()

# Set the global telegram manager for API routes
def get_telegram_manager():
    return telegram_manager

# Override the dependency in auth module
import api.auth
api.auth.telegram_manager = telegram_manager
api.auth.get_telegram_manager = get_telegram_manager

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(messages_router, prefix="/api/messages", tags=["messages"])
app.include_router(chats_router, prefix="/api/chats", tags=["chats"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(rag_router, prefix="/api/rag", tags=["rag"])

@app.get("/")
async def root():
    return {"message": "Telegram Web Client API", "status": "running"}

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

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
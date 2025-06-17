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

# Initialize Telegram client manager
telegram_manager = TelegramClientManager()

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(messages_router, prefix="/api/messages", tags=["messages"])
app.include_router(chats_router, prefix="/api/chats", tags=["chats"])

@app.get("/")
async def root():
    return {"message": "Telegram Web Client API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(telegram_manager.active_clients)
    }

# WebSocket для real-time обновлений
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    try:
        # Add to telegram manager
        await telegram_manager.add_websocket(session_id, websocket)
        
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        await telegram_manager.remove_websocket(session_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await telegram_manager.remove_websocket(session_id)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
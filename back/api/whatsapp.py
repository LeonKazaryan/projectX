from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from typing import Optional
import json
from ..whatsapp.whatsapp_client import WhatsAppClientManager
from back.models.database import User
from ..auth import jwt_handler
from back.api.auth import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Global WhatsApp client manager
whatsapp_manager = WhatsAppClientManager()

@router.post("/connect")
async def connect_whatsapp(current_user: User = Depends(get_current_user)):
    """Connect to WhatsApp Web"""
    try:
        session_id = f"whatsapp_{current_user.id}"
        result = await whatsapp_manager.create_session(session_id)
        
        if result.get("success"):
            return {
                "success": True,
                "sessionId": session_id,
                "message": "WhatsApp session created successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to connect"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disconnect")
async def disconnect_whatsapp(current_user: User = Depends(get_current_user)):
    """Disconnect from WhatsApp Web"""
    try:
        session_id = f"whatsapp_{current_user.id}"
        result = await whatsapp_manager.disconnect_session(session_id)
        
        if result.get("success"):
            return {
                "success": True,
                "message": "WhatsApp session disconnected successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to disconnect"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats")
async def get_whatsapp_chats(current_user: User = Depends(get_current_user)):
    """Get list of WhatsApp chats"""
    try:
        session_id = f"whatsapp_{current_user.id}"
        
        if not whatsapp_manager.is_session_active(session_id):
            raise HTTPException(status_code=400, detail="WhatsApp session not active")
        
        result = await whatsapp_manager.get_chats(session_id)
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to get chats"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages")
async def get_whatsapp_messages(
    chat_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get messages from a WhatsApp chat"""
    try:
        session_id = f"whatsapp_{current_user.id}"
        
        if not whatsapp_manager.is_session_active(session_id):
            raise HTTPException(status_code=400, detail="WhatsApp session not active")
        
        result = await whatsapp_manager.get_messages(session_id, chat_id, limit)
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to get messages"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_whatsapp_message(
    chat_id: str,
    text: str,
    current_user: User = Depends(get_current_user)
):
    """Send a message to a WhatsApp chat"""
    try:
        session_id = f"whatsapp_{current_user.id}"
        
        if not whatsapp_manager.is_session_active(session_id):
            raise HTTPException(status_code=400, detail="WhatsApp session not active")
        
        result = await whatsapp_manager.send_message(session_id, chat_id, text)
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to send message"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_whatsapp_status(current_user: User = Depends(get_current_user)):
    """Get WhatsApp session status"""
    try:
        session_id = f"whatsapp_{current_user.id}"
        result = await whatsapp_manager.get_session_status(session_id)
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to get status"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/{session_id}")
async def whatsapp_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time WhatsApp updates"""
    await websocket.accept()
    
    try:
        # Add websocket to manager
        await whatsapp_manager.add_websocket(session_id, websocket)
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for any message from client (ping/pong)
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle client messages if needed
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break
                
    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        # Clean up websocket connection
        await whatsapp_manager.remove_websocket(session_id, websocket) 
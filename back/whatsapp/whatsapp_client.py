import asyncio
import json
import os
from typing import Dict, Optional, List, Any
from datetime import datetime
import aiohttp
from fastapi import WebSocket

class WhatsAppClientManager:
    def __init__(self):
        self.active_clients: Dict[str, Any] = {}
        self.websockets: Dict[str, List[WebSocket]] = {}
        self.whatsapp_service_url = os.getenv('WHATSAPP_SERVICE_URL', 'http://localhost:3000')
        
    async def create_session(self, session_id: str) -> dict:
        """Create a new WhatsApp session"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.whatsapp_service_url}/whatsapp/connect",
                    json={"sessionId": session_id}
                ) as response:
                    data = await response.json()
                    if data.get('success'):
                        self.active_clients[session_id] = {
                            'session_id': session_id,
                            'status': 'connected',
                            'created_at': datetime.now()
                        }
                    return data
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def disconnect_session(self, session_id: str) -> dict:
        """Disconnect a WhatsApp session"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.whatsapp_service_url}/whatsapp/disconnect",
                    json={"sessionId": session_id}
                ) as response:
                    data = await response.json()
                    if data.get('success'):
                        if session_id in self.active_clients:
                            del self.active_clients[session_id]
                    return data
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_chats(self, session_id: str) -> dict:
        """Get list of WhatsApp chats"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.whatsapp_service_url}/whatsapp/chats",
                    params={"sessionId": session_id}
                ) as response:
                    return await response.json()
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_messages(self, session_id: str, chat_id: str, limit: int = 50) -> dict:
        """Get messages from a WhatsApp chat"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.whatsapp_service_url}/whatsapp/messages",
                    params={
                        "sessionId": session_id,
                        "chatId": chat_id,
                        "limit": limit
                    }
                ) as response:
                    return await response.json()
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_message(self, session_id: str, chat_id: str, text: str) -> dict:
        """Send a message to a WhatsApp chat"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.whatsapp_service_url}/whatsapp/send",
                    json={
                        "sessionId": session_id,
                        "chatId": chat_id,
                        "text": text
                    }
                ) as response:
                    return await response.json()
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_session_status(self, session_id: str) -> dict:
        """Get the status of a WhatsApp session"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.whatsapp_service_url}/whatsapp/status",
                    params={"sessionId": session_id}
                ) as response:
                    return await response.json()
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def add_websocket(self, session_id: str, websocket: WebSocket):
        """Add a WebSocket connection for real-time updates"""
        if session_id not in self.websockets:
            self.websockets[session_id] = []
        self.websockets[session_id].append(websocket)
    
    async def remove_websocket(self, session_id: str, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if session_id in self.websockets:
            self.websockets[session_id] = [
                ws for ws in self.websockets[session_id] if ws != websocket
            ]
            if not self.websockets[session_id]:
                del self.websockets[session_id]
    
    async def broadcast_to_websockets(self, session_id: str, event_type: str, data: Any):
        """Broadcast an event to all WebSocket connections for a session"""
        if session_id in self.websockets:
            message = json.dumps({
                "type": event_type,
                "data": data,
                "source": "whatsapp"
            })
            
            # Send to all websockets and remove disconnected ones
            active_websockets = []
            for websocket in self.websockets[session_id]:
                try:
                    await websocket.send_text(message)
                    active_websockets.append(websocket)
                except Exception:
                    # WebSocket is disconnected, skip it
                    continue
            
            self.websockets[session_id] = active_websockets
    
    def is_session_active(self, session_id: str) -> bool:
        """Check if a session is active"""
        return session_id in self.active_clients
    
    async def cleanup_session(self, session_id: str):
        """Clean up a session and all its resources"""
        await self.disconnect_session(session_id)
        if session_id in self.websockets:
            del self.websockets[session_id]

    async def clear_user_sessions(self, user_id: str) -> dict:
        """Clear all WhatsApp sessions for a specific user"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.whatsapp_service_url}/whatsapp/clear-user-sessions",
                    json={"userId": str(user_id)}
                ) as response:
                    data = await response.json()
                    if data.get('success'):
                        # Also clean up local tracking
                        session_prefix = f"whatsapp_{user_id}"
                        sessions_to_remove = [
                            sid for sid in self.active_clients.keys() 
                            if sid.startswith(session_prefix)
                        ]
                        for sid in sessions_to_remove:
                            if sid in self.active_clients:
                                del self.active_clients[sid]
                            if sid in self.websockets:
                                del self.websockets[sid]
                    return data
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 
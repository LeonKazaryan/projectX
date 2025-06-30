import asyncio
import os
from typing import Dict, Optional, List
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.tl.types import Message, Dialog, User, Chat, Channel
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
import json
from datetime import datetime

class TelegramClientManager:
    def __init__(self):
        self.active_clients: Dict[str, TelegramClient] = {}
        self.websockets: Dict[str, List[any]] = {}  # Changed to support multiple connections per session
        self.api_id = int(os.getenv('TELEGRAM_API_ID', ''))
        self.api_hash = os.getenv('TELEGRAM_API_HASH', '')
        
        if not self.api_id or not self.api_hash:
            raise ValueError("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in environment variables")
    
    async def create_client(self, session_string: str = "") -> TelegramClient:
        """Создать новый Telegram клиент"""
        session = StringSession(session_string)
        client = TelegramClient(session, self.api_id, self.api_hash)
        return client
    
    async def authenticate_with_phone(self, phone: str, session_id: str) -> dict:
        """Начать процесс аутентификации по номеру телефона"""
        try:
            client = await self.create_client()
            await client.connect()
            
            # Отправить код
            code_request = await client.send_code_request(phone)
            
            # Сохранить клиент временно
            self.active_clients[f"temp_{session_id}"] = client
            
            return {
                "success": True,
                "phone_code_hash": code_request.phone_code_hash,
                "message": "Код отправлен на ваш телефон"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_phone_code(self, phone: str, code: str, phone_code_hash: str, session_id: str) -> dict:
        """Проверить код подтверждения"""
        try:
            client = self.active_clients.get(f"temp_{session_id}")
            if not client:
                return {"success": False, "error": "Сессия не найдена"}
            
            try:
                # Попытаться войти с кодом
                await client.sign_in(phone, code, phone_code_hash=phone_code_hash)
                
                # Получить сессию
                session_string = client.session.save()
                
                # Переместить клиент в активные
                self.active_clients[session_id] = client
                del self.active_clients[f"temp_{session_id}"]
                
                # Настроить обработчики событий
                await self._setup_event_handlers(client, session_id)
                
                return {
                    "success": True,
                    "session_string": session_string,
                    "message": "Аутентификация успешна"
                }
                
            except SessionPasswordNeededError:
                return {
                    "success": False,
                    "need_password": True,
                    "message": "Требуется двухфакторная аутентификация"
                }
                
        except PhoneCodeInvalidError:
            return {"success": False, "error": "Неверный код"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def verify_2fa_password(self, password: str, session_id: str) -> dict:
        """Проверить пароль 2FA"""
        try:
            client = self.active_clients.get(f"temp_{session_id}")
            if not client:
                return {"success": False, "error": "Сессия не найдена"}
            
            await client.sign_in(password=password)
            
            # Получить сессию
            session_string = client.session.save()
            
            # Переместить клиент в активные
            self.active_clients[session_id] = client
            del self.active_clients[f"temp_{session_id}"]
            
            # Настроить обработчики событий
            await self._setup_event_handlers(client, session_id)
            
            return {
                "success": True,
                "session_string": session_string,
                "message": "Аутентификация успешна"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def restore_session(self, session_string: str, session_id: str) -> dict:
        """Восстановить сессию из строки"""
        try:
            client = await self.create_client(session_string)
            await client.connect()
            
            if await client.is_user_authorized():
                self.active_clients[session_id] = client
                await self._setup_event_handlers(client, session_id)
                
                return {
                    "success": True,
                    "message": "Сессия восстановлена"
                }
            else:
                return {
                    "success": False,
                    "error": "Сессия недействительна"
                }
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_dialogs(self, session_id: str, limit: int = 50, include_archived: bool = False, include_readonly: bool = True, include_groups: bool = True) -> dict:
        """Получить список диалогов"""
        try:
            client = self.active_clients.get(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден"}
            
            dialogs = await client.get_dialogs(limit=limit, archived=False)
            
            if include_archived:
                # Also get archived dialogs
                archived_dialogs = await client.get_dialogs(limit=limit, archived=True)
                dialogs.extend(archived_dialogs)
            
            dialogs_data = []
            for dialog in dialogs:
                entity = dialog.entity
                
                # Determine entity types and properties
                is_user = isinstance(entity, User)
                is_basic_group = isinstance(entity, Chat)
                is_channel = isinstance(entity, Channel)
                is_supergroup = is_channel and hasattr(entity, 'megagroup') and entity.megagroup
                is_broadcast_channel = is_channel and entity.broadcast
                
                # Determine if we can send messages
                can_send_messages = True
                if is_channel:
                    can_send_messages = not entity.broadcast and (
                        not hasattr(entity, 'default_banned_rights') or 
                        entity.default_banned_rights is None or 
                        not entity.default_banned_rights.send_messages
                    )
                
                # Skip read-only channels if include_readonly is False
                if is_broadcast_channel and not include_readonly and not can_send_messages:
                    continue
                
                # Skip ALL types of groups if include_groups is False
                # This includes basic groups (Chat) and supergroups (Channel with megagroup=True)
                if not include_groups and (is_basic_group or is_supergroup):
                    continue
                
                dialog_data = {
                    "id": dialog.id,
                    "name": dialog.name,
                    "is_user": is_user,
                    "is_group": is_basic_group or is_supergroup,  # Both basic groups and supergroups are considered "groups"
                    "is_channel": is_broadcast_channel,  # Only broadcast channels are considered "channels"
                    "can_send_messages": can_send_messages,
                    "is_archived": dialog.archived,
                    "unread_count": dialog.unread_count,
                    "last_message": {
                        "text": dialog.message.message if dialog.message else "",
                        "date": dialog.message.date.isoformat() if dialog.message else None
                    }
                }
                
                dialogs_data.append(dialog_data)
            
            return {
                "success": True,
                "dialogs": dialogs_data
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_messages(self, session_id: str, dialog_id: int, limit: int = 50, offset_id: int = 0) -> dict:
        """Получить сообщения из диалога"""
        try:
            client = self.active_clients.get(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден"}
            
            messages = await client.get_messages(dialog_id, limit=limit, offset_id=offset_id)
            
            messages_data = []
            for message in messages:
                if isinstance(message, Message):
                    message_data = {
                        "id": message.id,
                        "text": message.message,
                        "date": message.date.isoformat(),
                        "sender_id": message.sender_id,
                        "is_outgoing": message.out
                    }
                    messages_data.append(message_data)
            
            return {
                "success": True,
                "messages": messages_data
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def send_message(self, session_id: str, dialog_id: int, text: str) -> dict:
        """Отправить сообщение"""
        try:
            client = self.active_clients.get(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден"}
            
            message = await client.send_message(dialog_id, text)
            
            # Manually broadcast the sent message via WebSocket
            if session_id in self.websockets:
                websockets_list = self.websockets[session_id]
                message_data = {
                    "type": "new_message",
                    "data": {
                        "id": message.id,
                        "text": message.message or text,
                        "date": message.date.isoformat(),
                        "sender_id": message.sender_id,
                        "chat_id": dialog_id,
                        "is_outgoing": True
                    }
                }
                
                # Send to all connected websockets for this session
                broken_connections = []
                for i, websocket in enumerate(websockets_list):
                    try:
                        await websocket.send_text(json.dumps(message_data))
                    except Exception as e:
                        print(f"Error sending outgoing message websocket notification to session {session_id}, connection {i}: {e}")
                        broken_connections.append(websocket)
                
                # Remove broken connections
                for broken_ws in broken_connections:
                    await self.remove_websocket_connection(session_id, broken_ws)
                
                if websockets_list:  # Only log if there are still active connections
                    print(f"Sent outgoing message notification to {len(websockets_list)} connections for session {session_id}: {text[:50]}...")
            
            return {
                "success": True,
                "message": {
                    "id": message.id,
                    "text": message.message,
                    "date": message.date.isoformat()
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _setup_event_handlers(self, client: TelegramClient, session_id: str):
        """Настроить обработчики событий для клиента"""
        @client.on(events.NewMessage)
        async def new_message_handler(event):
            if session_id in self.websockets:
                websockets_list = self.websockets[session_id]
                message_data = {
                    "type": "new_message",
                    "data": {
                        "id": event.message.id,
                        "text": event.message.message or "",
                        "date": event.message.date.isoformat(),
                        "sender_id": event.message.sender_id,
                        "chat_id": event.chat_id,
                        "is_outgoing": event.message.out
                    }
                }
                
                # Send to all connected websockets for this session
                broken_connections = []
                for i, websocket in enumerate(websockets_list):
                    try:
                        await websocket.send_text(json.dumps(message_data))
                    except Exception as e:
                        print(f"Error sending websocket message to session {session_id}, connection {i}: {e}")
                        broken_connections.append(websocket)
                
                # Remove broken connections
                for broken_ws in broken_connections:
                    await self.remove_websocket_connection(session_id, broken_ws)
                
                if websockets_list:  # Only log if there are still active connections
                    print(f"Sent new message notification to {len(websockets_list)} connections for session {session_id}: {event.message.message[:50] if event.message.message else 'No text'}...")
    
    async def add_websocket(self, session_id: str, websocket):
        """Добавить WebSocket соединение"""
        if session_id not in self.websockets:
            self.websockets[session_id] = []
        self.websockets[session_id].append(websocket)
        print(f"Added WebSocket connection for session {session_id}. Total connections: {len(self.websockets[session_id])}")

    async def remove_websocket_connection(self, session_id: str, websocket):
        """Удалить конкретное WebSocket соединение"""
        if session_id in self.websockets:
            try:
                self.websockets[session_id].remove(websocket)
                print(f"Removed WebSocket connection for session {session_id}. Remaining connections: {len(self.websockets[session_id])}")
                
                # If no more connections, remove the session entirely
                if not self.websockets[session_id]:
                    del self.websockets[session_id]
                    print(f"No more WebSocket connections for session {session_id}, removed session")
            except ValueError:
                print(f"WebSocket connection not found in session {session_id}")

    async def remove_websocket(self, session_id: str):
        """Удалить все WebSocket соединения для сессии"""
        if session_id in self.websockets:
            del self.websockets[session_id]
            print(f"Removed all WebSocket connections for session {session_id}")
    
    async def get_user_info(self, session_id: str) -> dict:
        """Получить информацию о пользователе Telegram"""
        try:
            client = self.active_clients.get(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден"}

            me = await client.get_me()
            if not me:
                return {"success": False, "error": "Не удалось получить информацию о пользователе"}
            
            print("--- TELEGRAM USER OBJECT ---")
            print(me.to_json(indent=4))
            print("--------------------------")

            return {
                "success": True,
                "id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username,
                "phone": me.phone
            }

        except Exception as e:
            print(f"Error in get_user_info: {e}")
            return {"success": False, "error": str(e)}

    async def disconnect_client(self, session_id: str):
        """Отключить клиент"""
        if session_id in self.active_clients:
            client = self.active_clients[session_id]
            await client.disconnect()
            del self.active_clients[session_id]
        
        await self.remove_websocket(session_id)
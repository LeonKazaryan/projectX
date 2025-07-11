import asyncio
import os
from typing import Dict, Optional, List
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.tl.types import Message, Dialog, User, Chat, Channel
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TelegramClientManager:
    def __init__(self):
        # Remove in-memory storage - everything goes to database
        self.temp_clients: Dict[str, TelegramClient] = {}  # Only for auth process
        self.websockets: Dict[str, List[any]] = {}  # WebSocket connections per session
        self.api_id = int(os.getenv('TELEGRAM_API_ID', ''))
        self.api_hash = os.getenv('TELEGRAM_API_HASH', '')
        
        if not self.api_id or not self.api_hash:
            raise ValueError("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in environment variables")
    
    async def create_client(self, session_string: str = "") -> TelegramClient:
        """Создать новый Telegram клиент"""
        session = StringSession(session_string)
        client = TelegramClient(session, self.api_id, self.api_hash)
        return client

    async def _get_client_from_db(self, session_id: str) -> Optional[TelegramClient]:
        """
        Получить клиент из базы данных и создать новое соединение.
        Это делает систему stateless - каждый запрос создает свежее соединение.
        """
        try:
            # Import here to avoid circular imports
            from back.database.config import get_async_db_direct
            from back.models.database import TelegramConnection
            from sqlalchemy import select
            
            # Extract user_id from session_id pattern: user_{user_id}_*
            if not session_id.startswith("user_") or "_" not in session_id[5:]:
                logger.warning(f"Invalid session_id format: {session_id}")
                return None
                
            try:
                user_id = int(session_id.split("_")[1])
            except (IndexError, ValueError):
                logger.warning(f"Could not extract user_id from session_id: {session_id}")
                return None
            
            # Get session from database
            async with get_async_db_direct() as db:
                result = await db.execute(
                    select(TelegramConnection).filter(
                        TelegramConnection.user_id == user_id,
                        TelegramConnection.is_active == True
                    )
                )
                connection = result.scalars().first()
                
                if not connection or not connection.session_data:
                    logger.info(f"No active Telegram session found for user {user_id}")
                    return None
                
                # Create client with session from DB
                client = await self.create_client(connection.session_data)
                await client.connect()
                
                # Verify session is still valid
                if await client.is_user_authorized():
                    logger.info(f"Successfully restored Telegram client for user {user_id}")
                    return client
                else:
                    logger.warning(f"Telegram session expired for user {user_id}")
                    # Mark session as inactive in DB
                    connection.is_active = False
                    await db.commit()
                    await client.disconnect()
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting client from DB for session {session_id}: {e}")
            return None

    async def _ensure_entity(self, client: TelegramClient, dialog_id: int):
        """Guarantee that the entity for dialog_id is cached inside the client."""
        try:
            await client.get_entity(dialog_id)
        except Exception:
            # Ignore – если не получилось, дальнейшие попытки тоже упадут и мы вернём ошибку
            pass

    async def authenticate_with_phone(self, phone: str, session_id: str) -> dict:
        """Начать процесс аутентификации по номеру телефона"""
        try:
            client = await self.create_client()
            await client.connect()
            
            # Отправить код
            code_request = await client.send_code_request(phone)
            
            # Сохранить клиент временно (только для процесса авторизации)
            self.temp_clients[f"temp_{session_id}"] = client
            
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
            client = self.temp_clients.get(f"temp_{session_id}")
            if not client:
                return {"success": False, "error": "Сессия не найдена"}
            
            try:
                # Попытаться войти с кодом
                await client.sign_in(phone, code, phone_code_hash=phone_code_hash)
                
                # Получить сессию
                session_string = client.session.save()
                
                # Cleanup temp client
                del self.temp_clients[f"temp_{session_id}"]
                await client.disconnect()
                
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
            client = self.temp_clients.get(f"temp_{session_id}")
            if not client:
                return {"success": False, "error": "Сессия не найдена"}
            
            await client.sign_in(password=password)
            
            # Получить сессию
            session_string = client.session.save()
            
            # Cleanup temp client
            del self.temp_clients[f"temp_{session_id}"]
            await client.disconnect()
            
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
                # Don't store client in memory - just verify it works
                await client.disconnect()
                
                return {
                    "success": True,
                    "message": "Сессия восстановлена"
                }
            else:
                await client.disconnect()
                return {
                    "success": False,
                    "error": "Сессия недействительна"
                }
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_dialogs(self, session_id: str, limit: int = 50, include_archived: bool = False, include_readonly: bool = True, include_groups: bool = True) -> dict:
        """Получить список диалогов"""
        client = None
        try:
            client = await self._get_client_from_db(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден или сессия недействительна"}
            
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
                if not include_groups and (is_basic_group or is_supergroup):
                    continue
                
                dialog_data = {
                    "id": dialog.id,
                    "name": dialog.name,
                    "is_user": is_user,
                    "is_group": is_basic_group or is_supergroup,
                    "is_channel": is_broadcast_channel,
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
            logger.error(f"Error getting dialogs for session {session_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            # Always disconnect after operation
            if client:
                try:
                    await client.disconnect()
                except:
                    pass
    
    async def get_messages(self, session_id: str, dialog_id: int, limit: int = 50, offset_id: int = 0) -> dict:
        """Получить сообщения из диалога"""
        client = None
        try:
            client = await self._get_client_from_db(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден или сессия недействительна"}

            try:
                messages = await client.get_messages(dialog_id, limit=limit, offset_id=offset_id)
            except ValueError as ve:
                if "input entity" in str(ve):
                    await self._ensure_entity(client, dialog_id)
                    messages = await client.get_messages(dialog_id, limit=limit, offset_id=offset_id)
                else:
                    raise

            messages_data = []
            for message in messages:
                if isinstance(message, Message):
                    messages_data.append({
                        "id": message.id,
                        "text": message.message,
                        "date": message.date.isoformat(),
                        "sender_id": message.sender_id,
                        "is_outgoing": message.out
                    })

            return {"success": True, "messages": messages_data}

        except Exception as e:
            logger.error(f"Error getting messages for session {session_id}, dialog {dialog_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            # Always disconnect after operation
            if client:
                try:
                    await client.disconnect()
                except:
                    pass
    
    async def send_message(self, session_id: str, dialog_id: int, text: str) -> dict:
        """Отправить сообщение"""
        client = None
        try:
            client = await self._get_client_from_db(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден или сессия недействительна"}

            try:
                message = await client.send_message(dialog_id, text)
            except ValueError as ve:
                if "input entity" in str(ve):
                    await self._ensure_entity(client, dialog_id)
                    message = await client.send_message(dialog_id, text)
                else:
                    raise

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
                        logger.warning(f"Error sending outgoing message websocket notification to session {session_id}, connection {i}: {e}")
                        broken_connections.append(websocket)
                
                # Remove broken connections
                for broken_ws in broken_connections:
                    await self.remove_websocket_connection(session_id, broken_ws)
                
                if websockets_list:
                    logger.info(f"Sent outgoing message notification to {len(websockets_list)} connections for session {session_id}")
            
            return {
                "success": True,
                "message": {
                    "id": message.id,
                    "text": message.message,
                    "date": message.date.isoformat()
                }
            }

        except Exception as e:
            logger.error(f"Error sending message for session {session_id}, dialog {dialog_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            # Always disconnect after operation
            if client:
                try:
                    await client.disconnect()
                except:
                    pass

    # WebSocket management (kept in memory for performance)
    async def add_websocket(self, session_id: str, websocket):
        """Добавить WebSocket соединение"""
        if session_id not in self.websockets:
            self.websockets[session_id] = []
        self.websockets[session_id].append(websocket)
        logger.info(f"Added WebSocket connection for session {session_id}. Total connections: {len(self.websockets[session_id])}")

    async def remove_websocket_connection(self, session_id: str, websocket):
        """Удалить конкретное WebSocket соединение"""
        if session_id in self.websockets:
            try:
                self.websockets[session_id].remove(websocket)
                logger.info(f"Removed WebSocket connection for session {session_id}. Remaining connections: {len(self.websockets[session_id])}")
                
                # If no more connections, remove the session entirely
                if not self.websockets[session_id]:
                    del self.websockets[session_id]
                    logger.info(f"No more WebSocket connections for session {session_id}, removed session")
            except ValueError:
                logger.warning(f"WebSocket connection not found in session {session_id}")

    async def remove_websocket(self, session_id: str):
        """Удалить все WebSocket соединения для сессии"""
        if session_id in self.websockets:
            del self.websockets[session_id]
            logger.info(f"Removed all WebSocket connections for session {session_id}")
    
    async def get_user_info(self, session_id: str) -> dict:
        """Получить информацию о пользователе Telegram"""
        client = None
        try:
            client = await self._get_client_from_db(session_id)
            if not client:
                return {"success": False, "error": "Клиент не найден или сессия недействительна"}

            me = await client.get_me()
            if not me:
                return {"success": False, "error": "Не удалось получить информацию о пользователе"}
            
            return {
                "success": True,
                "id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username,
                "phone": me.phone
            }

        except Exception as e:
            logger.error(f"Error in get_user_info for session {session_id}: {e}")
            return {"success": False, "error": str(e)}
        finally:
            # Always disconnect after operation
            if client:
                try:
                    await client.disconnect()
                except:
                    pass

    async def disconnect_client(self, session_id: str):
        """Отключить клиент"""
        # Remove WebSocket connections
        await self.remove_websocket(session_id)
        logger.info(f"Disconnected client for session {session_id}")
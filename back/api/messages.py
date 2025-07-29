from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from back.globals import get_telegram_manager
import time

messages_router = APIRouter()

# Simple in-memory cache for messages
message_cache = {}
CACHE_TTL = 60  # 1 minute cache for messages

class Message(BaseModel):
    id: int
    text: str
    date: str
    sender_id: int
    is_outgoing: bool
    sender_name: Optional[str] = None

class MessagesResponse(BaseModel):
    success: bool
    messages: List[Message]
    error: Optional[str] = None
    cached: Optional[bool] = False
    load_time: Optional[float] = None

class SendMessageRequest(BaseModel):
    dialog_id: int
    text: str
    session_id: str

class SendMessageResponse(BaseModel):
    success: bool
    message: Optional[dict] = None
    error: Optional[str] = None

@messages_router.get("/history", response_model=MessagesResponse)
async def get_message_history(
    session_id: str = Query(..., description="ID сессии"),
    dialog_id: int = Query(..., description="ID диалога"),
    limit: int = Query(50, description="Количество сообщений (max 100)"),
    offset_id: int = Query(0, description="ID сообщения, с которого начать (для пагинации)"),
    manager = Depends(get_telegram_manager)
):
    """Получить историю сообщений из диалога с кэшированием"""
    start_time = time.time()
    
    # Create cache key
    cache_key = f"{session_id}_{dialog_id}_{limit}_{offset_id}"
    
    # Check cache first (only for recent messages, not pagination)
    if offset_id == 0 and cache_key in message_cache:
        cached_data, cache_time = message_cache[cache_key]
        if time.time() - cache_time < CACHE_TTL:
            load_time = time.time() - start_time
            print(f"💬 [MESSAGES] Cache hit for dialog {dialog_id} (load_time: {load_time:.3f}s)")
            return MessagesResponse(
                success=True,
                messages=cached_data,
                cached=True,
                load_time=load_time
            )
    
    print(f"💬 [MESSAGES] Loading messages: session={session_id[:20]}..., dialog={dialog_id}, limit={limit}, offset={offset_id}")
    
    # Limit maximum messages to prevent slow responses
    actual_limit = min(limit, 100)
    
    result = await manager.get_messages(session_id, dialog_id, actual_limit, offset_id=offset_id)
    load_time = time.time() - start_time
    
    print(f"💬 [MESSAGES] Loaded {len(result.get('messages', []))} messages in {load_time:.3f}s")
    
    if result["success"]:
        # Cache only recent messages (offset_id == 0)
        if offset_id == 0:
            message_cache[cache_key] = (result["messages"], time.time())
            
            # Cleanup old cache entries (keep only last 50)
            if len(message_cache) > 50:
                oldest_key = min(message_cache.keys(), key=lambda k: message_cache[k][1])
                del message_cache[oldest_key]
        
        return MessagesResponse(
            success=True,
            messages=result["messages"],
            cached=False,
            load_time=load_time
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"])

@messages_router.post("/send", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    manager = Depends(get_telegram_manager)
):
    """Отправить сообщение"""
    start_time = time.time()
    
    # Clear cache for this dialog after sending message
    cache_keys_to_clear = [k for k in message_cache.keys() if f"_{request.dialog_id}_" in k]
    for key in cache_keys_to_clear:
        del message_cache[key]
    
    result = await manager.send_message(
        request.session_id, 
        request.dialog_id, 
        request.text
    )
    
    load_time = time.time() - start_time
    print(f"💬 [MESSAGES] Send message completed in {load_time:.3f}s")
    
    if result["success"]:
        return SendMessageResponse(
            success=True,
            message=result["message"]
        )
    else:
        raise HTTPException(status_code=400, detail=result["error"]) 
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import logging
from datetime import datetime

from ai.secure_rag_engine import secure_rag_engine
from ai.message_analyzer import message_analyzer
from api.auth import get_telegram_manager

logger = logging.getLogger(__name__)

router = APIRouter()

class MessageStoreRequest(BaseModel):
    session_id: str
    chat_id: int
    messages: List[Dict]

class MessageSearchRequest(BaseModel):
    session_id: str
    chat_id: int
    query: str
    limit: Optional[int] = 5
    score_threshold: Optional[float] = 0.7

class ClearChatRequest(BaseModel):
    session_id: str
    chat_id: int

class RAGSearchRequest(BaseModel):
    session_id: str
    chat_id: int
    query: str
    limit: Optional[int] = 5
    score_threshold: Optional[float] = 0.7

class RAGSearchResponse(BaseModel):
    success: bool
    similar_messages: List[Dict]
    total_found: int
    error: Optional[str] = None

class RAGSyncRequest(BaseModel):
    session_id: str
    chat_id: Optional[int] = None  # If None, sync all chats
    message_limit: Optional[int] = 1000  # Per chat
    force_resync: Optional[bool] = False

class RAGSyncResponse(BaseModel):
    success: bool
    total_messages_processed: int
    chats_processed: int
    errors: List[str] = []
    message: Optional[str] = None

# Legacy model classes removed - using new secure models above

@router.post("/store_messages")
async def store_messages_secure(request: MessageStoreRequest, background_tasks: BackgroundTasks):
    """
    Store messages securely with OpenAI embeddings in Qdrant
    Raw text is NOT stored - only embeddings and safe metadata
    """
    try:
        stored_count = 0
        failed_count = 0
        
        for message in request.messages:
            # Store each message securely in the background
            success = await secure_rag_engine.store_message_securely(
                request.session_id,
                request.chat_id,
                message
            )
            
            if success:
                stored_count += 1
            else:
                failed_count += 1
        
        logger.info(f"Stored {stored_count} messages securely, {failed_count} failed")
        
        return {
            "status": "success",
            "stored_count": stored_count,
            "failed_count": failed_count,
            "total_requested": len(request.messages),
            "security_mode": "enabled",
            "raw_text_stored": False,
            "embedding_model": secure_rag_engine.embedding_model
        }
        
    except Exception as e:
        logger.error(f"Error storing messages: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store messages: {str(e)}"
        )

@router.post("/search_similar")
async def search_similar_messages(request: MessageSearchRequest):
    """
    Search for similar messages using semantic embeddings
    Returns metadata and context hints, NOT raw message text
    """
    try:
        similar_messages = await secure_rag_engine.find_similar_messages_secure(
            request.session_id,
            request.chat_id,
            request.query,
            limit=request.limit,
            score_threshold=request.score_threshold
        )
        
        return {
            "status": "success",
            "query": request.query,
            "results_count": len(similar_messages),
            "similar_messages": similar_messages,
            "search_type": "semantic_embedding",
            "privacy_protected": True
        }
        
    except Exception as e:
        logger.error(f"Error searching similar messages: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search messages: {str(e)}"
        )

@router.get("/stats")
async def get_rag_stats():
    """Get secure statistics about the RAG system"""
    try:
        stats = await secure_rag_engine.get_collection_stats()
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "rag_stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting RAG stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get RAG stats: {str(e)}"
        )

@router.post("/clear_chat")
async def clear_chat_data(request: ClearChatRequest):
    """Securely clear all stored data for a specific chat"""
    try:
        success = await secure_rag_engine.clear_chat_data_secure(
            request.session_id,
            request.chat_id
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Chat data cleared for session {request.session_id}, chat {request.chat_id}",
                "privacy_protected": True
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to clear chat data"
            )
            
    except Exception as e:
        logger.error(f"Error clearing chat data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear chat data: {str(e)}"
        )

@router.get("/health")
async def rag_health_check():
    """Check RAG system health"""
    try:
        # Test if engines are initialized
        openai_status = "available" if secure_rag_engine.openai_client else "unavailable"
        qdrant_status = "available" if secure_rag_engine.qdrant_client else "unavailable"
        
        health_status = "healthy" if (openai_status == "available" and qdrant_status == "available") else "degraded"
        
        return {
            "status": health_status,
            "timestamp": datetime.now().isoformat(),
            "components": {
                "openai_embeddings": openai_status,
                "qdrant_vectordb": qdrant_status
            },
            "embedding_model": secure_rag_engine.embedding_model,
            "embedding_dimension": secure_rag_engine.embedding_dimension,
            "security_features": {
                "raw_text_storage": "disabled",
                "data_retention_days": secure_rag_engine.retention_days,
                "text_hashing": "enabled"
            }
        }
        
    except Exception as e:
        logger.error(f"Error checking RAG health: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Legacy endpoint removed - use /store_messages instead

# Legacy bulk endpoint removed - use /store_messages instead

# Legacy search endpoint removed - use /search_similar instead

# Legacy context endpoint removed

# Legacy suggestion endpoint removed

# Legacy endpoints removed - use the new secure endpoints instead

@router.post("/search-similar", response_model=RAGSearchResponse)
async def search_similar_messages(request: RAGSearchRequest):
    """Search for similar messages in conversation history using RAG"""
    try:
        similar_messages = await secure_rag_engine.find_similar_messages_secure(
            session_id=request.session_id,
            chat_id=request.chat_id,
            query_text=request.query,
            limit=request.limit,
            score_threshold=request.score_threshold
        )
        
        return RAGSearchResponse(
            success=True,
            similar_messages=similar_messages,
            total_found=len(similar_messages)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/sync-telegram-history", response_model=RAGSyncResponse)
async def sync_telegram_history_to_rag(
    request: RAGSyncRequest,
    background_tasks: BackgroundTasks,
    manager = Depends(get_telegram_manager)
):
    """Bulk load Telegram message history into RAG system"""
    try:
        # Add background task for bulk loading
        background_tasks.add_task(
            _bulk_load_telegram_history,
            request.session_id,
            request.chat_id,
            request.message_limit,
            request.force_resync,
            manager
        )
        
        return RAGSyncResponse(
            success=True,
            total_messages_processed=0,  # Will be updated in background
            chats_processed=0,
            message="Started bulk loading history to RAG system in background"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@router.get("/sync-telegram-history")
async def sync_telegram_history_get(
    session_id: str = Query(...),
    chat_id: Optional[int] = Query(None),
    limit: int = Query(1000),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    manager = Depends(get_telegram_manager)
):
    """GET version of sync endpoint for frontend compatibility"""
    background_tasks.add_task(
        _bulk_load_telegram_history,
        session_id,
        chat_id,
        limit,
        False,
        manager
    )
    
    return {
        "success": True,
        "message": "Started syncing Telegram history to RAG",
        "total_messages": 0
    }

async def _bulk_load_telegram_history(
    session_id: str,
    chat_id: Optional[int],
    message_limit: int,
    force_resync: bool,
    manager
):
    """Background task to bulk load Telegram message history"""
    total_processed = 0
    chats_processed = 0
    errors = []
    
    try:
        print(f"🚀 Starting bulk RAG sync for session {session_id}")
        
        if chat_id:
            # Sync specific chat
            try:
                result = await manager.get_messages(session_id, chat_id, message_limit)
                if result["success"]:
                    messages = result["messages"]
                    for message in messages:
                        try:
                            await secure_rag_engine.store_message_securely(
                                session_id, chat_id, message
                            )
                            total_processed += 1
                        except Exception as e:
                            errors.append(f"Error storing message {message.get('id', 'unknown')}: {e}")
                    
                    chats_processed = 1
                    print(f"✅ Processed {total_processed} messages from chat {chat_id}")
                else:
                    errors.append(f"Failed to get messages for chat {chat_id}: {result.get('error', 'Unknown error')}")
            except Exception as e:
                errors.append(f"Error processing chat {chat_id}: {e}")
                
        else:
            # Sync all chats
            try:
                # Get all dialogs first
                dialogs_result = await manager.get_dialogs(session_id, limit=200)
                if not dialogs_result["success"]:
                    errors.append(f"Failed to get dialogs: {dialogs_result.get('error', 'Unknown error')}")
                    return
                
                dialogs = dialogs_result["dialogs"]
                print(f"📂 Found {len(dialogs)} dialogs to sync")
                
                # Process each dialog
                for dialog in dialogs:
                    try:
                        dialog_id = dialog["id"]
                        dialog_name = dialog.get("name", "Unknown")
                        
                        # Skip if can't send messages (read-only channels)
                        if not dialog.get("can_send_messages", True):
                            print(f"⏭️ Skipping read-only dialog: {dialog_name}")
                            continue
                        
                        print(f"📥 Loading messages from {dialog_name} (ID: {dialog_id})")
                        
                        # Get messages for this dialog
                        result = await manager.get_messages(session_id, dialog_id, message_limit)
                        if result["success"]:
                            messages = result["messages"]
                            chat_messages_processed = 0
                            
                            for message in messages:
                                try:
                                    await secure_rag_engine.store_message_securely(
                                        session_id, dialog_id, message
                                    )
                                    total_processed += 1
                                    chat_messages_processed += 1
                                except Exception as e:
                                    errors.append(f"Error storing message {message.get('id', 'unknown')} from {dialog_name}: {e}")
                            
                            print(f"✅ Processed {chat_messages_processed} messages from {dialog_name}")
                            chats_processed += 1
                            
                            # Small delay to avoid overwhelming the system
                            await asyncio.sleep(0.5)
                            
                        else:
                            errors.append(f"Failed to get messages for {dialog_name}: {result.get('error', 'Unknown error')}")
                            
                    except Exception as e:
                        errors.append(f"Error processing dialog {dialog.get('name', 'unknown')}: {e}")
                        
            except Exception as e:
                errors.append(f"Error during bulk sync: {e}")
        
        print(f"🎉 RAG bulk sync completed!")
        print(f"   📊 Total messages processed: {total_processed}")
        print(f"   📁 Chats processed: {chats_processed}")
        if errors:
            print(f"   ⚠️ Errors encountered: {len(errors)}")
            for error in errors[:5]:  # Show first 5 errors
                print(f"     - {error}")
        
    except Exception as e:
        print(f"❌ Critical error in bulk RAG sync: {e}")

@router.get("/stats")
async def get_rag_stats():
    """Get RAG system statistics"""
    try:
        stats = {
            "success": True,
            "collections": {},
            "openai_available": secure_rag_engine.openai_client is not None
        }
        
        if secure_rag_engine.qdrant_client:
            collections = secure_rag_engine.qdrant_client.get_collections()
            for collection in collections.collections:
                info = secure_rag_engine.qdrant_client.get_collection(collection.name)
                stats["collections"][collection.name] = {
                    "points_count": info.points_count,
                    "status": info.status
                }
        else:
            stats["error"] = "Qdrant client not available"
            
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats failed: {str(e)}") 
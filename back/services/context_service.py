import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, Range, MatchValue

class ContextService:
    def __init__(self):
        # Initialize Qdrant for context storage
        self.qdrant_url = os.getenv("QDRANT_URL")
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if self.qdrant_url and self.qdrant_api_key:
            self.qdrant_client = QdrantClient(
                url=self.qdrant_url,
                api_key=self.qdrant_api_key,
            )
            self.enabled = True
        else:
            self.qdrant_client = None
            self.enabled = False
            print("Warning: Context service disabled - Qdrant not configured")
        
        self.collection_name = "chathut_chat_memory"

    async def clear_chat_memory(self, user_id: str, chat_id: str):
        """Clear all memory for a specific chat"""
        if not self.enabled:
            return
            
        try:
            # Delete points matching user_id and chat_id
            await asyncio.to_thread(
                self.qdrant_client.delete,
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=user_id)
                        ),
                        FieldCondition(
                            key="chat_id",
                            match=MatchValue(value=str(chat_id))
                        )
                    ]
                )
            )
            print(f"Cleared memory for user {user_id}, chat {chat_id}")
            
        except Exception as e:
            print(f"Error clearing chat memory: {e}")
            raise

    async def clear_old_memories(self, days: int = 30):
        """Clear memories older than specified days"""
        if not self.enabled:
            return
            
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            cutoff_timestamp = cutoff_date.isoformat()
            
            # Delete old points
            await asyncio.to_thread(
                self.qdrant_client.delete,
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="timestamp",
                            range=Range(lt=cutoff_timestamp)
                        )
                    ]
                )
            )
            print(f"Cleared memories older than {days} days")
            
        except Exception as e:
            print(f"Error clearing old memories: {e}")

    async def get_chat_stats(self, user_id: str, chat_id: str) -> Dict[str, Any]:
        """Get statistics about stored memories for a chat"""
        if not self.enabled:
            return {"enabled": False}
            
        try:
            # Count memories for this chat
            results = await asyncio.to_thread(
                self.qdrant_client.scroll,
                collection_name=self.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=user_id)
                        ),
                        FieldCondition(
                            key="chat_id",
                            match=MatchValue(value=str(chat_id))
                        )
                    ]
                ),
                limit=1000,  # Get up to 1000 to count
                with_payload=True
            )
            
            memories = results[0]  # points
            memory_count = len(memories)
            
            # Analyze memory types
            memory_types = {}
            oldest_memory = None
            newest_memory = None
            
            for memory in memories:
                memory_type = memory.payload.get("type", "unknown")
                memory_types[memory_type] = memory_types.get(memory_type, 0) + 1
                
                timestamp = memory.payload.get("timestamp", "")
                if oldest_memory is None or timestamp < oldest_memory:
                    oldest_memory = timestamp
                if newest_memory is None or timestamp > newest_memory:
                    newest_memory = timestamp
            
            return {
                "enabled": True,
                "total_memories": memory_count,
                "memory_types": memory_types,
                "oldest_memory": oldest_memory,
                "newest_memory": newest_memory,
                "chat_id": str(chat_id),
                "user_id": user_id
            }
            
        except Exception as e:
            print(f"Error getting chat stats: {e}")
            return {"enabled": True, "error": str(e)}

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get overall statistics for a user"""
        if not self.enabled:
            return {"enabled": False}
            
        try:
            # Get all memories for user
            results = await asyncio.to_thread(
                self.qdrant_client.scroll,
                collection_name=self.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=user_id)
                        )
                    ]
                ),
                limit=2000,  # Get up to 2000 memories
                with_payload=True
            )
            
            memories = results[0]  # points
            total_memories = len(memories)
            
            # Count unique chats
            chat_ids = set()
            memory_types = {}
            sources = {}
            
            for memory in memories:
                chat_ids.add(memory.payload.get("chat_id", ""))
                
                memory_type = memory.payload.get("type", "unknown")
                memory_types[memory_type] = memory_types.get(memory_type, 0) + 1
                
                source = memory.payload.get("source", "unknown")
                sources[source] = sources.get(source, 0) + 1
            
            return {
                "enabled": True,
                "total_memories": total_memories,
                "unique_chats": len(chat_ids),
                "memory_types": memory_types,
                "sources": sources,
                "user_id": user_id
            }
            
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {"enabled": True, "error": str(e)} 
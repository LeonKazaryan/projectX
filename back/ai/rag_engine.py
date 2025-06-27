import os
import asyncio
from typing import List, Dict, Optional, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import json
import logging
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)

class TelegramRAGEngine:
    def __init__(self):
        # Qdrant configuration
        self.qdrant_host = os.getenv("QDRANT_HOST", "localhost")
        self.qdrant_port = int(os.getenv("QDRANT_PORT", 6333))
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        # Initialize Qdrant client
        try:
            if self.qdrant_api_key:
                self.qdrant_client = QdrantClient(
                    host=self.qdrant_host,
                    port=self.qdrant_port,
                    api_key=self.qdrant_api_key
                )
            else:
                self.qdrant_client = QdrantClient(
                    host=self.qdrant_host,
                    port=self.qdrant_port
                )
            logger.info("Qdrant client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant client: {e}")
            self.qdrant_client = None
        
        # Initialize embedding model
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            self.embedding_dimension = 384  # all-MiniLM-L6-v2 produces 384-dimensional vectors
            logger.info("Embedding model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            self.embedding_model = None
        
        # Collections for different types of data
        self.collections = {
            "messages": "telegram_messages",
            "conversations": "telegram_conversations",
            "user_profiles": "telegram_user_profiles"
        }
        
        # Flag to track if collections are initialized
        self._collections_initialized = False
    
    async def _ensure_collections_exist(self):
        """Ensure all required Qdrant collections exist"""
        if not self.qdrant_client:
            return
        
        try:
            for collection_name in self.collections.values():
                try:
                    collection_info = self.qdrant_client.get_collection(collection_name)
                    logger.info(f"Collection {collection_name} already exists")
                except Exception:
                    # Collection doesn't exist, create it
                    self.qdrant_client.create_collection(
                        collection_name=collection_name,
                        vectors_config=models.VectorParams(
                            size=self.embedding_dimension,
                            distance=models.Distance.COSINE
                        )
                    )
                    logger.info(f"Created collection {collection_name}")
        except Exception as e:
            logger.error(f"Error ensuring collections exist: {e}")
    
    def _generate_message_id(self, session_id: str, chat_id: int, message_id: int) -> str:
        """Generate unique ID for a message"""
        combined = f"{session_id}:{chat_id}:{message_id}"
        return hashlib.md5(combined.encode()).hexdigest()
    
    def _create_embedding(self, text: str) -> Optional[List[float]]:
        """Create embedding for text"""
        if not self.embedding_model or not text.strip():
            return None
        
        try:
            embedding = self.embedding_model.encode(text, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error creating embedding: {e}")
            return None
    
    async def add_message_to_vector_store(self, session_id: str, chat_id: int, message: Dict) -> bool:
        """Add a message to the vector store for later retrieval"""
        if not self.qdrant_client or not self.embedding_model:
            logger.warning("RAG engine not properly initialized")
            return False
        
        # Ensure collections exist on first use
        if not self._collections_initialized:
            await self._ensure_collections_exist()
            self._collections_initialized = True
        
        try:
            message_text = message.get("text", "")
            if not message_text.strip():
                return False  # Skip empty messages
            
            # Create embedding
            embedding = self._create_embedding(message_text)
            if not embedding:
                return False
            
            # Generate unique ID
            unique_id = self._generate_message_id(session_id, chat_id, message.get("id", 0))
            
            # Prepare payload with metadata
            payload = {
                "session_id": session_id,
                "chat_id": chat_id,
                "message_id": message.get("id", 0),
                "text": message_text,
                "sender_id": message.get("sender_id", 0),
                "is_outgoing": message.get("is_outgoing", False),
                "date": message.get("date", ""),
                "timestamp": datetime.now().isoformat(),
                "text_length": len(message_text),
                "language": self._detect_language_simple(message_text)
            }
            
            # Upsert to Qdrant
            self.qdrant_client.upsert(
                collection_name=self.collections["messages"],
                points=[
                    models.PointStruct(
                        id=unique_id,
                        vector=embedding,
                        payload=payload
                    )
                ]
            )
            
            logger.debug(f"Added message {unique_id} to vector store")
            return True
            
        except Exception as e:
            logger.error(f"Error adding message to vector store: {e}")
            return False
    
    async def find_similar_messages(self, session_id: str, chat_id: int, query_text: str, limit: int = 5, score_threshold: float = 0.7) -> List[Dict]:
        """Find similar messages in the conversation history"""
        if not self.qdrant_client or not self.embedding_model:
            return []
        
        try:
            # Create query embedding
            query_embedding = self._create_embedding(query_text)
            if not query_embedding:
                return []
            
            # Search in Qdrant with filters
            search_results = self.qdrant_client.search(
                collection_name=self.collections["messages"],
                query_vector=query_embedding,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="session_id",
                            match=models.MatchValue(value=session_id)
                        ),
                        models.FieldCondition(
                            key="chat_id",
                            match=models.MatchValue(value=chat_id)
                        )
                    ]
                ),
                limit=limit,
                score_threshold=score_threshold
            )
            
            # Convert results to dict format
            similar_messages = []
            for result in search_results:
                message_data = {
                    "score": result.score,
                    "message": result.payload,
                    "relevance": "high" if result.score > 0.8 else "medium" if result.score > 0.7 else "low"
                }
                similar_messages.append(message_data)
            
            logger.debug(f"Found {len(similar_messages)} similar messages for query")
            return similar_messages
            
        except Exception as e:
            logger.error(f"Error finding similar messages: {e}")
            return []
    
    async def get_conversation_context_with_rag(self, session_id: str, chat_id: int, current_message: str, context_limit: int = 10) -> Dict:
        """Get enhanced conversation context using RAG"""
        try:
            # Get recent messages (regular context)
            recent_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="session_id",
                        match=models.MatchValue(value=session_id)
                    ),
                    models.FieldCondition(
                        key="chat_id",
                        match=models.MatchValue(value=chat_id)
                    )
                ]
            )
            
            # Get recent messages by timestamp
            recent_results = self.qdrant_client.search(
                collection_name=self.collections["messages"],
                query_vector=[0.0] * self.embedding_dimension,  # Dummy vector for metadata search
                query_filter=recent_filter,
                limit=context_limit,
                with_payload=True,
                with_vectors=False
            )
            
            # Sort by timestamp (most recent first)
            recent_messages = sorted(
                [r.payload for r in recent_results],
                key=lambda x: x.get("timestamp", ""),
                reverse=True
            )[:context_limit]
            
            # Find semantically similar messages
            similar_messages = await self.find_similar_messages(
                session_id, chat_id, current_message, limit=5, score_threshold=0.6
            )
            
            return {
                "recent_messages": recent_messages,
                "similar_messages": similar_messages,
                "total_context_items": len(recent_messages) + len(similar_messages),
                "rag_enhanced": True
            }
            
        except Exception as e:
            logger.error(f"Error getting RAG context: {e}")
            return {
                "recent_messages": [],
                "similar_messages": [],
                "total_context_items": 0,
                "rag_enhanced": False,
                "error": str(e)
            }
    
    async def store_user_conversation_pattern(self, session_id: str, user_id: int, pattern_data: Dict):
        """Store user conversation patterns for better suggestions"""
        try:
            if not self.qdrant_client:
                return False
            
            # Create embedding from pattern text
            pattern_text = f"{pattern_data.get('style', '')} {pattern_data.get('topics', '')} {pattern_data.get('vocabulary', '')}"
            embedding = self._create_embedding(pattern_text)
            
            if not embedding:
                return False
            
            unique_id = f"user_pattern_{session_id}_{user_id}"
            
            payload = {
                "session_id": session_id,
                "user_id": user_id,
                "pattern_data": pattern_data,
                "timestamp": datetime.now().isoformat()
            }
            
            self.qdrant_client.upsert(
                collection_name=self.collections["user_profiles"],
                points=[
                    models.PointStruct(
                        id=unique_id,
                        vector=embedding,
                        payload=payload
                    )
                ]
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error storing user pattern: {e}")
            return False
    
    def _detect_language_simple(self, text: str) -> str:
        """Simple language detection"""
        # Check for Cyrillic characters (Russian)
        if any('\u0400' <= char <= '\u04FF' for char in text):
            return "ru"
        # Check for common English words
        elif any(word in text.lower() for word in ["the", "and", "is", "to", "a", "in", "it", "you", "that", "he", "was", "for", "on", "are", "as", "with"]):
            return "en"
        else:
            return "unknown"
    
    async def get_statistics(self) -> Dict:
        """Get RAG engine statistics"""
        try:
            if not self.qdrant_client:
                return {"error": "Qdrant client not available"}
            
            stats = {}
            for name, collection in self.collections.items():
                try:
                    collection_info = self.qdrant_client.get_collection(collection)
                    stats[name] = {
                        "points_count": collection_info.points_count,
                        "vectors_count": collection_info.vectors_count if hasattr(collection_info, 'vectors_count') else collection_info.points_count
                    }
                except Exception as e:
                    stats[name] = {"error": str(e)}
            
            return {
                "collections": stats,
                "embedding_model": "all-MiniLM-L6-v2",
                "embedding_dimension": self.embedding_dimension,
                "status": "healthy"
            }
            
        except Exception as e:
            return {"error": str(e), "status": "unhealthy"}
    
    async def clear_chat_history(self, session_id: str, chat_id: int) -> bool:
        """Clear all messages for a specific chat from vector store"""
        try:
            if not self.qdrant_client:
                return False
            
            # Delete points matching session_id and chat_id
            self.qdrant_client.delete(
                collection_name=self.collections["messages"],
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="session_id",
                                match=models.MatchValue(value=session_id)
                            ),
                            models.FieldCondition(
                                key="chat_id",
                                match=models.MatchValue(value=chat_id)
                            )
                        ]
                    )
                )
            )
            
            logger.info(f"Cleared chat history for session {session_id}, chat {chat_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing chat history: {e}")
            return False

# Global RAG engine instance
rag_engine = TelegramRAGEngine() 
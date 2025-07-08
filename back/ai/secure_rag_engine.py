import os
import asyncio
import hashlib
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from openai import AsyncOpenAI
from qdrant_client import QdrantClient
from qdrant_client.http import models
import json

logger = logging.getLogger(__name__)

class SecureTelegramRAGEngine:
    """Secure RAG engine for Telegram messages using OpenAI embeddings and Qdrant vector storage"""
    
    def __init__(self):
        # OpenAI configuration for embeddings
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if self.openai_api_key:
            try:
                self.openai_client = AsyncOpenAI(api_key=self.openai_api_key)
                logger.info("OpenAI client initialized for embeddings")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                self.openai_client = None
        else:
            logger.warning("OPENAI_API_KEY not found. Embeddings will be disabled.")
            self.openai_client = None
        
        # Qdrant configuration
        self.qdrant_host = os.getenv("QDRANT_HOST", "localhost")
        self.qdrant_port = int(os.getenv("QDRANT_PORT", 6333))
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        # Determine if HTTPS should be used: explicit env flag or default for port 443
        env_https_flag = os.getenv("QDRANT_HTTPS", "auto").lower()
        if env_https_flag == "true":
            self.qdrant_https = True
        elif env_https_flag == "false":
            self.qdrant_https = False
        else:  # auto
            self.qdrant_https = self.qdrant_port == 443
        
        # Initialize Qdrant client
        try:
            if self.qdrant_api_key:
                self.qdrant_client = QdrantClient(
                    host=self.qdrant_host,
                    port=self.qdrant_port,
                    api_key=self.qdrant_api_key,
                    https=self.qdrant_https
                )
            else:
                self.qdrant_client = QdrantClient(
                    host=self.qdrant_host,
                    port=self.qdrant_port,
                    https=self.qdrant_https
                )
            logger.info("Qdrant client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant client: {e}")
            self.qdrant_client = None
        
        # OpenAI text-embedding-3-small produces 1536-dimensional vectors
        self.embedding_dimension = 1536
        self.embedding_model = "text-embedding-3-small"
        
        # Security settings
        self.max_text_length = 8000  # OpenAI embeddings limit
        self.retention_days = int(os.getenv("DATA_RETENTION_DAYS", "30"))
        
        # Collections for different types of data
        self.collections = {
            "messages": "secure_telegram_messages",
            "conversations": "secure_telegram_conversations", 
            "user_patterns": "secure_user_patterns"
        }
        
        # Flag to track if collections are initialized
        self._collections_initialized = False
    
    async def _ensure_collections_exist(self):
        """Ensure all required Qdrant collections exist with proper configuration"""
        if not self.qdrant_client:
            return
        
        try:
            for collection_name in self.collections.values():
                try:
                    collection_info = self.qdrant_client.get_collection(collection_name)
                    logger.info(f"Collection {collection_name} already exists")

                    # Ensure required payload indexes exist
                    self._ensure_payload_indexes(collection_name)
                except Exception:
                    # Collection doesn't exist, create it
                    self.qdrant_client.create_collection(
                        collection_name=collection_name,
                        vectors_config=models.VectorParams(
                            size=self.embedding_dimension,
                            distance=models.Distance.COSINE
                        ),
                        # Enable indexing for better performance
                        hnsw_config=models.HnswConfigDiff(
                            m=16,
                            ef_construct=100,
                            full_scan_threshold=10000
                        ),
                        # Add quantization for memory efficiency
                        quantization_config=models.ScalarQuantization(
                            scalar=models.ScalarQuantizationConfig(
                                type=models.ScalarType.INT8,
                                quantile=0.99,
                                always_ram=True
                            )
                        )
                    )
                    logger.info(f"Created collection {collection_name} with optimized settings")

                    # After creation, add payload indexes
                    self._ensure_payload_indexes(collection_name)
        except Exception as e:
            logger.error(f"Error ensuring collections exist: {e}")

    def _ensure_payload_indexes(self, collection_name: str):
        """Create payload indexes for fields used in filters if they are missing."""
        if not self.qdrant_client:
            return

        indexes = [
            ("session_id", models.PayloadSchemaType.KEYWORD),
            ("chat_id", models.PayloadSchemaType.INTEGER)
        ]

        for field_name, field_type in indexes:
            try:
                self.qdrant_client.create_payload_index(
                    collection_name=collection_name,
                    field_name=field_name,
                    field_schema=models.PayloadSchemaType(field_type)
                )
                logger.info(f"Created payload index {field_name} on {collection_name}")
            except Exception as e:
                # If index already exists, ignore
                if "already exists" in str(e):
                    pass
                else:
                    logger.warning(f"Could not create index for {field_name} on {collection_name}: {e}")
    
    def _generate_secure_message_id(self, session_id: str, chat_id: int, message_id: int, timestamp: str) -> str:
        """Generate secure, unique ID for a message as UUID"""
        import uuid
        combined = f"{session_id}:{chat_id}:{message_id}:{timestamp}"
        # Create a consistent UUID from the hash
        hash_bytes = hashlib.sha256(combined.encode()).digest()[:16]  # Take first 16 bytes
        return str(uuid.UUID(bytes=hash_bytes))
    
    def _hash_text_content(self, text: str) -> str:
        """Create hash of text content for deduplication without storing raw text"""
        return hashlib.sha256(text.encode()).hexdigest()
    
    async def _create_openai_embedding(self, text: str) -> Optional[List[float]]:
        """Create embedding using OpenAI API"""
        if not self.openai_client or not text.strip():
            return None
        
        try:
            # Truncate text if too long
            if len(text) > self.max_text_length:
                text = text[:self.max_text_length]
            
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text,
                encoding_format="float"
            )
            
            embedding = response.data[0].embedding
            logger.debug(f"Created OpenAI embedding: {len(embedding)} dimensions")
            return embedding
            
        except Exception as e:
            logger.error(f"Error creating OpenAI embedding: {e}")
            return None
    
    def _extract_safe_metadata(self, message: Dict) -> Dict:
        """Extract only safe metadata, excluding raw message text"""
        safe_metadata = {
            "session_id": message.get("session_id", ""),
            "chat_id": int(message.get("chat_id", 0)),
            "message_id": int(message.get("id", message.get("message_id", 0))),
            "sender_id": int(message.get("sender_id", 0)),
            "is_outgoing": bool(message.get("is_outgoing", False)),
            "date": message.get("date", ""),
            "timestamp": datetime.now().isoformat(),
            "text_length": len(message.get("text", "")),
            "text_hash": self._hash_text_content(message.get("text", "")),
            "language": self._detect_language_simple(message.get("text", "")),
            "has_media": bool(message.get("media")),
            "is_reply": bool(message.get("reply_to_msg_id")),
            "retention_expires": (datetime.now() + timedelta(days=self.retention_days)).isoformat()
        }
        
        # Add sender name if available (without exposing private data)
        if message.get("sender_name"):
            safe_metadata["sender_name_hash"] = hashlib.md5(
                message["sender_name"].encode()
            ).hexdigest()[:8]
        
        return safe_metadata
    
    async def store_message_securely(self, session_id: str, chat_id: int, message: Dict) -> bool:
        """Store message with embeddings while maintaining security and privacy"""
        if not self.qdrant_client:
            logger.warning("Qdrant client not available")
            return False
        
        if not self.openai_client:
            logger.warning("OpenAI client not available - cannot create embeddings")
            return False
        
        # Ensure collections exist on first use
        if not self._collections_initialized:
            await self._ensure_collections_exist()
            self._collections_initialized = True
        
        try:
            message_text = message.get("text", "")
            if not message_text.strip() or len(message_text) < 3:
                return False  # Skip empty or very short messages
            
            # Create embedding from text
            embedding = await self._create_openai_embedding(message_text)
            if not embedding:
                logger.warning("Failed to create embedding for message")
                return False
            
            # Generate secure unique ID
            unique_id = self._generate_secure_message_id(
                session_id, 
                chat_id, 
                message.get("id", 0),
                message.get("date", "")
            )
            
            # Extract only safe metadata (NO RAW TEXT STORED)
            message_copy = {**message, "session_id": session_id, "chat_id": chat_id}
            safe_payload = self._extract_safe_metadata(message_copy)
            
            # Store in Qdrant with embedding
            self.qdrant_client.upsert(
                collection_name=self.collections["messages"],
                points=[
                    models.PointStruct(
                        id=unique_id,
                        vector=embedding,
                        payload=safe_payload
                    )
                ]
            )
            
            logger.debug(f"Securely stored message {unique_id} (text hash: {safe_payload['text_hash'][:8]})")
            return True
            
        except Exception as e:
            logger.error(f"Error storing message securely: {e}")
            return False
    
    async def find_similar_messages_secure(
        self, 
        session_id: str, 
        chat_id: int, 
        query_text: str, 
        limit: int = 5,
        score_threshold: float = 0.7,
        include_other_chats: bool = False
    ) -> List[Dict]:
        """Find similar messages using semantic search (without exposing raw text)"""
        if not self.qdrant_client:
            logger.warning("Qdrant client not available")
            return []
        
        if not self.openai_client:
            logger.warning("OpenAI client not available - cannot create query embeddings")
            return []
        
        try:
            # Create query embedding
            query_embedding = await self._create_openai_embedding(query_text)
            if not query_embedding:
                return []
            
            # Build filters
            must_conditions = [
                models.FieldCondition(
                    key="session_id",
                    match=models.MatchValue(value=session_id)
                )
            ]
            
            if not include_other_chats:
                must_conditions.append(
                    models.FieldCondition(
                        key="chat_id",
                        match=models.MatchValue(value=chat_id)
                    )
                )
            
            # Ensure collections exist on first search
            if not self._collections_initialized:
                await self._ensure_collections_exist()
                self._collections_initialized = True

            # Search in Qdrant
            search_results = self.qdrant_client.search(
                collection_name=self.collections["messages"],
                query_vector=query_embedding,
                query_filter=models.Filter(must=must_conditions),
                limit=limit,
                score_threshold=score_threshold,
                with_payload=True,
                with_vectors=False  # Don't return embeddings to save bandwidth
            )
            
            # Convert results to secure format
            similar_messages = []
            for result in search_results:
                message_data = {
                    "score": result.score,
                    "relevance": "high" if result.score > 0.85 else "medium" if result.score > 0.75 else "low",
                    "metadata": result.payload,
                    # Create safe preview without exposing full text
                    "context_hint": f"Message from {result.payload.get('date', 'unknown')} ({result.payload.get('text_length', 0)} chars)"
                }
                similar_messages.append(message_data)
            
            logger.debug(f"Found {len(similar_messages)} similar messages (secure search)")
            return similar_messages
            
        except Exception as e:
            logger.error(f"Error in secure similarity search: {e}")
            return []
    
    async def get_enhanced_context_secure(
        self, 
        session_id: str, 
        chat_id: int, 
        current_message: str, 
        context_limit: int = 10
    ) -> Dict:
        """Get enhanced conversation context using secure RAG"""
        try:
            # Ensure collections exist before scroll/search
            if not self._collections_initialized:
                await self._ensure_collections_exist()
                self._collections_initialized = True

            # Get recent messages by metadata search
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
            
            # Get recent messages (without using embeddings for this query)
            recent_results = self.qdrant_client.scroll(
                collection_name=self.collections["messages"],
                scroll_filter=recent_filter,
                limit=context_limit,
                with_payload=True,
                with_vectors=False
            )
            
            # Sort by timestamp (most recent first)
            recent_messages = sorted(
                [r.payload for r in recent_results[0]],  # scroll returns (records, next_page_offset)
                key=lambda x: x.get("timestamp", ""),
                reverse=True
            )[:context_limit]
            
            # Find semantically similar messages if current message provided
            similar_messages = []
            if current_message.strip():
                similar_messages = await self.find_similar_messages_secure(
                    session_id, chat_id, current_message, limit=5, score_threshold=0.65
                )
            
            return {
                "recent_messages_metadata": recent_messages,
                "similar_messages": similar_messages,
                "total_context_items": len(recent_messages) + len(similar_messages),
                "rag_enhanced": True,
                "security_note": "Raw message text not stored or returned for privacy"
            }
            
        except Exception as e:
            logger.error(f"Error getting enhanced secure context: {e}")
            return {
                "recent_messages_metadata": [],
                "similar_messages": [],
                "total_context_items": 0,
                "rag_enhanced": False,
                "error": str(e)
            }
    
    async def cleanup_expired_messages(self) -> int:
        """Clean up messages that have exceeded retention period"""
        if not self.qdrant_client:
            return 0
        
        try:
            current_time = datetime.now().isoformat()
            
            # Find expired messages
            expired_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="retention_expires",
                        range=models.Range(lt=current_time)
                    )
                ]
            )
            
            # Scroll through expired messages
            expired_results = self.qdrant_client.scroll(
                collection_name=self.collections["messages"],
                scroll_filter=expired_filter,
                limit=1000,  # Process in batches
                with_payload=False,  # We only need IDs
                with_vectors=False
            )
            
            expired_ids = [r.id for r in expired_results[0]]
            
            if expired_ids:
                # Delete expired messages
                self.qdrant_client.delete(
                    collection_name=self.collections["messages"],
                    points_selector=models.PointIdsList(points=expired_ids)
                )
                
                logger.info(f"Cleaned up {len(expired_ids)} expired messages")
                return len(expired_ids)
            
            return 0
            
        except Exception as e:
            logger.error(f"Error cleaning up expired messages: {e}")
            return 0
    
    def _detect_language_simple(self, text: str) -> str:
        """Simple language detection"""
        if any('\u0400' <= char <= '\u04FF' for char in text):
            return "ru"
        elif any(word in text.lower() for word in ["the", "and", "is", "to", "a", "in", "it", "you", "that"]):
            return "en"
        else:
            return "unknown"
    
    async def get_collection_stats(self) -> Dict:
        """Get secure statistics about stored data"""
        try:
            if not self.qdrant_client:
                return {"error": "Qdrant client not available"}
            
            stats = {}
            for name, collection in self.collections.items():
                try:
                    collection_info = self.qdrant_client.get_collection(collection)
                    stats[name] = {
                        "points_count": collection_info.points_count,
                        "vectors_count": collection_info.vectors_count if hasattr(collection_info, 'vectors_count') else collection_info.points_count,
                        "indexed_vectors_count": getattr(collection_info, 'indexed_vectors_count', 0)
                    }
                except Exception as e:
                    stats[name] = {"error": str(e)}
            
            return {
                "collections": stats,
                "embedding_model": self.embedding_model,
                "embedding_dimension": self.embedding_dimension,
                "retention_days": self.retention_days,
                "status": "healthy",
                "security_mode": "enabled",
                "raw_text_storage": "disabled"
            }
            
        except Exception as e:
            return {"error": str(e), "status": "unhealthy"}
    
    async def clear_chat_data_secure(self, session_id: str, chat_id: int) -> bool:
        """Securely clear all data for a specific chat"""
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
            
            logger.info(f"Securely cleared chat data for session {session_id}, chat {chat_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing chat data: {e}")
            return False

# Global secure RAG engine instance
secure_rag_engine = SecureTelegramRAGEngine() 
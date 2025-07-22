import os
import asyncio
import hashlib
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from qdrant_client import QdrantClient
from qdrant_client.http import models
import json

# Import our Gemini client instead of OpenAI
from .gemini_client import gemini_client

logger = logging.getLogger(__name__)

class SecureTelegramRAGEngine:
    """Secure RAG engine for Telegram messages using Gemini embeddings and Qdrant vector storage"""
    
    def __init__(self):
        # Gemini configuration for embeddings
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        if self.gemini_api_key:
            # Use our gemini_client singleton
            self.ai_client = gemini_client
            if self.ai_client.client:
                logger.info("Gemini client initialized for embeddings")
            else:
                logger.error("Failed to initialize Gemini client")
                self.ai_client = None
        else:
            logger.warning("GEMINI_API_KEY not found. Embeddings will be disabled.")
            self.ai_client = None
        
        # Qdrant configuration
        qdrant_url = os.getenv("QDRANT_URL")
        if qdrant_url:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(qdrant_url)
                self.qdrant_host = parsed.hostname or "localhost"
                self.qdrant_port = parsed.port or (443 if parsed.scheme == "https" else 6333)
                # path like /v1 ignored by client, only host/port
            except Exception as e:
                logger.warning(f"Failed to parse QDRANT_URL: {e}")
                self.qdrant_host = os.getenv("QDRANT_HOST", "localhost")
                self.qdrant_port = int(os.getenv("QDRANT_PORT", 6333))
        else:
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
        
        # Gemini embedding dimensions
        self.embedding_dimension = 768  # Gemini embedding-001 produces 768-dimensional vectors
        self.embedding_model = "embedding-001"
        
        # Security settings
        self.max_text_length = 8000  # Gemini embeddings limit
        self.retention_days = int(os.getenv("DATA_RETENTION_DAYS", "30"))
        
        # Collections for different types of data
        self.collections = {
            "messages": "secure_telegram_messages",
            "conversations": "secure_telegram_conversations", 
            "user_patterns": "secure_user_patterns",
            "summaries": "secure_telegram_summaries"  # NEW collection for summary chunks
        }
        
        # Flag to track if collections are initialized
        self._collections_initialized = False
        # Message counters per (session_id, chat_id) for summarizer trigger
        self._msg_counters: Dict[str, int] = {}
    
    async def _ensure_collections_exist(self):
        """Create collections if they don't exist"""
        if not self.qdrant_client or self._collections_initialized:
            return
        
        try:
            for collection_type, collection_name in self.collections.items():
                try:
                    await asyncio.to_thread(
                        self.qdrant_client.get_collection, collection_name
                    )
                    logger.info(f"Collection {collection_name} already exists")
                    
                    # Check if indexes exist for messages collection
                    if collection_type == "messages":
                        await self._ensure_message_indexes(collection_name)
                        
                except Exception:
                    # Collection doesn't exist, create it
                    await asyncio.to_thread(
                        self.qdrant_client.create_collection,
                        collection_name=collection_name,
                        vectors_config=models.VectorParams(
                            size=self.embedding_dimension,
                            distance=models.Distance.COSINE
                        )
                    )
                    
                    # Create indexes for faster filtering
                    if collection_type == "messages":
                        await self._create_message_indexes(collection_name)
                    
                    logger.info(f"Created collection {collection_name} with indexes")
            
            self._collections_initialized = True
            logger.info("All collections and indexes are ready")
            
        except Exception as e:
            logger.error(f"Error ensuring collections exist: {e}")
            self._collections_initialized = False
    
    async def _ensure_message_indexes(self, collection_name: str):
        """Ensure all required indexes exist for messages collection"""
        try:
            # Check existing indexes using the correct API
            collection_info = await asyncio.to_thread(
                self.qdrant_client.get_collection, collection_name
            )
            
            # Try different ways to get indexes info
            existing_indexes = set()
            if hasattr(collection_info, 'payload_indexes'):
                existing_indexes = {idx.field_name for idx in collection_info.payload_indexes}
            elif hasattr(collection_info, 'payload_index'):
                existing_indexes = {idx.field_name for idx in collection_info.payload_index}
            else:
                # If we can't get indexes info, assume they don't exist and create them
                logger.warning(f"Could not get indexes info for {collection_name}, creating all indexes")
                await self._create_message_indexes(collection_name)
                return
            
            # Create missing indexes
            required_indexes = {
                "session_id": models.PayloadSchemaType.KEYWORD,
                "chat_id": models.PayloadSchemaType.INTEGER,
                "day_bucket": models.PayloadSchemaType.KEYWORD,
                "is_outgoing": models.PayloadSchemaType.BOOL
            }
            
            for field_name, field_type in required_indexes.items():
                if field_name not in existing_indexes:
                    await asyncio.to_thread(
                        self.qdrant_client.create_payload_index,
                        collection_name=collection_name,
                        field_name=field_name,
                        field_schema=field_type
                    )
                    logger.info(f"Created index for {field_name} in {collection_name}")
                    
        except Exception as e:
            logger.warning(f"Could not ensure indexes for {collection_name}: {e}")
            # Try to create all indexes as fallback
            try:
                await self._create_message_indexes(collection_name)
            except Exception as e2:
                logger.error(f"Failed to create indexes as fallback: {e2}")
    
    async def _create_message_indexes(self, collection_name: str):
        """Create all required indexes for messages collection"""
        try:
            indexes = [
                ("session_id", models.PayloadSchemaType.KEYWORD),
                ("chat_id", models.PayloadSchemaType.INTEGER),
                ("day_bucket", models.PayloadSchemaType.KEYWORD),
                ("is_outgoing", models.PayloadSchemaType.BOOL)
            ]
            
            for field_name, field_type in indexes:
                await asyncio.to_thread(
                    self.qdrant_client.create_payload_index,
                    collection_name=collection_name,
                    field_name=field_name,
                    field_schema=field_type
                )
                logger.info(f"Created index for {field_name} in {collection_name}")
                
        except Exception as e:
            logger.error(f"Error creating indexes for {collection_name}: {e}")

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
        """Generate SHA-256 hash of text content for deduplication"""
        return hashlib.sha256(text.encode()).hexdigest()
    
    def _generate_point_id(self, session_id: str, chat_id: int, message_id: int) -> str:
        """Generate unique point ID for Qdrant using UUID"""
        import uuid
        combined = f"{session_id}_{chat_id}_{message_id}"
        # Generate deterministic UUID based on the combined string
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, combined))
    
    async def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using Gemini"""
        if not self.ai_client or not text.strip():
            return None
        
        try:
            # Truncate text if too long
            if len(text) > self.max_text_length:
                text = text[:self.max_text_length]
            
            # Use Gemini embeddings directly
            import google.generativeai as genai
            
            result = genai.embed_content(
                model=self.embedding_model,
                content=text,
                task_type="semantic_similarity"
            )
            
            if result and 'embedding' in result:
                return result['embedding']
            else:
                logger.warning(f"No embedding returned for text: {text[:50]}...")
                return None
                
        except Exception as e:
            logger.error(f"Error creating embedding with Gemini: {e}")
            return None
    
    def _extract_safe_metadata(self, message: Dict) -> Dict:
        """Extract safe metadata from message for storage"""
        try:
            # Parse date - handle different formats
            date_str = message.get("date", "")
            msg_date = datetime.now()  # Default fallback
            
            if date_str:
                if "+" in date_str and "T" not in date_str:
                    # Custom format like "41+00:00"
                    try:
                        minutes, time_part = date_str.split("+")
                        minutes_ago = int(minutes)
                        msg_date = datetime.now() - timedelta(minutes=minutes_ago)
                    except (ValueError, IndexError):
                        # If parsing fails, use current time
                        msg_date = datetime.now()
                elif "T" in date_str:
                    # ISO format like "2025-07-21T16:34:14"
                    try:
                        # Remove timezone info if present
                        clean_date = date_str.split("+")[0].split("Z")[0]
                        msg_date = datetime.fromisoformat(clean_date)
                    except ValueError:
                        msg_date = datetime.now()
                else:
                    # Try to parse as ISO format
                    try:
                        msg_date = datetime.fromisoformat(date_str)
                    except ValueError:
                        msg_date = datetime.now()

            # Format date for day_bucket
            day_bucket = msg_date.strftime("%Y-%m-%d")
            
            return {
                "message_id": message.get("id", 0),
                "is_outgoing": message.get("is_outgoing", False),
                "date": msg_date.isoformat(),
                "day_bucket": day_bucket,  # For time-based queries
                "sender_name": message.get("sender_name", ""),
                "sender_id": message.get("sender_id", 0),
                "text_hash": self._hash_text_content(message.get("text", ""))
            }
        except Exception as e:
            logger.error(f"Error extracting metadata: {e}")
            # Fallback to basic metadata
            return {
                "message_id": message.get("id", 0),
                "is_outgoing": message.get("is_outgoing", False),
                "date": datetime.now().isoformat(),
                "day_bucket": datetime.now().strftime("%Y-%m-%d"),
                "text_hash": self._hash_text_content(message.get("text", ""))
            }
    
    async def store_message_securely(self, session_id: str, chat_id: int, message: Dict) -> bool:
        """Store a message securely in the vector database"""
        if not self.qdrant_client or not self.ai_client:
            logger.warning("Qdrant or AI client not available")
            return False
        
        try:
            # Ensure collections exist
            await self._ensure_collections_exist()
            
            message_text = message.get("text", "").strip()
            if not message_text or len(message_text) < 3:
                logger.debug(f"Skipping empty or short message: '{message_text}'")
                return False
            
            logger.debug(f"Storing message: session_id={session_id}, chat_id={chat_id}, text='{message_text[:50]}...'")
            
            # Create embedding from text
            embedding = await self._generate_embedding(message_text)
            if not embedding:
                logger.warning("Failed to create embedding for message")
                return False
            
            logger.debug(f"Generated embedding with {len(embedding)} dimensions")
            
            # Extract metadata safely
            safe_metadata = self._extract_safe_metadata(message)
            safe_metadata.update({
                "session_id": session_id,
                "chat_id": chat_id,
                "text": message_text,  # Store text for AI context
                "text_hash": self._hash_text_content(message_text)  # Keep hash for deduplication
            })
            
            logger.debug(f"Extracted metadata: {safe_metadata}")
            
            # Generate unique point ID
            point_id = self._generate_point_id(session_id, chat_id, safe_metadata["message_id"])
            
            # Store in vector database
            await asyncio.to_thread(
                self.qdrant_client.upsert,
                collection_name=self.collections["messages"],
                points=[
                    models.PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload=safe_metadata
                    )
                ]
            )
            
            logger.debug(f"Successfully stored message with point_id={point_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing message: {e}")
            return False
    
    async def find_similar_messages_secure(
        self, 
        session_id: str, 
        chat_id: int, 
        query_text: str, 
        limit: int = 5,
        score_threshold: float = 0.7,
        include_other_chats: bool = False,
        day_buckets: List[str] | None = None
    ) -> List[Dict]:
        """Find similar messages using semantic search (without exposing raw text)"""
        if not self.qdrant_client:
            logger.warning("Qdrant client not available")
            return []
        
        if not self.ai_client:
            logger.warning("Gemini client not available - cannot create query embeddings")
            return []
        
        try:
            # Create query embedding
            query_embedding = await self._generate_embedding(query_text)
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
            if day_buckets:
                must_conditions.append(
                    models.FieldCondition(key="day_bucket", match=models.MatchAny(any=day_buckets))
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
                    # Include text for AI context
                    "text": result.payload.get("text", ""),
                    "is_outgoing": result.payload.get("is_outgoing", False),
                    "date": result.payload.get("date", ""),
                    "sender_name": result.payload.get("sender_name", ""),
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
                key=lambda x: x.get("date", ""),
                reverse=True
            )[:context_limit]
            
            # Convert to proper message format
            formatted_recent_messages = []
            for msg in recent_messages:
                formatted_recent_messages.append({
                    "id": msg.get("message_id", 0),
                    "text": msg.get("text", ""),
                    "date": msg.get("date", ""),
                    "is_outgoing": msg.get("is_outgoing", False),
                    "sender_name": msg.get("sender_name", ""),
                    "sender_id": msg.get("sender_id", 0)
                })
            
            # Find semantically similar messages if current message provided
            similar_messages = []
            if current_message.strip():
                similar_messages = await self.find_similar_messages_secure(
                    session_id, chat_id, current_message, limit=5, score_threshold=0.65
                )
            
            return {
                "recent_messages": formatted_recent_messages,
                "similar_messages": similar_messages,
                "total_context_items": len(formatted_recent_messages) + len(similar_messages),
                "rag_enhanced": True
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

    async def _generate_and_store_summary(self, session_id: str, chat_id: int):
        """Generate summary for last 40 messages and store as chunk"""
        try:
            # Get last 40 messages payloads (no raw text) for context only
            recent = await self.get_enhanced_context_secure(session_id, chat_id, "", context_limit=40)
            msgs = recent.get("recent_messages", [])
            if not msgs:
                return
            # Reconstruct pseudo transcript for AI summary
            lines = []
            for msg in msgs:
                who = "Вы" if msg.get("is_outgoing") else "Контакт"
                text = msg.get("text", "")[:120].replace("\n", " ")
                lines.append(f"{who}: {text}")
            transcript = "\n".join(lines)
            prompt = f"Суммаризируй следующий фрагмент переписки кратко, укажи темы, эмоции, даты: \n{transcript}\n\nКраткая сводка:"
            summary_text = await self.ai_client.generate_text(prompt=prompt, max_tokens=200, temperature=0.3)
            if not summary_text:
                return
            # Create embedding for summary
            embedding = await self._generate_embedding(summary_text)
            if not embedding:
                return
            chunk_id = hashlib.sha1(f"{session_id}:{chat_id}:{datetime.now().isoformat()}".encode()).hexdigest()
            payload = {
                "session_id": session_id,
                "chat_id": chat_id,
                "timestamp": datetime.now().isoformat(),
                "day_bucket": datetime.now().strftime("%Y-%m-%d"),
                "chunk_length": len(msgs),
                "summary_chars": len(summary_text),
                "summary": summary_text,
                "start_ts": msgs[-1].get("timestamp") if msgs else None,
                "end_ts": msgs[0].get("timestamp") if msgs else None,
            }
            self.qdrant_client.upsert(
                collection_name=self.collections["summaries"],
                points=[models.PointStruct(id=chunk_id, vector=embedding, payload=payload)]
            )
            logger.info(f"Stored summary chunk for chat {chat_id} ({len(summary_text)} chars)")
        except Exception as e:
            logger.error(f"Failed to generate/store summary: {e}")

    async def find_similar_chunks(self, session_id: str, chat_id: int, query_text: str, limit: int = 3) -> List[Dict]:
        """Find relevant summary chunks for query"""
        if not self.qdrant_client or not self.ai_client:
            return []
        try:
            query_emb = await self._generate_embedding(query_text)
            if not query_emb:
                return []
            results = self.qdrant_client.search(
                collection_name=self.collections["summaries"],
                query_vector=query_emb,
                query_filter=models.Filter(must=[
                    models.FieldCondition(key="session_id", match=models.MatchValue(value=session_id)),
                    models.FieldCondition(key="chat_id", match=models.MatchValue(value=chat_id)),
                ]),
                limit=limit,
                score_threshold=0.2,
                with_payload=True,
                with_vectors=False,
            )
            chunks = [
                {"score": r.score, "payload": r.payload} for r in results
            ]
            return chunks
        except Exception as e:
            logger.error(f"Error searching summary chunks: {e}")
            return []

    async def get_messages_for_period(
        self,
        session_id: str,
        chat_id: int,
        dates: List[datetime.date],
        limit: int = 1000
    ) -> List[Dict]:
        """Получить сообщения за указанный период с учетом безопасности"""
        if not self.qdrant_client:
            return []

        try:
            # Ensure collections exist
            await self._ensure_collections_exist()
            
            # Convert dates to day_buckets
            day_buckets = [d.strftime("%Y-%m-%d") for d in dates]
            
            # Try to use Qdrant filtering first
            try:
                search_filter = models.Filter(
                    must=[
                        models.FieldCondition(
                            key="session_id",
                            match=models.MatchValue(value=session_id)
                        ),
                        models.FieldCondition(
                            key="chat_id",
                            match=models.MatchValue(value=chat_id)
                        ),
                        models.FieldCondition(
                            key="day_bucket",
                            match=models.MatchAny(any=day_buckets)
                        )
                    ]
                )
                
                # Search with Qdrant filtering
                search_result = await asyncio.to_thread(
                    self.qdrant_client.scroll,
                    collection_name=self.collections["messages"],
                    scroll_filter=search_filter,
                    limit=limit,
                    with_payload=True,
                    with_vectors=False
                )
                
                messages = []
                for point in search_result[0]:
                    if point.payload:
                        messages.append({
                            "id": point.payload.get("message_id", 0),
                            "text": point.payload.get("text", ""),  # Get text from payload
                            "date": point.payload.get("date", ""),
                            "is_outgoing": point.payload.get("is_outgoing", False),
                            "sender_name": point.payload.get("sender_name", ""),
                            "sender_id": point.payload.get("sender_id", 0)
                        })
                
                logger.info(f"Found {len(messages)} messages for period {day_buckets} using Qdrant filtering")
                return messages
                
            except Exception as e:
                logger.warning(f"Qdrant filtering failed, falling back to Python filtering: {e}")
                
                # Fallback: get all messages and filter in Python
                search_filter = models.Filter(
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
                
                search_result = await asyncio.to_thread(
                    self.qdrant_client.scroll,
                    collection_name=self.collections["messages"],
                    scroll_filter=search_filter,
                    limit=limit,
                    with_payload=True,
                    with_vectors=False
                )
                
                messages = []
                for point in search_result[0]:
                    if point.payload:
                        # Filter by date in Python
                        try:
                            msg_date = datetime.fromisoformat(point.payload.get("date", ""))
                            if msg_date.date() in dates:
                                messages.append({
                                    "id": point.payload.get("message_id", 0),
                                    "text": point.payload.get("text", ""),  # Get text from payload
                                    "date": point.payload.get("date", ""),
                                    "is_outgoing": point.payload.get("is_outgoing", False),
                                    "sender_name": point.payload.get("sender_name", ""),
                                    "sender_id": point.payload.get("sender_id", 0)
                                })
                        except (ValueError, TypeError):
                            continue
                
                logger.info(f"Found {len(messages)} messages for period {day_buckets} using Python filtering")
                return messages
            
        except Exception as e:
            logger.error(f"Error getting messages for period: {e}")
            return []

    async def get_period_summary(
        self,
        session_id: str,
        chat_id: int,
        dates: List[datetime.date],
        max_chunks: int = 3
    ) -> Optional[str]:
        """Получить или сгенерировать summary для указанного периода"""
        try:
            # 1. Сначала ищем существующие summary chunks за этот период
            day_buckets = [d.strftime("%Y-%m-%d") for d in dates]
            existing_summaries = await self.find_similar_chunks(
                session_id=session_id,
                chat_id=chat_id,
                query_text=" ".join(day_buckets),  # Используем даты как запрос
                limit=max_chunks
            )

            if existing_summaries:
                # Если нашли существующие summary - используем их
                summaries = [s["payload"].get("summary", "") for s in existing_summaries if s["payload"].get("summary")]
                if summaries:
                    return "\n---\n".join(summaries)

            # 2. Если нет существующих summary - генерируем новый
            messages = await self.get_messages_for_period(session_id, chat_id, dates)
            if not messages:
                return None

            # Группируем сообщения по дням для лучшей суммаризации
            days_groups = {}
            for msg in messages:
                day = msg.get("day_bucket", "unknown")
                if day not in days_groups:
                    days_groups[day] = []
                days_groups[day].append(msg)

            # Генерируем summary для каждого дня
            day_summaries = []
            for day, day_messages in days_groups.items():
                if not day_messages:
                    continue

                # Создаем контекст для суммаризации
                lines = []
                for msg in day_messages:
                    who = "Вы" if msg.get("is_outgoing") else "Контакт"
                    text = msg.get("text", "")[:120].replace("\n", " ")
                    lines.append(f"{who}: {text}")
                
                transcript = "\n".join(lines)
                prompt = f"Суммаризируй следующий фрагмент переписки за {day}. Выдели главные темы, важные моменты и эмоциональный контекст:\n\n{transcript}\n\nКраткая сводка:"
                
                day_summary = await self.ai_client.generate_text(
                    prompt=prompt,
                    max_tokens=200,
                    temperature=0.3
                )
                if day_summary:
                    day_summaries.append(f"[{day}]: {day_summary.strip()}")

            if day_summaries:
                final_summary = "\n---\n".join(day_summaries)
                # Сохраняем summary как новый chunk для будущего использования
                await self._store_period_summary(
                    session_id=session_id,
                    chat_id=chat_id,
                    dates=dates,
                    summary_text=final_summary
                )
                return final_summary

            return None

        except Exception as e:
            logger.error(f"Error generating period summary: {e}")
            return None

    async def _store_period_summary(
        self,
        session_id: str,
        chat_id: int,
        dates: List[datetime.date],
        summary_text: str
    ) -> bool:
        """Store summary for a period"""
        if not self.qdrant_client or not self.ai_client:
            return False
        
        try:
            # Ensure collections exist
            await self._ensure_collections_exist()
            
            # Create embedding for summary
            embedding = await self._generate_embedding(summary_text)
            if not embedding:
                return False
            
            # Generate unique ID for summary
            import uuid
            period_str = "_".join([d.strftime("%Y-%m-%d") for d in dates])
            summary_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{session_id}_{chat_id}_{period_str}"))
            
            # Store in summaries collection
            await asyncio.to_thread(
                self.qdrant_client.upsert,
                collection_name=self.collections["summaries"],
                points=[
                    models.PointStruct(
                        id=summary_id,
                        vector=embedding,
                        payload={
                            "session_id": session_id,
                            "chat_id": chat_id,
                            "period_dates": [d.isoformat() for d in dates],
                            "summary": summary_text,
                            "created_at": datetime.now().isoformat()
                        }
                    )
                ]
            )
            
            logger.info(f"Stored period summary with ID {summary_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing period summary: {e}")
            return False

    async def sync_chat_history(
        self,
        session_id: str,
        chat_id: int,
        messages: List[Dict],
        force_resync: bool = False
    ) -> bool:
        """Синхронизировать историю чата с RAG и сгенерировать summary по периодам"""
        try:
            # Если не форсируем — проверяем, есть ли уже сообщения за последние 30 дней
            if not force_resync:
                existing = await self.get_messages_for_period(
                    session_id, chat_id,
                    dates=[datetime.now().date() - timedelta(days=x) for x in range(30)]
                )
                if existing and len(existing) > 0:
                    return True  # История уже есть

            # Сохраняем каждое сообщение
            for msg in messages:
                # Добавляем session_id и chat_id если их нет
                msg["session_id"] = session_id
                msg["chat_id"] = chat_id
                
                # Сохраняем сообщение
                await self.store_message_securely(session_id, chat_id, msg)

            # Группируем сообщения по дням для генерации summary
            days_with_messages = set()
            for msg in messages:
                # Use the same date parsing logic as _extract_safe_metadata
                metadata = self._extract_safe_metadata(msg)
                try:
                    msg_date = datetime.fromisoformat(metadata["date"])
                    days_with_messages.add(msg_date.date())
                except ValueError:
                    # Skip messages with invalid dates
                    continue

            # Генерируем summary для каждой недели, где есть сообщения
            weeks = {}
            for day in days_with_messages:
                week_start = day - timedelta(days=day.weekday())
                if week_start not in weeks:
                    weeks[week_start] = []
                weeks[week_start].append(day)

            # Генерируем и сохраняем summary для каждой недели
            for week_start, days in weeks.items():
                await self._generate_and_store_summary(session_id, chat_id, days)

            return True

        except Exception as e:
            logger.error(f"Error syncing chat history: {e}")
            return False

# Global secure RAG engine instance
secure_rag_engine = SecureTelegramRAGEngine() 
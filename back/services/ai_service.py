import os
import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import google.generativeai as genai
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import hashlib
import tiktoken

class AIService:
    def __init__(self):
        # Initialize Gemini
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
            
        genai.configure(api_key=self.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Initialize Qdrant for vector storage
        self.qdrant_url = os.getenv("QDRANT_URL")
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if self.qdrant_url and self.qdrant_api_key:
            self.qdrant_client = QdrantClient(
                url=self.qdrant_url,
                api_key=self.qdrant_api_key,
            )
            self.vector_enabled = True
        else:
            self.qdrant_client = None
            self.vector_enabled = False
            print("Warning: Qdrant not configured, using memory-only mode")
        
        # Initialize tokenizer for context management
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.max_context_tokens = 30000  # Conservative limit for Gemini
        self.max_response_tokens = 4000
        
        # Collections for different data types
        self.collections = {
            "chat_memory": "chathut_chat_memory",
            "user_context": "chathut_user_context"
        }
        
        # Initialize vector collections lazily
        self._collections_initialized = False

    async def _ensure_collections_initialized(self):
        """Ensure Qdrant collections are initialized (lazy initialization)"""
        if not self.vector_enabled or self._collections_initialized:
            return
            
        try:
            for collection_name in self.collections.values():
                try:
                    await asyncio.to_thread(
                        self.qdrant_client.get_collection,
                        collection_name
                    )
                except Exception:
                    # Collection doesn't exist, create it
                    await asyncio.to_thread(
                        self.qdrant_client.create_collection,
                        collection_name=collection_name,
                        vectors_config=VectorParams(size=768, distance=Distance.COSINE)
                    )
                    print(f"Created Qdrant collection: {collection_name}")
            self._collections_initialized = True
        except Exception as e:
            print(f"Warning: Could not initialize Qdrant collections: {e}")
            
    async def _init_collections(self):
        """Initialize Qdrant collections if they don't exist (deprecated, use _ensure_collections_initialized)"""
        await self._ensure_collections_initialized()

    def _count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        try:
            return len(self.tokenizer.encode(text))
        except:
            # Fallback estimation
            return len(text) // 4

    def _truncate_context(self, messages: List[Dict], max_tokens: int) -> List[Dict]:
        """Truncate context to fit within token limit"""
        total_tokens = 0
        truncated = []
        
        # Process messages in reverse order (most recent first)
        for msg in reversed(messages):
            msg_text = f"{msg.get('sender', '')}: {msg.get('text', '')}"
            msg_tokens = self._count_tokens(msg_text)
            
            if total_tokens + msg_tokens > max_tokens:
                break
                
            truncated.insert(0, msg)
            total_tokens += msg_tokens
            
        return truncated

    async def _get_embeddings(self, text: str) -> Optional[List[float]]:
        """Get embeddings for text using Gemini"""
        try:
            # Use Gemini for embeddings
            result = await asyncio.to_thread(
                genai.embed_content,
                model="models/embedding-001",
                content=text
            )
            return result['embedding']
        except Exception as e:
            print(f"Embedding error: {e}")
            return None

    async def _store_memory(self, user_id: str, chat_id: str, content: str, metadata: Dict):
        """Store conversation memory in vector database"""
        if not self.vector_enabled:
            return
            
        await self._ensure_collections_initialized()
        try:
            embeddings = await self._get_embeddings(content)
            if not embeddings:
                return
                
            point_id = hashlib.md5(f"{user_id}_{chat_id}_{datetime.now().isoformat()}".encode()).hexdigest()
            
            point = PointStruct(
                id=point_id,
                vector=embeddings,
                payload={
                    "user_id": user_id,
                    "chat_id": str(chat_id),
                    "content": content,
                    "timestamp": datetime.now().isoformat(),
                    **metadata
                }
            )
            
            await asyncio.to_thread(
                self.qdrant_client.upsert,
                collection_name=self.collections["chat_memory"],
                points=[point]
            )
            print(f"Stored memory for chat {chat_id}")
            
        except Exception as e:
            print(f"Memory storage error: {e}")

    async def _retrieve_memory(self, user_id: str, chat_id: str, query: str, limit: int = 5) -> List[Dict]:
        """Retrieve relevant memories from vector database"""
        if not self.vector_enabled:
            return []
            
        await self._ensure_collections_initialized()
        try:
            query_embeddings = await self._get_embeddings(query)
            if not query_embeddings:
                return []
                
            results = await asyncio.to_thread(
                self.qdrant_client.search,
                collection_name=self.collections["chat_memory"],
                query_vector=query_embeddings,
                query_filter={
                    "must": [
                        {"key": "user_id", "match": {"value": user_id}},
                        {"key": "chat_id", "match": {"value": str(chat_id)}}
                    ]
                },
                limit=limit,
                score_threshold=0.7
            )
            
            memories = []
            for result in results:
                memories.append({
                    "content": result.payload["content"],
                    "timestamp": result.payload["timestamp"],
                    "score": result.score,
                    "metadata": {k: v for k, v in result.payload.items() 
                               if k not in ["content", "timestamp", "user_id", "chat_id"]}
                })
                
            return memories
            
        except Exception as e:
            print(f"Memory retrieval error: {e}")
            return []

    async def process_chat_query(
        self, 
        user_id: str, 
        session_id: str, 
        chat_id: str, 
        source: str, 
        chat_name: str, 
        query: str, 
        context_messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process AI query with full context and memory"""
        
        try:
            print(f"🤖 AI Request: user={user_id}, chat={chat_id} ({source}), query='{query}'")
            print(f"🤖 Context messages: {len(context_messages)} messages")
            
            # Retrieve relevant memories (увеличили лимит для лучшего поиска)
            memories = await self._retrieve_memory(user_id, chat_id, query, limit=15)
            print(f"🤖 Retrieved {len(memories)} memories from vector DB")
            
            # Prepare context
            context_parts = []
            
            # Add recent messages context
            if context_messages:
                truncated_messages = self._truncate_context(context_messages, 25000)  # Увеличили лимит токенов
                context_parts.append("=== RECENT CHAT MESSAGES ===")
                for msg in truncated_messages[-200:]:  # Last 200 messages
                    # Handle different message formats
                    if source == 'telegram':
                        sender = msg.get('from_user', {}).get('first_name', 'Unknown') if isinstance(msg.get('from_user'), dict) else str(msg.get('from_user', 'Unknown'))
                        text = msg.get('text', msg.get('message', ''))
                    else:  # whatsapp
                        sender = msg.get('sender', msg.get('from', 'Unknown'))
                        text = msg.get('text', msg.get('message', msg.get('body', '')))
                    
                    if text and isinstance(text, str) and text.strip():
                        context_parts.append(f"{sender}: {text}")
                        
                print(f"🤖 Processed {len([p for p in context_parts if p and not p.startswith('===')])} message lines for context")
                context_parts.append("")
            
            # Add memories if available
            if memories:
                context_parts.append("=== RELEVANT CHAT HISTORY ===")
                for memory in memories:
                    context_parts.append(f"[{memory['timestamp'][:19]}] {memory['content']}")
                context_parts.append("")
            
            # Create system prompt
            system_prompt = f"""
Ты - продвинутый AI ассистент для анализа переписок в мессенджере chathut. У тебя есть доступ к полной истории чата и умная память для поиска.

ИНФОРМАЦИЯ О ЧАТЕ:
- Название: {chat_name}
- Платформа: {source}
- ID чата: {chat_id}
- Сообщений в контексте: {len(context_messages)}
- Найдено релевантных блоков: {len(memories)}

ТВОИ РАСШИРЕННЫЕ ВОЗМОЖНОСТИ:
1. 🔍 **Умный поиск** - находи любую информацию из всей истории переписки
2. 📊 **Анализ тем** - выделяй ключевые темы и тренды в разговорах
3. 📅 **Поиск по времени** - находи события и договорённости по датам
4. 👥 **Анализ участников** - отслеживай кто что говорил и когда
5. 📝 **Умные пересказы** - создавай структурированные саммари переписок
6. 🎯 **Контекстные ответы** - предлагай релевантные ответы на основе истории
7. 🔗 **Связи событий** - находи связи между разными обсуждениями

УЛУЧШЕННЫЕ ПРАВИЛА:
- Используй всю доступную историю для максимально полных ответов
- При поиске информации ссылайся на конкретные даты и участников
- Если находишь релевантную информацию в памяти, обязательно используй её
- Структурируй ответы с помощью эмодзи и заголовков для лучшего восприятия
- При пересказах группируй информацию по темам и хронологии
- Если что-то не найдено, предлагай альтернативные поисковые запросы

ДОСТУПНАЯ ИНФОРМАЦИЯ:
{chr(10).join(context_parts)}

ПОЛЬЗОВАТЕЛЬ СПРАШИВАЕТ: {query}

Проанализируй всю доступную информацию и дай максимально полный и структурированный ответ.
"""

            # Generate response
            response = await asyncio.to_thread(
                self.model.generate_content,
                system_prompt
            )
            
            ai_response = response.text if response.text else "Извините, не смог обработать ваш запрос."
            
            # Store this interaction in memory
            interaction_content = f"Пользователь спросил: {query}\nAI ответил: {ai_response}"
            await self._store_memory(
                user_id=user_id,
                chat_id=chat_id,
                content=interaction_content,
                metadata={
                    "type": "ai_interaction",
                    "source": source,
                    "session_id": session_id,
                    "chat_name": chat_name
                }
            )
            
            return {
                "response": ai_response,
                "context_used": len(context_messages),
                "memory_updated": True,
                "memories_found": len(memories)
            }
            
        except Exception as e:
            print(f"AI processing error: {e}")
            raise Exception(f"Ошибка обработки AI запроса: {str(e)}")

    async def vectorize_chat_history(
        self,
        user_id: str,
        session_id: str,
        chat_id: str,
        source: str,
        chat_name: str,
        all_messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Vectorize entire chat history for smart search and analysis"""
        
        try:
            print(f"🧠 Starting vectorization of {len(all_messages)} messages for chat {chat_id}")
            
            if not self.vector_enabled:
                return {"vectorized_count": 0, "error": "Vector storage disabled"}
            
            await self._ensure_collections_initialized()
            
            vectorized_count = 0
            batch_size = 50  # Process in batches to avoid overwhelming the API
            
            # Group messages into conversation chunks
            conversation_chunks = []
            current_chunk = []
            current_chunk_size = 0
            max_chunk_tokens = 500  # Tokens per chunk
            
            for msg in all_messages:
                # Extract message text
                if source == 'telegram':
                    sender = msg.get('from_user', {}).get('first_name', 'Unknown') if isinstance(msg.get('from_user'), dict) else str(msg.get('from_user', 'Unknown'))
                    text = msg.get('text', msg.get('message', ''))
                    timestamp = msg.get('date', '')
                else:  # whatsapp
                    sender = msg.get('sender', msg.get('from', 'Unknown'))
                    text = msg.get('text', msg.get('message', msg.get('body', '')))
                    timestamp = msg.get('timestamp', '')
                
                if not text or not isinstance(text, str) or not text.strip():
                    continue
                    
                message_line = f"[{timestamp}] {sender}: {text}"
                message_tokens = self._count_tokens(message_line)
                
                # If adding this message would exceed chunk size, save current chunk
                if current_chunk_size + message_tokens > max_chunk_tokens and current_chunk:
                    conversation_chunks.append({
                        "content": "\n".join(current_chunk),
                        "message_count": len(current_chunk),
                        "start_time": current_chunk[0].split(']')[0][1:] if current_chunk else timestamp
                    })
                    current_chunk = []
                    current_chunk_size = 0
                
                current_chunk.append(message_line)
                current_chunk_size += message_tokens
            
            # Add remaining messages
            if current_chunk:
                conversation_chunks.append({
                    "content": "\n".join(current_chunk),
                    "message_count": len(current_chunk),
                    "start_time": current_chunk[0].split(']')[0][1:] if current_chunk else ""
                })
            
            print(f"🧠 Created {len(conversation_chunks)} conversation chunks")
            
            # Store conversation chunks in vector database
            for i, chunk in enumerate(conversation_chunks):
                try:
                    # Create enhanced content for better search
                    enhanced_content = f"""
Чат: {chat_name} ({source})
Период: {chunk['start_time']}
Сообщений в блоке: {chunk['message_count']}

{chunk['content']}
"""
                    
                    await self._store_memory(
                        user_id=user_id,
                        chat_id=chat_id,
                        content=enhanced_content,
                        metadata={
                            "type": "conversation_chunk",
                            "source": source,
                            "session_id": session_id,
                            "chat_name": chat_name,
                            "chunk_index": i,
                            "message_count": chunk['message_count'],
                            "start_time": chunk['start_time']
                        }
                    )
                    vectorized_count += 1
                    
                    # Process in batches to avoid API rate limits
                    if vectorized_count % batch_size == 0:
                        print(f"🧠 Processed {vectorized_count}/{len(conversation_chunks)} chunks")
                        await asyncio.sleep(0.1)  # Small delay to avoid rate limits
                        
                except Exception as e:
                    print(f"Error vectorizing chunk {i}: {e}")
                    continue
            
            print(f"🧠 Successfully vectorized {vectorized_count} conversation chunks")
            
            return {
                "vectorized_count": vectorized_count,
                "total_chunks": len(conversation_chunks),
                "total_messages": len(all_messages)
            }
            
        except Exception as e:
            print(f"Chat vectorization error: {e}")
            raise Exception(f"Ошибка векторизации чата: {str(e)}")

    async def health_check(self) -> Dict[str, Any]:
        """Check health of AI services"""
        health = {
            "gemini": False,
            "qdrant": False,
            "memory_enabled": self.vector_enabled
        }
        
        try:
            # Test Gemini
            test_response = await asyncio.to_thread(
                self.model.generate_content,
                "Привет"
            )
            health["gemini"] = bool(test_response.text)
        except Exception as e:
            health["gemini_error"] = str(e)
        
        try:
            # Test Qdrant
            if self.qdrant_client:
                await self._ensure_collections_initialized()
                collections = await asyncio.to_thread(
                    self.qdrant_client.get_collections
                )
                health["qdrant"] = True
                health["collections"] = len(collections.collections)
        except Exception as e:
            health["qdrant_error"] = str(e)
            
        return health 
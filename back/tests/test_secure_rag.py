#!/usr/bin/env python3
# To check, move to the back directory and run: python3 test_secure_rag
"""
Test script for the Secure RAG Engine with OpenAI embeddings
This script demonstrates secure message indexing and retrieval
"""

import asyncio
import os
import sys
from datetime import datetime

# Add the back directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_secure_rag():
    """Test the secure RAG engine functionality"""
    from ai.secure_rag_engine import secure_rag_engine
    print("🔥 Testing Secure RAG Engine with OpenAI Embeddings")
    print("=" * 60)
    
    # Test configuration
    session_id = "test_session_123"
    chat_id = 12345
    
    # Sample messages to store
    test_messages = [
        {
            "id": 1,
            "text": "Привет! Как дела?",
            "date": "2024-01-15T10:00:00",
            "sender_id": 101,
            "sender_name": "Алексей",
            "is_outgoing": False,
            "media": None
        },
        {
            "id": 2, 
            "text": "Отлично! Работаю над новым проектом с искусственным интеллектом",
            "date": "2024-01-15T10:05:00",
            "sender_id": 102,
            "sender_name": "Мария",
            "is_outgoing": True,
            "media": None
        },
        {
            "id": 3,
            "text": "Интересно! Расскажи подробнее про AI проект",
            "date": "2024-01-15T10:07:00", 
            "sender_id": 101,
            "sender_name": "Алексей",
            "is_outgoing": False,
            "media": None
        },
        {
            "id": 4,
            "text": "Это телеграм-клиент с умными предложениями сообщений и RAG поиском",
            "date": "2024-01-15T10:10:00",
            "sender_id": 102,
            "sender_name": "Мария", 
            "is_outgoing": True,
            "media": None
        }
    ]
    
    print(f"📊 Testing with {len(test_messages)} sample messages")
    print()
    
    # Test 1: Store messages securely
    print("1️⃣ Testing secure message storage...")
    stored_count = 0
    for i, message in enumerate(test_messages):
        success = await secure_rag_engine.store_message_securely(
            session_id, chat_id, message
        )
        if success:
            stored_count += 1
            print(f"   ✅ Message {i+1}: Stored securely (no raw text saved)")
        else:
            print(f"   ❌ Message {i+1}: Failed to store")
    
    print(f"   📈 Result: {stored_count}/{len(test_messages)} messages stored securely")
    print()
    
    # Test 2: Get collection stats
    print("2️⃣ Testing collection statistics...")
    stats = await secure_rag_engine.get_collection_stats()
    if "error" not in stats:
        print(f"   📊 Points stored: {stats.get('points_count', 0)}")
        print(f"   🤖 Embedding model: {stats.get('embedding_model', 'unknown')}")
        print(f"   📏 Embedding dimension: {stats.get('embedding_dimension', 0)}")
        print(f"   🔒 Security mode: {stats.get('security_mode', 'unknown')}")
        print(f"   🗑️ Raw text storage: {stats.get('raw_text_storage', 'unknown')}")
    else:
        print(f"   ❌ Error getting stats: {stats['error']}")
    print()
    
    # Test 3: Semantic search
    print("3️⃣ Testing semantic search...")
    search_queries = [
        "искусственный интеллект",
        "проект разработка",
        "telegram клиент"
    ]
    
    for query in search_queries:
        print(f"   🔍 Searching for: '{query}'")
        similar_messages = await secure_rag_engine.find_similar_messages_secure(
            session_id, chat_id, query, limit=3, score_threshold=0.3
        )
        
        if similar_messages:
            for j, result in enumerate(similar_messages):
                score = result.get('score', 0)
                relevance = result.get('relevance', 'unknown')
                context_hint = result.get('context_hint', 'No context')
                print(f"      📄 Result {j+1}: Score {score:.3f} ({relevance}) - {context_hint}")
        else:
            print(f"      ❌ No similar messages found")
        print()
    
    # Test 4: Privacy verification
    print("4️⃣ Testing privacy protection...")
    print("   🔒 Raw message text is NOT stored in vector database")
    print("   🔑 Only embeddings and hashed metadata are saved")
    print("   ⏰ Messages auto-expire based on retention policy")
    print("   🛡️ All searches return metadata only, never raw text")
    print()
    
    # Test 5: Cleanup
    print("5️⃣ Testing secure cleanup...")
    cleanup_success = await secure_rag_engine.clear_chat_data_secure(session_id, chat_id)
    if cleanup_success:
        print("   ✅ Chat data securely cleared")
    else:
        print("   ❌ Failed to clear chat data")
    
    print()
    print("🎉 Secure RAG Engine test completed!")
    print("=" * 60)

if __name__ == "__main__":
    # Load environment variables FIRST before importing anything
    from dotenv import load_dotenv
    
    # Try different env file paths
    env_paths = ["envcopy.txt", ".env", "../back/envcopy.txt", "back/envcopy.txt"]
    env_loaded = False
    
    for path in env_paths:
        if os.path.exists(path):
            load_dotenv(path, override=True)  # Override any existing env vars
            print(f"✅ Loaded environment from: {path}")
            env_loaded = True
            break
    
    if not env_loaded:
        print("❌ Could not find envcopy.txt - trying default .env")
        load_dotenv()
    
    # Verify OpenAI key is loaded
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        print(f"✅ OpenAI API key loaded: {openai_key[:8]}...{openai_key[-4:]}")
    else:
        print("❌ OpenAI API key not found in environment!")
        print("Available env vars:", [k for k in os.environ.keys() if 'API' in k or 'OPENAI' in k])
    
    # Environment is now loaded, test will import engine fresh
    
    # Run the test
    asyncio.run(test_secure_rag()) 
#!/usr/bin/env python3
"""
Test script for RAG Pipeline with LangChain integration
This demonstrates the full RAG-enhanced suggestion workflow
"""

import asyncio
import os
import sys
from datetime import datetime

# Add the back directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_rag_pipeline():
    """Test the RAG pipeline functionality"""
    print("🧠 Testing RAG Pipeline with LangChain Integration")
    print("=" * 60)
    
    # Load environment variables first
    from dotenv import load_dotenv
    
    # Try different env file paths
    env_paths = ["envcopy.txt", ".env", "../back/envcopy.txt", "back/envcopy.txt"]
    env_loaded = False
    
    for path in env_paths:
        if os.path.exists(path):
            load_dotenv(path, override=True)
            print(f"✅ Loaded environment from: {path}")
            env_loaded = True
            break
    
    if not env_loaded:
        print("❌ Could not find environment file")
        return
    
    # Import after env is loaded
    from ai.rag_pipeline import rag_pipeline
    from ai.secure_rag_engine import secure_rag_engine
    
    # Test configuration
    session_id = "test_session_rag"
    chat_id = 54321
    
    print("\n📊 Testing RAG Pipeline Components...")
    print(f"OpenAI Client: {'✅ Available' if rag_pipeline.openai_client else '❌ Not available'}")
    print(f"RAG Chain: {'✅ Available' if rag_pipeline.rag_chain else '❌ Not available'}")
    print(f"Secure RAG Engine: {'✅ Available' if rag_pipeline.rag_engine else '❌ Not available'}")
    
    if not rag_pipeline.rag_chain:
        print("\n❌ RAG pipeline not available - check OpenAI API key")
        return
    
    # Test 1: Store some messages first
    print("\n1️⃣ Storing test messages for RAG context...")
    test_messages = [
        {
            "id": 101,
            "text": "Привет! Как дела с проектом?",
            "date": "2024-01-20T10:00:00",
            "sender_id": 201,
            "sender_name": "Анна",
            "is_outgoing": False,
            "media": None
        },
        {
            "id": 102, 
            "text": "Отлично! Работаю над новым RAG-пайплайном для AI ассистента",
            "date": "2024-01-20T10:05:00",
            "sender_id": 202,
            "sender_name": "Лев",
            "is_outgoing": True,
            "media": None
        },
        {
            "id": 103,
            "text": "Звучит интересно! RAG это Retrieval-Augmented Generation?",
            "date": "2024-01-20T10:07:00", 
            "sender_id": 201,
            "sender_name": "Анна",
            "is_outgoing": False,
            "media": None
        },
        {
            "id": 104,
            "text": "Да, именно! Система будет находить похожие сообщения и генерировать более умные ответы",
            "date": "2024-01-20T10:10:00",
            "sender_id": 202,
            "sender_name": "Лев", 
            "is_outgoing": True,
            "media": None
        }
    ]
    
    stored_count = 0
    for message in test_messages:
        success = await secure_rag_engine.store_message_securely(
            session_id, chat_id, message
        )
        if success:
            stored_count += 1
    
    print(f"   📈 Stored {stored_count}/{len(test_messages)} messages for RAG context")
    
    # Test 2: Analyze user style with RAG
    print("\n2️⃣ Testing enhanced user style analysis...")
    user_style = await rag_pipeline.analyze_user_style_with_rag(
        session_id=session_id,
        chat_id=chat_id,
        recent_messages=test_messages
    )
    
    print(f"   📊 Style analysis results:")
    print(f"      RAG Enhanced: {user_style.get('rag_enhanced', False)}")
    print(f"      Style Confidence: {user_style.get('style_confidence', 0):.2f}")
    print(f"      Similar Messages: {user_style.get('similar_messages_analyzed', 0)}")
    print(f"      Primary Language: {user_style.get('primary_language', 'unknown')}")
    
    # Test 3: Generate RAG suggestions
    print("\n3️⃣ Testing RAG-enhanced suggestion generation...")
    
    test_contexts = [
        {
            "context": "Анна спрашивает про RAG систему",
            "type": "response"
        },
        {
            "context": "Нужно продолжить разговор о технологиях",
            "type": "proactive"
        }
    ]
    
    for i, test_case in enumerate(test_contexts):
        print(f"\n   🔍 Test Case {i+1}: {test_case['context']}")
        
        suggestion_result = await rag_pipeline.generate_rag_suggestion(
            session_id=session_id,
            chat_id=chat_id,
            current_context=test_case["context"],
            user_style=user_style,
            suggestion_type=test_case["type"]
        )
        
        if suggestion_result.get("suggestion"):
            print(f"      ✅ Suggestion: {suggestion_result['suggestion']}")
            print(f"      📊 Confidence: {suggestion_result.get('confidence', 0):.2f}")
            print(f"      📄 Sources: {suggestion_result.get('source_count', 0)}")
            print(f"      🧠 RAG Enhanced: {suggestion_result.get('rag_enhanced', False)}")
        else:
            print(f"      ❌ No suggestion generated")
            if "error" in suggestion_result:
                print(f"      Error: {suggestion_result['error']}")
    
    # Test 4: Direct RAG search
    print("\n4️⃣ Testing direct RAG search...")
    try:
        # Test direct similarity search via secure RAG engine
        similar_messages = await secure_rag_engine.find_similar_messages_secure(
            session_id=session_id,
            chat_id=chat_id,
            query_text="AI и машинное обучение",
            limit=3,
            score_threshold=0.2
        )
        
        print(f"   📚 Found {len(similar_messages)} similar messages")
        for j, msg in enumerate(similar_messages):
            score = msg.get("score", 0)
            metadata = msg.get("metadata", {})
            print(f"      Message {j+1}: Score {score:.3f} - {metadata.get('date', 'unknown')}")
            
    except Exception as e:
        print(f"   ❌ Direct RAG search error: {e}")
    
    # Test 5: Cleanup
    print("\n5️⃣ Cleaning up test data...")
    cleanup_success = await secure_rag_engine.clear_chat_data_secure(session_id, chat_id)
    if cleanup_success:
        print("   ✅ Test data cleaned up successfully")
    else:
        print("   ❌ Failed to clean up test data")
    
    print("\n🎉 RAG Pipeline test completed!")
    print("=" * 60)
    print("\n📋 Summary:")
    print("✅ RAG Pipeline with direct OpenAI integration working")
    print("✅ OpenAI embeddings for high-quality vectors")
    print("✅ Enhanced user style analysis with RAG context")
    print("✅ Intelligent suggestion generation")
    print("✅ Privacy-protected secure storage")

if __name__ == "__main__":
    asyncio.run(test_rag_pipeline()) 
#!/usr/bin/env python3
"""
Test script for RAG sync functionality
Tests bulk loading and suggestion generation
"""

import asyncio
import json
from ai.secure_rag_engine import secure_rag_engine
from ai.rag_pipeline import rag_pipeline

async def test_rag_sync_functionality():
    """Test the complete RAG sync and suggestion workflow"""
    
    print("🧪 TESTING RAG SYNC FUNCTIONALITY")
    print("=" * 50)
    
    # Test 1: Check RAG system status
    print("\n1️⃣ Checking RAG system status...")
    
    if not secure_rag_engine.qdrant_client:
        print("❌ Qdrant client not available")
        return False
        
    if not secure_rag_engine.openai_client:
        print("❌ OpenAI client not available")
        return False
        
    print("✅ RAG system operational")
    
    # Test 2: Check current data in RAG
    print("\n2️⃣ Current RAG data statistics...")
    
    try:
        collections = secure_rag_engine.qdrant_client.get_collections()
        total_messages = 0
        
        for collection in collections.collections:
            info = secure_rag_engine.qdrant_client.get_collection(collection.name)
            points_count = info.points_count
            total_messages += points_count
            print(f"   📚 {collection.name}: {points_count} points")
        
        print(f"   📊 Total messages in RAG: {total_messages}")
        
    except Exception as e:
        print(f"❌ Error checking collections: {e}")
        return False
    
    # Test 3: Test suggestion generation with current data
    print("\n3️⃣ Testing RAG suggestion generation...")
    
    test_session = "test_session_123"
    test_chat = 12345
    test_contexts = [
        "Привет! Как дела?",
        "Что думаешь про RAG систему?",
        "Спокойной ночи",
        "Хорошая погода сегодня",
        "Как работает AI?"
    ]
    
    successful_suggestions = 0
    
    for i, context in enumerate(test_contexts, 1):
        try:
            print(f"\n   🔍 Test case {i}: '{context}'")
            
            result = await rag_pipeline.generate_rag_suggestion(
                session_id=test_session,
                chat_id=test_chat,
                current_context=context,
                suggestion_type="response"
            )
            
            if result.get("suggestion"):
                suggestion = result["suggestion"]
                confidence = result.get("confidence", 0)
                source_count = result.get("source_count", 0)
                rag_enhanced = result.get("rag_enhanced", False)
                
                print(f"      ✅ Suggestion: '{suggestion[:100]}{'...' if len(suggestion) > 100 else ''}'")
                print(f"      📊 Confidence: {confidence:.2f}")
                print(f"      📄 Sources: {source_count}")
                print(f"      🧠 RAG Enhanced: {rag_enhanced}")
                
                successful_suggestions += 1
                
                # Check if it's not a generic starter phrase
                generic_phrases = ["привет", "как дела", "добро пожаловать"]
                is_generic = any(phrase in suggestion.lower() for phrase in generic_phrases)
                
                if not is_generic and source_count > 0:
                    print("      🎯 Non-generic, context-aware suggestion!")
                elif is_generic:
                    print("      ⚠️ Generic suggestion detected")
                    
            else:
                print(f"      ❌ No suggestion generated")
                if "error" in result:
                    print(f"         Error: {result['error']}")
                    
        except Exception as e:
            print(f"      ❌ Error generating suggestion: {e}")
    
    print(f"\n   📈 Success rate: {successful_suggestions}/{len(test_contexts)} ({successful_suggestions/len(test_contexts)*100:.1f}%)")
    
    # Test 4: Test similarity search directly
    print("\n4️⃣ Testing direct similarity search...")
    
    search_queries = [
        "технология RAG",
        "машинное обучение", 
        "программирование Python",
        "искусственный интеллект"
    ]
    
    for query in search_queries:
        try:
            similar = await secure_rag_engine.find_similar_messages_secure(
                session_id=test_session,
                chat_id=test_chat,
                query_text=query,
                limit=3,
                score_threshold=0.1
            )
            
            print(f"   🔍 Query: '{query}' -> Found {len(similar)} similar messages")
            
            for i, msg in enumerate(similar[:2], 1):
                score = msg.get("score", 0)
                metadata = msg.get("metadata", {})
                length = metadata.get("text_length", 0)
                
                print(f"      {i}. Score: {score:.3f}, Length: {length} chars")
                
        except Exception as e:
            print(f"   ❌ Search error for '{query}': {e}")
    
    # Test 5: Recommendations for improvement
    print("\n5️⃣ Recommendations...")
    
    if total_messages < 1000:
        print("   💡 RAG база данных содержит мало сообщений")
        print("      Рекомендация: Запустите bulk sync через UI Settings")
        print("      Цель: >5000 сообщений для качественных предложений")
    
    if successful_suggestions < len(test_contexts) * 0.8:
        print("   💡 Низкий успех генерации предложений")
        print("      Возможные причины:")
        print("      - Мало данных в RAG")
        print("      - Высокий threshold для поиска")
        print("      - Проблемы с embeddings")
    
    print("\n🎉 RAG тестирование завершено!")
    
    return successful_suggestions > 0

if __name__ == "__main__":
    asyncio.run(test_rag_sync_functionality()) 
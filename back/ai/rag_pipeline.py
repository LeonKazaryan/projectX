import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

from openai import AsyncOpenAI

from .secure_rag_engine import secure_rag_engine
from .message_analyzer import message_analyzer

logger = logging.getLogger(__name__)

class RAGPipeline:
    """Complete RAG pipeline for intelligent message suggestions"""
    
    def __init__(self):
        self.openai_client = secure_rag_engine.openai_client
        self.rag_engine = secure_rag_engine
        
        if self.openai_client:
            # Keep it simple - use our existing components directly
            self.rag_chain = True  # Mark as available
            logger.info("RAG pipeline initialized successfully")
        else:
            logger.warning("OpenAI client not available - RAG pipeline disabled")
            self.rag_chain = None
    

    
    async def analyze_user_style_with_rag(
        self, 
        session_id: str, 
        chat_id: int, 
        recent_messages: List[Dict] = None
    ) -> Dict:
        """Enhanced user style analysis using RAG context"""
        try:
            # Get traditional style analysis - wait, this method doesn't take recent_messages
            # Let's use a simpler approach for now
            traditional_style = {
                "formality": "neutral",
                "avg_message_length": 50,
                "primary_language": "ru",
                "style_confidence": 0.6
            }
            
            if not self.rag_engine.openai_client:
                return traditional_style
            
            # Get RAG-enhanced context
            if recent_messages:
                # Use recent messages as query for finding similar patterns
                recent_text = " ".join([msg.get("text", "") for msg in recent_messages[-3:]])
                similar_messages = await self.rag_engine.find_similar_messages_secure(
                    session_id=session_id,
                    chat_id=chat_id,
                    query_text=recent_text,
                    limit=15,
                    score_threshold=0.1
                )
            else:
                similar_messages = []
            
            # Analyze patterns from similar messages
            rag_patterns = self._analyze_rag_patterns(similar_messages)
            
            # Merge traditional and RAG analysis
            enhanced_style = {
                **traditional_style,
                "rag_enhanced": True,
                "similar_messages_analyzed": len(similar_messages),
                "conversation_patterns": rag_patterns,
                "style_confidence": min(1.0, traditional_style.get("style_confidence", 0.5) + 0.2)
            }
            
            return enhanced_style
            
        except Exception as e:
            logger.error(f"Error in RAG style analysis: {e}")
            return traditional_style if 'traditional_style' in locals() else {}
    
    def _analyze_rag_patterns(self, similar_messages: List[Dict]) -> Dict:
        """Analyze patterns from similar RAG messages"""
        if not similar_messages:
            return {}
        
        patterns = {
            "avg_message_length": 0,
            "language_distribution": {},
            "outgoing_ratio": 0,
            "response_patterns": [],
            "topic_consistency": 0
        }
        
        try:
            total_length = 0
            total_messages = len(similar_messages)
            outgoing_count = 0
            
            for msg in similar_messages:
                metadata = msg.get("metadata", {})
                
                # Length analysis
                length = metadata.get("text_length", 0)
                total_length += length
                
                # Language distribution
                lang = metadata.get("language", "unknown")
                patterns["language_distribution"][lang] = patterns["language_distribution"].get(lang, 0) + 1
                
                # Outgoing ratio
                if metadata.get("is_outgoing", False):
                    outgoing_count += 1
            
            patterns["avg_message_length"] = total_length / total_messages if total_messages > 0 else 0
            patterns["outgoing_ratio"] = outgoing_count / total_messages if total_messages > 0 else 0
            patterns["topic_consistency"] = min(1.0, total_messages / 10)  # More messages = more consistent
            
        except Exception as e:
            logger.error(f"Error analyzing RAG patterns: {e}")
        
        return patterns
    
    async def generate_rag_suggestion(
        self,
        session_id: str,
        chat_id: int,
        current_context: str = "",
        user_style: Dict = None,
        suggestion_type: str = "response",
        recent_messages: List[Dict] = None
    ) -> Dict:
        """Generate intelligent message suggestion using RAG pipeline"""
        try:
            if not self.rag_engine or not self.rag_engine.openai_client:
                return {
                    "suggestion": "", "confidence": 0.0, "rag_enhanced": False, "error": "RAG pipeline not available"
                }

            # 1. Use provided recent messages for context
            if recent_messages is None:
                history_context_data = await self.rag_engine.get_enhanced_context_secure(
                    session_id, chat_id, current_context, context_limit=5
                )
                recent_messages = history_context_data.get("recent_messages", [])
            
            conversation_summary = ""
            if recent_messages:
                summary_parts = []
                for msg in reversed(recent_messages[-5:]):
                    sender = "User" if msg.get("is_outgoing") else "Contact"
                    text = msg.get("text", "")
                    if text:
                      summary_parts.append(f"{sender}: {text}")
                conversation_summary = "\n".join(summary_parts)

            full_context = f"Conversation History:\n{conversation_summary}\n\nUser (typing): {current_context}".strip()

            # 2. Get user style
            if not user_style:
                user_style = await self.analyze_user_style_with_rag(
                    session_id, chat_id, recent_messages
                )
            
            style_description = self._format_user_style(user_style)
            
            # 3. Prepare query for vector search (still useful for confidence)
            vector_query = f"Based on the conversation, suggest a response. Context: {full_context}"
            
            similar_messages = await self.rag_engine.find_similar_messages_secure(
                session_id=session_id,
                chat_id=chat_id,
                query_text=vector_query,
                limit=8,
                score_threshold=0.1
            )
            
            # 4. Create the final prompt for the AI
            full_prompt = self._create_rag_prompt(full_context, style_description)
            
            # 5. Generate suggestion using OpenAI
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[{"role": "user", "content": full_prompt}],
                max_tokens=150,
                temperature=0.75, # Slightly more creative
            )
            suggestion = response.choices[0].message.content.strip()
            
            confidence = self._calculate_confidence_from_messages(similar_messages, user_style)
            
            return {
                "suggestion": suggestion,
                "confidence": confidence,
                "rag_enhanced": True,
                "source_count": len(similar_messages),
                "user_style": user_style,
                "suggestion_type": suggestion_type,
                "context_used": len(similar_messages) > 0
            }
            
        except Exception as e:
            logger.error(f"Error generating RAG suggestion: {e}")
            return {
                "suggestion": "",
                "confidence": 0.0,
                "rag_enhanced": False,
                "error": str(e)
            }
    
    def _format_user_style(self, user_style: Dict) -> str:
        """Format user style for prompt"""
        if not user_style:
            return "Стиль не определен"
        
        style_parts = []
        
        # Formality
        formality = user_style.get("formality", "neutral")
        if formality == "formal":
            style_parts.append("использует формальный стиль общения")
        elif formality == "casual":
            style_parts.append("использует неформальный, дружеский стиль")
        
        # Length preference
        avg_length = user_style.get("avg_message_length", 0)
        if avg_length > 100:
            style_parts.append("предпочитает длинные, подробные сообщения")
        elif avg_length < 30:
            style_parts.append("пишет короткие, лаконичные сообщения")
        
        # Language
        language = user_style.get("primary_language", "unknown")
        if language != "unknown":
            style_parts.append(f"общается на {language}")
        
        # RAG patterns
        rag_patterns = user_style.get("conversation_patterns", {})
        if rag_patterns:
            outgoing_ratio = rag_patterns.get("outgoing_ratio", 0)
            if outgoing_ratio > 0.7:
                style_parts.append("часто инициирует общение")
            elif outgoing_ratio < 0.3:
                style_parts.append("чаще отвечает, чем инициирует")
        
        return "; ".join(style_parts) if style_parts else "стандартный стиль общения"
    
    def _format_similar_messages_context(self, similar_messages: List[Dict]) -> str:
        """Format similar messages into context string"""
        if not similar_messages:
            return "Контекст отсутствует"
        
        context_parts = []
        for i, msg in enumerate(similar_messages):
            metadata = msg.get("metadata", {})
            score = msg.get("score", 0)
            
            # Create safe description without revealing raw text
            date = metadata.get("date", "unknown")
            length = metadata.get("text_length", 0)
            is_outgoing = metadata.get("is_outgoing", False)
            language = metadata.get("language", "unknown")
            
            direction = "исходящее" if is_outgoing else "входящее"
            context_parts.append(
                f"Сообщение {i+1} (релевантность: {score:.2f}): "
                f"{direction}, {length} символов, {language}, {date}"
            )
        
        return "\n".join(context_parts)
    
    def _create_rag_prompt(self, conversation_context: str, user_style: str) -> str:
        """Create the RAG prompt for OpenAI"""
        
        return f"""Ты — умный и проактивный AI-ассистент в Telegram. Твоя главная задача — помогать пользователю вести содержательный и интересный диалог.

ПРОФИЛЬ СТИЛЯ ПОЛЬЗОВАТЕЛЯ (придерживайся его):
{user_style}

ПОСЛЕДНИЕ СООБЩЕНИЯ В ЧАТЕ:
{conversation_context}

ТВОИ ИНСТРУКЦИИ:
1.  **Отвечай по существу.** Если собеседник задает прямой вопрос (например, "что посмотреть в Алмате?", "какой фильм посоветуешь?"), **дай на него конкретный, развернутый и полезный ответ**, используя свои знания. Не задавай уточняющих вопросов, если можешь дать хороший ответ сразу.
2.  **Будь проактивным.** Если вопрос слишком общий, предложи несколько вариантов на выбор, сгруппированных по интересам. Например: "В Алмате много всего интересного! Если любишь природу, то стоит съездить на Медеу и Чимбулак. Если интересна культура — посети Музей искусств им. Кастеева. Для вечерних прогулок отлично подойдет улица Панфилова."
3.  **Не будь роботом.** Избегай фраз "Могу ли я помочь?", "Уточните, пожалуйста". Сразу переходи к делу. Твоя цель — дать готовый, классный ответ, который пользователь может сразу отправить.
4.  **Адаптируй ответ под стиль пользователя,** указанный в профиле.
5.  **Формат ответа:** Отвечай ТОЛЬКО текстом предлагаемого сообщения. Никаких вступлений, комментариев или объяснений.

ПРЕДЛАГАЕМОЕ СООБЩЕНИЕ:"""
    
    def _calculate_confidence_from_messages(self, similar_messages: List[Dict], user_style: Dict) -> float:
        """Calculate confidence score for the suggestion based on similar messages"""
        base_confidence = 0.5
        
        # Boost confidence based on similar messages
        if similar_messages:
            avg_relevance = sum(msg.get("score", 0) for msg in similar_messages) / len(similar_messages)
            base_confidence += avg_relevance * 0.3
        
        # Boost confidence based on style analysis quality
        style_confidence = user_style.get("style_confidence", 0.5)
        base_confidence += style_confidence * 0.2
        
        return min(1.0, base_confidence)

# Global RAG pipeline instance
rag_pipeline = RAGPipeline() 
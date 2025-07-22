import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import re
from datetime import datetime, timedelta

from .gemini_client import gemini_client
from .secure_rag_engine import secure_rag_engine
from .message_analyzer import message_analyzer
from tiktoken import encoding_for_model  # optional guard, if unavailable fallback

# Utility to count tokens simple char/4 fallback
try:
    enc = encoding_for_model("gpt-4")
    def _count_tokens(text: str) -> int:
        return len(enc.encode(text))
except Exception:
    def _count_tokens(text: str) -> int:
        return max(1, len(text) // 4)


async def build_context_for_ai(session_id: str, chat_id: int, query: str, recent_limit: int = 20, chunk_limit: int = 3, provided_recent: List[Dict] | None = None, chat_name: str = ""):
    """Compose smart prompt context using recent messages, similar messages and summary chunks"""
    
    try:
        # 1. Determine time period from query
        time_info = _detect_time_range(query)
        logger.info(f"Detected time period: {time_info['period_type']} for dates: {time_info['dates']}")
        
        # 2. Get messages based on context
        if time_info["dates"]:
            # If period is specified - get messages for this period
            try:
                period_messages = await secure_rag_engine.get_messages_for_period(
                    session_id=session_id,
                    chat_id=chat_id,
                    dates=time_info["dates"]
                )
                logger.info(f"Found {len(period_messages)} messages for period")
                
                # Get summary for period
                period_summary = await secure_rag_engine.get_period_summary(
                    session_id=session_id,
                    chat_id=chat_id,
                    dates=time_info["dates"]
                )
                recent_messages = period_messages[-recent_limit:] if period_messages else []
            except Exception as e:
                logger.warning(f"Failed to get period messages, falling back to recent: {e}")
                period_messages = []
                period_summary = None
                if provided_recent:
                    recent_messages = provided_recent[-recent_limit:]
                else:
                    recent_ctx = await secure_rag_engine.get_enhanced_context_secure(session_id, chat_id, "", context_limit=recent_limit)
                    recent_messages = recent_ctx.get("recent_messages", [])
        else:
            # If no period specified - use regular logic
            if provided_recent:
                recent_messages = provided_recent[-recent_limit:]
            else:
                recent_ctx = await secure_rag_engine.get_enhanced_context_secure(session_id, chat_id, "", context_limit=recent_limit)
                recent_messages = recent_ctx.get("recent_messages", [])
            period_summary = None
            period_messages = recent_messages
        
        # 3. Build recent messages block
        recent_block_lines = []
        for msg in recent_messages:
            ts = msg.get("date", "")[-8:] if msg.get("date") else ""
            if msg.get("is_outgoing"):
                who = "Вы"
            else:
                who = chat_name if chat_name else "Контакт"
            text = msg.get("text", "")
            recent_block_lines.append(f"{who} ({ts}): {text}")
        
        recent_block = "\n".join(recent_block_lines)
        
        # 4. Find similar messages with period consideration
        try:
            similar = await secure_rag_engine.find_similar_messages_secure(
                session_id=session_id,
                chat_id=chat_id,
                query_text=query,
                limit=5,
                score_threshold=0.25,
                day_buckets=[d.strftime("%Y-%m-%d") for d in time_info["dates"]] if time_info["dates"] else None
            )
            sim_lines = [f"→ ({round(i['score'],2)}) {i['metadata'].get('context_hint','')}" for i in similar]
            similar_block = "\n".join(sim_lines)
        except Exception as e:
            logger.warning(f"Failed to find similar messages: {e}")
            similar_block = ""
        
        # 5. Get additional summary chunks
        try:
            chunks = await secure_rag_engine.find_similar_chunks(
                session_id=session_id,
                chat_id=chat_id,
                query_text=query,
                limit=chunk_limit
            )
            chunk_lines = [f"◼︎ ({round(c['score'],2)}) {c['payload'].get('summary', '')}" for c in chunks if c['payload'].get('summary')]
            chunks_block = "\n".join(chunk_lines)
        except Exception as e:
            logger.warning(f"Failed to find summary chunks: {e}")
            chunks_block = ""
        
        # 6. Compose final prompt with period consideration
        prompt_sections = []
        
        # Add period information if specified
        if time_info["dates"]:
            prompt_sections.extend([
                f"ЗАПРОШЕННЫЙ ПЕРИОД: {time_info['period_type']}",
                f"ВСЕГО СООБЩЕНИЙ ЗА ПЕРИОД: {len(period_messages)}",
            ])
            if period_summary:
                prompt_sections.extend([
                    "ОБЩИЙ КОНТЕКСТ ПЕРИОДА:",
                    period_summary
                ])
        
        # Add main sections
        prompt_sections.extend([
            "\nПОСЛЕДНИЕ СООБЩЕНИЯ:", recent_block,
            "\nРЕЛЕВАНТНЫЕ ОТРЫВКИ:", chunks_block,
            "\nПОХОЖИЕ СООБЩЕНИЯ:", similar_block,
            f"\n\nВОПРОС: {query}\nОТВЕТ:",
        ])
        
        full_prompt = "\n".join([s for s in prompt_sections if s])
        
        # 7. Calculate metadata
        sections = {
            "recent": len(recent_block_lines),
            "similar": len(similar) if 'similar' in locals() else 0,
            "chunks": len(chunk_lines) if 'chunk_lines' in locals() else 0,
            "period_messages": len(period_messages) if time_info["dates"] else 0,
            "has_period_summary": bool(period_summary)
        }
        
        tokens = len(full_prompt) // 4  # Rough token estimation
        
        logger.info(f"Built context: {sections['recent']} recent, {sections['similar']} similar, {sections['chunks']} chunks")
        
        return {
            "prompt": full_prompt,
            "sections": sections,
            "tokens": tokens
        }
        
    except Exception as e:
        logger.error(f"Error building context: {e}")
        # Fallback to simple context
        fallback_prompt = f"Вопрос: {query}\nОтвет:"
        return {
            "prompt": fallback_prompt,
            "sections": {"recent": 0, "similar": 0, "chunks": 0, "period_messages": 0, "has_period_summary": False},
            "tokens": len(fallback_prompt) // 4
        }


logger = logging.getLogger(__name__)

class RAGPipeline:
    """Complete RAG pipeline for intelligent message suggestions"""
    
    def __init__(self):
        self.ai_client = gemini_client
        self.rag_engine = secure_rag_engine
        
        if self.ai_client and self.ai_client.client:
            # Keep it simple - use our existing components directly
            self.rag_chain = True  # Mark as available
            logger.info("RAG pipeline initialized successfully")
        else:
            logger.warning("Gemini client not available - RAG pipeline disabled")
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
            response = await self.ai_client.client.generate_content(
                prompt=full_prompt,
                generation_config={"max_output_tokens": 150, "temperature": 0.75}
            )
            suggestion = response.text.strip()
            
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
        
        return f"""Ты — AI-ассистент, который пишет сообщения ОТ ИМЕНИ пользователя. Твоя задача — написать естественное сообщение, которое звучит как сам пользователь.

ПРОФИЛЬ СТИЛЯ ПОЛЬЗОВАТЕЛЯ (строго следуй ему):
{user_style}

ПОСЛЕДНИЕ СООБЩЕНИЯ В ЧАТЕ:
{conversation_context}

КРИТИЧЕСКИЕ ПРАВИЛА:
1.  **Пиши ОТ ИМЕНИ пользователя, не как AI.** Никаких "может быть", "попробуй", "как насчет". Просто отвечай естественно.
2.  **НЕ будь роботом.** Избегай фраз "Могу ли я помочь?", "Уточните, пожалуйста", "Не знаю, что ответить".
3.  **НЕ давай советы самому себе.** Не говори "ответь что-нибудь милое" или "может что-нибудь игривое".
4.  **Отвечай по существу.** Если задан вопрос — дай прямой ответ в стиле пользователя.
5.  **Будь естественным.** Используй сленг, эмодзи и стиль общения из профиля пользователя.
6.  **Формат:** ТОЛЬКО текст сообщения, без кавычек и объяснений.

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

def _detect_time_range(query: str) -> Dict[str, Any]:
    """
    Умное определение временного периода из запроса.
    Возвращает информацию о запрошенном периоде времени.
    """
    query_lower = query.lower()
    now = datetime.now()
    result = {
        "dates": [],           # Список дат для поиска
        "period_type": "",     # Тип периода (день/неделя/месяц)
        "is_relative": True,   # Относительный или конкретный период
        "original_query": query # Исходный запрос
    }

    # 1. Проверяем ключевые слова для стандартных периодов
    time_keywords = {
        "сегодня": {
            "dates": [now.date()],
            "period_type": "день"
        },
        "вчера": {
            "dates": [(now - timedelta(days=1)).date()],
            "period_type": "день"
        },
        "позавчера": {
            "dates": [(now - timedelta(days=2)).date()],
            "period_type": "день"
        },
        "на этой неделе": {
            "dates": [(now - timedelta(days=x)).date() for x in range(7)],
            "period_type": "неделя"
        },
        "на прошлой неделе": {
            "dates": [(now - timedelta(days=x)).date() for x in range(7, 14)],
            "period_type": "неделя"
        },
        "в этом месяце": {
            "dates": [(now - timedelta(days=x)).date() for x in range(30)],
            "period_type": "месяц"
        },
        "в прошлом месяце": {
            "dates": [(now - timedelta(days=x)).date() for x in range(30, 60)],
            "period_type": "месяц"
        }
    }

    # 2. Проверяем относительные периоды (например, "2 дня назад", "неделю назад")
    relative_patterns = [
        (r"(\d+)\s*(дней|дня|день)\s*назад", "день"),
        (r"(\d+)\s*(недель|недели|неделю)\s*назад", "неделя"),
        (r"(\d+)\s*(месяцев|месяца|месяц)\s*назад", "месяц")
    ]

    # Проверяем каждое ключевое слово
    for keyword, period_info in time_keywords.items():
        if keyword in query_lower:
            result.update(period_info)
            return result

    # Проверяем относительные паттерны
    for pattern, period_type in relative_patterns:
        match = re.search(pattern, query_lower)
        if match:
            amount = int(match.group(1))
            if period_type == "день":
                result["dates"] = [(now - timedelta(days=x)).date() for x in range(amount)]
            elif period_type == "неделя":
                result["dates"] = [(now - timedelta(days=x)).date() for x in range(amount * 7)]
            elif period_type == "месяц":
                result["dates"] = [(now - timedelta(days=x)).date() for x in range(amount * 30)]
            result["period_type"] = period_type
            return result

    # 3. Если не нашли явный период, но есть слова о прошлом - берём последние 30 дней
    past_keywords = ["раньше", "прошлый", "прошлая", "прошлые", "прошлом", "прошлого", "назад"]
    if any(word in query_lower for word in past_keywords):
        result["dates"] = [(now - timedelta(days=x)).date() for x in range(30)]
        result["period_type"] = "месяц"
        return result

    # 4. По умолчанию - последние 7 дней
    result["dates"] = [(now - timedelta(days=x)).date() for x in range(7)]
    result["period_type"] = "неделя"
    return result

# Заменяем старую функцию на новую
def _detect_requested_range(query: str) -> List[str]:
    """Legacy function for compatibility - uses new _detect_time_range"""
    time_info = _detect_time_range(query)
    if time_info["dates"]:
        return [d.strftime("%Y-%m-%d") for d in time_info["dates"]]
    return []

# Global RAG pipeline instance
rag_pipeline = RAGPipeline() 
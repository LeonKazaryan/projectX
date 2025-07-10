import os
import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import json
import logging

# Import our Gemini client instead of OpenAI
from .gemini_client import gemini_client

from .prompts import (
    MAIN_SYSTEM_PROMPT, 
    CASUAL_CONVERSATION_PROMPT,
    FORMAL_CONVERSATION_PROMPT,
    STYLE_ANALYSIS_PROMPT,
    QUICK_REPLY_PROMPTS
)

logger = logging.getLogger(__name__)

class MessageAnalyzer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            # Use our gemini_client singleton
            self.client = gemini_client
            if self.client.client:
                logger.info("Gemini client initialized successfully")
            else:
                logger.error("Failed to initialize Gemini client")
                self.client = None
        else:
            logger.warning("GEMINI_API_KEY not found. AI suggestions will be disabled.")
        
        self.user_styles: Dict[str, Dict] = {}  # Cache user writing styles
        self.conversation_contexts: Dict[str, List[Dict]] = {}  # Store conversation contexts
        self.recent_suggestions: Dict[str, Dict] = {}  # Cache recent suggestions to avoid repetition
        
    def _get_conversation_key(self, session_id: str, chat_id: int) -> str:
        """Generate unique key for conversation context"""
        return f"{session_id}:{chat_id}"
    
    def add_message_to_context(self, session_id: str, chat_id: int, message: Dict, max_messages: int = 20):
        """Add a message to conversation context with memory limit"""
        conv_key = self._get_conversation_key(session_id, chat_id)
        
        if conv_key not in self.conversation_contexts:
            self.conversation_contexts[conv_key] = []
        
        # Add message with timestamp
        message_with_timestamp = {
            **message,
            "timestamp": datetime.now().isoformat()
        }
        
        self.conversation_contexts[conv_key].append(message_with_timestamp)
        
        # Keep only the last N messages to manage memory
        if len(self.conversation_contexts[conv_key]) > max_messages:
            self.conversation_contexts[conv_key] = self.conversation_contexts[conv_key][-max_messages:]
    
    def get_conversation_context(self, session_id: str, chat_id: int, message_limit: int = 20) -> List[Dict]:
        """Get recent conversation context"""
        conv_key = self._get_conversation_key(session_id, chat_id)
        context = self.conversation_contexts.get(conv_key, [])
        return context[-message_limit:] if context else []
    
    def _analyze_conversation_tone(self, messages: List[Dict]) -> str:
        """Simple heuristic to determine if conversation is casual or formal"""
        if not messages:
            return "neutral"
        
        casual_indicators = 0
        formal_indicators = 0
        
        for msg in messages[-5:]:  # Check last 5 messages
            text = msg.get("text", "").lower()
            
            # Casual indicators
            if any(indicator in text for indicator in ["lol", "haha", "😂", "👍", "yo", "hey", "sup", "omg", "wtf"]):
                casual_indicators += 1
            
            # Formal indicators  
            if any(indicator in text for indicator in ["thank you", "please", "regards", "sincerely", "appreciate"]):
                formal_indicators += 1
                
            # Check punctuation and capitalization
            if text.endswith("!") or "..." in text:
                casual_indicators += 0.5
            if text.endswith(".") and text[0].isupper():
                formal_indicators += 0.5
        
        if casual_indicators > formal_indicators:
            return "casual"
        elif formal_indicators > casual_indicators:
            return "formal"
        else:
            return "neutral"
    
    def _get_user_messages(self, messages: List[Dict], user_id: int) -> List[Dict]:
        """Extract messages sent by the user to analyze their style"""
        return [msg for msg in messages if msg.get("sender_id") == user_id and msg.get("is_outgoing", False)]
    
    def _build_conversation_summary(self, messages: List[Dict], max_messages: int = 10) -> str:
        """Build a concise summary of recent conversation for AI context"""
        if not messages:
            return "No recent conversation context."
        
        recent_messages = messages[-max_messages:]
        summary_parts = []
        
        for msg in recent_messages:
            role = "User" if msg.get("is_outgoing", False) else "Contact"
            text = msg.get("text", "")[:100]  # Limit message length
            summary_parts.append(f"{role}: {text}")
        
        return "\n".join(summary_parts)
    
    async def analyze_user_style(self, session_id: str, chat_id: int, user_id: int) -> Dict:
        """Analyze user's writing style from their message history"""
        messages = self.get_conversation_context(session_id, chat_id, 50)
        user_messages = self._get_user_messages(messages, user_id)
        
        if len(user_messages) < 3:
            # Not enough data, return default style
            return {
                "formality": "neutral",
                "avg_length": 50,
                "uses_emojis": False,
                "uses_slang": False,
                "punctuation_style": "standard"
            }
        
        # Check if Gemini client is available
        if not self.client or not self.client.client:
            return self._get_heuristic_style_analysis(user_messages)
        
        # Build prompt for style analysis
        user_texts = [msg.get("text", "") for msg in user_messages[-10:]]
        user_text_sample = "\n".join(user_texts)
        
        try:
            # Use Gemini client to analyze user style
            prompt = f"{STYLE_ANALYSIS_PROMPT}\n\nAnalyze this user's writing style:\n\n{user_text_sample}\n\nRespond with JSON format containing: formality (casual/neutral/formal), avg_length (number), uses_emojis (boolean), uses_slang (boolean), punctuation_style (minimal/standard/formal)"
            
            response_text = await self.client.generate_text(prompt, temperature=0.1)
            if not response_text:
                return self._get_heuristic_style_analysis(user_messages)
            
            # Extract JSON from the response
            # Find JSON content between curly braces
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_content = response_text[json_start:json_end]
                style_analysis = json.loads(json_content)
                
                # Cache the analysis
                user_key = f"{session_id}:{user_id}"
                self.user_styles[user_key] = {
                    **style_analysis,
                    "last_updated": datetime.now().isoformat()
                }
                
                return style_analysis
            else:
                logger.warning("Could not extract JSON from Gemini response")
                return self._get_heuristic_style_analysis(user_messages)
            
        except Exception as e:
            logger.error(f"Error analyzing user style with Gemini: {e}")
            # Return basic analysis based on heuristics
            return self._get_heuristic_style_analysis(user_messages)
    
    def _get_heuristic_style_analysis(self, user_messages: List[Dict]) -> Dict:
        """Fallback style analysis using heuristics when OpenAI is not available"""
        if not user_messages:
            return {
                "formality": "neutral",
                "avg_length": 50,
                "uses_emojis": False,
                "uses_slang": False,
                "punctuation_style": "standard"
            }
        
        return {
            "formality": self._analyze_conversation_tone(user_messages),
            "avg_length": sum(len(msg.get("text", "")) for msg in user_messages) // len(user_messages),
            "uses_emojis": any("😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚☺️🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫🥱😴" in msg.get("text", "") for msg in user_messages),
            "uses_slang": any(word in msg.get("text", "").lower() for msg in user_messages for word in ["lol", "omg", "wtf", "brb", "tbh"]),
            "punctuation_style": "standard"
        }
    
    async def suggest_response(self, session_id: str, chat_id: int, user_id: int, memory_limit: int = 20, force_suggestion: bool = False) -> Optional[str]:
        """Generate AI response suggestion based on conversation context and user style"""
        try:
            # Check if Gemini client is available
            if not self.client or not self.client.client:
                return self._get_fallback_suggestion()
            
            # Get conversation context
            messages = self.get_conversation_context(session_id, chat_id, memory_limit)
            
            # Create a cache key based on conversation state
            cache_key = self._get_suggestion_cache_key(session_id, chat_id, messages)
            
            # Check if we recently suggested something for this exact context
            if cache_key in self.recent_suggestions and not force_suggestion:
                recent_suggestion = self.recent_suggestions[cache_key]
                # If we suggested something less than 5 minutes ago for the same context, don't suggest again
                suggestion_age = (datetime.now() - datetime.fromisoformat(recent_suggestion['timestamp'])).total_seconds()
                if suggestion_age < 300:  # 5 minutes
                    return None
            
            # Analyze user style
            user_style = await self.analyze_user_style(session_id, chat_id, user_id)
            
            # Determine the type of suggestion needed
            suggestion_type = self._determine_suggestion_type(messages, force_suggestion)
            
            if suggestion_type == "no_suggestion":
                return None
            
            # Generate appropriate suggestion based on type
            suggestion = None
            if suggestion_type == "response_to_message":
                suggestion = await self._generate_response_suggestion(messages, user_style, memory_limit)
            elif suggestion_type == "conversation_starter":
                suggestion = await self._generate_conversation_starter(messages, user_style, memory_limit)
            elif suggestion_type == "proactive_message":
                suggestion = await self._generate_proactive_suggestion(messages, user_style, memory_limit)
            
            # Cache the suggestion to prevent immediate repetition
            if suggestion:
                self.recent_suggestions[cache_key] = {
                    'suggestion': suggestion,
                    'suggestion_type': suggestion_type,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Clean up old cache entries (keep only last 50)
                if len(self.recent_suggestions) > 50:
                    oldest_keys = sorted(self.recent_suggestions.keys(), 
                                       key=lambda k: self.recent_suggestions[k]['timestamp'])[:10]
                    for old_key in oldest_keys:
                        del self.recent_suggestions[old_key]
            
            return suggestion
            
        except Exception as e:
            logger.error(f"Error generating response suggestion: {e}")
            return self._get_fallback_suggestion()
    
    def _detect_context_break(self, messages: List[Dict]) -> bool:
        """Detect if there's a context break (new greeting after long pause)"""
        if len(messages) < 2:
            return False
        
        last_message = messages[-1]
        
        # Check if last message is a greeting/simple question
        greeting_patterns = [
            "привет", "приветик", "привки", "хай", "хей", "hey", "hi", "hello",
            "как дела", "как дела?", "что делаешь", "что делаешь?", 
            "как поживаешь", "как ты", "что нового", "что нового?"
        ]
        
        last_text = last_message.get("text", "").lower().strip()
        is_greeting = any(pattern in last_text for pattern in greeting_patterns)
        
        if not is_greeting:
            return False
        
        # Check if there was a significant time gap
        if len(messages) >= 2:
            try:
                last_timestamp = datetime.fromisoformat(last_message['timestamp'])
                prev_message = messages[-2]
                prev_timestamp = datetime.fromisoformat(prev_message['timestamp'])
                
                time_gap_minutes = (last_timestamp - prev_timestamp).total_seconds() / 60
                
                # If gap is more than 2 hours and it's a greeting, consider it a context break
                if time_gap_minutes > 120 and is_greeting:
                    return True
                    
            except (KeyError, ValueError):
                pass
        
        return False

    def _determine_suggestion_type(self, messages: List[Dict], force_suggestion: bool) -> str:
        """Determine what type of suggestion to generate"""
        if not messages:
            return "conversation_starter"
        
        # Check for context break (greeting after long pause)
        if self._detect_context_break(messages):
            # Treat as a fresh greeting, ignore old context
            return "response_to_message"
        
        if force_suggestion:
            # Even with force, be smart about what to suggest
            last_message = messages[-1] if messages else None
            if last_message:
                # Check message age - don't suggest for very old messages
                try:
                    from datetime import datetime
                    if 'timestamp' in last_message:
                        msg_time = datetime.fromisoformat(last_message['timestamp'])
                        age_minutes = (datetime.now() - msg_time).total_seconds() / 60
                        if age_minutes > 30:  # Don't suggest for messages older than 30 minutes
                            return "no_suggestion"
                except Exception:
                    pass  # If timestamp parsing fails, continue with normal logic
                
                if not last_message.get("is_outgoing", False):
                    return "response_to_message"
                else:
                    return "proactive_message"
            else:
                return "conversation_starter"
        
        last_message = messages[-1]
        
        # If last message is incoming (not from user), suggest a response
        if not last_message.get("is_outgoing", False):
            # Check if this is a recent message
            try:
                from datetime import datetime
                if 'timestamp' in last_message:
                    msg_time = datetime.fromisoformat(last_message['timestamp'])
                    age_minutes = (datetime.now() - msg_time).total_seconds() / 60
                    if age_minutes > 10:  # Don't suggest for messages older than 10 minutes
                        return "no_suggestion"
            except Exception:
                pass
            return "response_to_message"
        
        # If last message is from user and conversation has been quiet, suggest follow-up
        if last_message.get("is_outgoing", False):
            # Check if there's been silence (no recent incoming messages)
            recent_incoming = [msg for msg in messages[-3:] if not msg.get("is_outgoing", False)]
            if not recent_incoming:
                # Check if user's message is recent enough to warrant a follow-up
                try:
                    from datetime import datetime
                    if 'timestamp' in last_message:
                        msg_time = datetime.fromisoformat(last_message['timestamp'])
                        age_minutes = (datetime.now() - msg_time).total_seconds() / 60
                        if age_minutes > 60:  # Don't suggest follow-ups for messages older than 1 hour
                            return "no_suggestion"
                        elif age_minutes < 5:  # Don't suggest follow-ups immediately
                            return "no_suggestion"
                except Exception:
                    pass
                return "proactive_message"
        
        return "no_suggestion"
    
    async def _generate_response_suggestion(self, messages: List[Dict], user_style: Dict, memory_limit: int) -> Optional[str]:
        """Generate a response to the last incoming message"""
        last_message = messages[-1]
        
        # Check if this is a context break (greeting after long pause)
        is_context_break = self._detect_context_break(messages)
        
        if is_context_break:
            # For context breaks, only use recent messages (ignore old conversation)
            recent_messages = [last_message]  # Only the greeting message
            conversation_summary = f"Contact: {last_message.get('text', '')}"
        else:
            # Normal conversation flow
            recent_messages = messages
            conversation_summary = self._build_conversation_summary(messages, memory_limit)
        
        conversation_tone = self._analyze_conversation_tone(recent_messages)
        
        # Select appropriate tone prompt
        tone_prompt = ""
        if conversation_tone == "casual":
            tone_prompt = CASUAL_CONVERSATION_PROMPT
        elif conversation_tone == "formal":
            tone_prompt = FORMAL_CONVERSATION_PROMPT
        
        # Special prompt for context breaks (greetings)
        context_instruction = ""
        if is_context_break:
            context_instruction = """
IMPORTANT: The contact is greeting you after a long pause in conversation. 
This is a fresh start, so respond naturally to the greeting. 
Don't reference old topics unless specifically asked.
Keep your response simple and appropriate for a greeting.
"""
        
        system_prompt = f"""
{MAIN_SYSTEM_PROMPT}

{tone_prompt}

{context_instruction}

User's Writing Style Analysis:
- Formality: {user_style.get('formality', 'neutral')}
- Average message length: {user_style.get('avg_length', 50)} characters
- Uses emojis: {user_style.get('uses_emojis', False)}
- Uses slang: {user_style.get('uses_slang', False)}
- Punctuation style: {user_style.get('punctuation_style', 'standard')}

Recent Conversation Context:
{conversation_summary}

Generate ONE appropriate response suggestion that matches the user's style and fits the conversation context. 
Keep it natural and authentic to how this user typically communicates.
Return ONLY the suggested message text, no explanations or additional formatting.
"""

        prompt = f"{system_prompt}\n\nThe contact just said: \"{last_message.get('text', '')}\"\n\nSuggest a response:"
        suggestion = await self.client.generate_text(
            prompt=prompt,
            temperature=0.7
        )
        
        if suggestion:
            return self._clean_suggestion(suggestion)
        else:
            return None
    
    async def _generate_conversation_starter(self, messages: List[Dict], user_style: Dict, memory_limit: int) -> Optional[str]:
        """Generate a conversation starter when there's no conversation history"""
        system_prompt = f"""
{MAIN_SYSTEM_PROMPT}

This is a new conversation with no message history. Generate a friendly conversation starter that matches the user's communication style.

User's Writing Style Analysis:
- Formality: {user_style.get('formality', 'neutral')}
- Average message length: {user_style.get('avg_length', 50)} characters
- Uses emojis: {user_style.get('uses_emojis', False)}
- Uses slang: {user_style.get('uses_slang', False)}
- Punctuation style: {user_style.get('punctuation_style', 'standard')}

Generate a natural greeting or conversation starter that feels authentic to this user's style.
Return ONLY the suggested message text, no explanations or additional formatting.
"""

        prompt = f"{system_prompt}\n\nGenerate a conversation starter:"
        suggestion = await self.client.generate_text(
            prompt=prompt,
            temperature=0.8
        )
        
        if suggestion:
            return self._clean_suggestion(suggestion)
        else:
            return None
    
    async def _generate_proactive_suggestion(self, messages: List[Dict], user_style: Dict, memory_limit: int) -> Optional[str]:
        """Generate a proactive message suggestion when the conversation has stalled"""
        conversation_summary = self._build_conversation_summary(messages, memory_limit)
        conversation_tone = self._analyze_conversation_tone(messages)
        
        system_prompt = f"""
{MAIN_SYSTEM_PROMPT}

The conversation seems to have stalled or the user might want to continue the discussion. 
Generate a natural follow-up message or conversation continuation that matches the user's style.

User's Writing Style Analysis:
- Formality: {user_style.get('formality', 'neutral')}
- Average message length: {user_style.get('avg_length', 50)} characters
- Uses emojis: {user_style.get('uses_emojis', False)}
- Uses slang: {user_style.get('uses_slang', False)}
- Punctuation style: {user_style.get('punctuation_style', 'standard')}

Recent Conversation Context:
{conversation_summary}

Generate a follow-up message that naturally continues the conversation or introduces a new topic.
Keep it casual and don't be pushy. Match the user's communication style.
Return ONLY the suggested message text, no explanations or additional formatting.
"""

        prompt = f"{system_prompt}\n\nSuggest a follow-up message to continue the conversation:"
        suggestion = await self.client.generate_text(
            prompt=prompt,
            temperature=0.8
        )
        
        if suggestion:
            return self._clean_suggestion(suggestion)
        else:
            return None
    
    def _clean_suggestion(self, suggestion: str) -> str:
        """Clean up the AI suggestion by removing quotes and formatting"""
        if not suggestion:
            return suggestion
        
        # Remove quotes if present
        if suggestion.startswith('"') and suggestion.endswith('"'):
            suggestion = suggestion[1:-1]
        if suggestion.startswith("'") and suggestion.endswith("'"):
            suggestion = suggestion[1:-1]
        
        # Remove common AI response prefixes
        prefixes_to_remove = [
            "Here's a suggestion: ",
            "You could say: ",
            "How about: ",
            "Try: ",
            "Suggested response: "
        ]
        
        for prefix in prefixes_to_remove:
            if suggestion.lower().startswith(prefix.lower()):
                suggestion = suggestion[len(prefix):]
        
        return suggestion.strip()
    
    def _get_fallback_suggestion(self) -> Optional[str]:
        """Return a fallback suggestion when Gemini is not available"""
        fallback_suggestions = [
            "Hey! How's it going?",
            "What's up?",
            "How are you doing?",
            "Hope you're having a good day!",
            "What have you been up to?",
            "How's your day going?",
            "Hey there!",
            "What's new?"
        ]
        
        import random
        return random.choice(fallback_suggestions)
    
    def clear_conversation_context(self, session_id: str, chat_id: int):
        """Clear conversation context for a specific chat"""
        conv_key = self._get_conversation_key(session_id, chat_id)
        if conv_key in self.conversation_contexts:
            del self.conversation_contexts[conv_key]
    
    def set_memory_limit(self, session_id: str, chat_id: int, limit: int):
        """Update memory limit for a specific conversation"""
        conv_key = self._get_conversation_key(session_id, chat_id)
        if conv_key in self.conversation_contexts:
            if len(self.conversation_contexts[conv_key]) > limit:
                self.conversation_contexts[conv_key] = self.conversation_contexts[conv_key][-limit:]

    def _get_suggestion_cache_key(self, session_id: str, chat_id: int, messages: List[Dict]) -> str:
        """Generate a cache key based on conversation state"""
        # Check for context break to ensure fresh suggestions
        is_context_break = self._detect_context_break(messages)
        
        if is_context_break:
            # For context breaks, use timestamp to ensure fresh suggestions
            timestamp = datetime.now().isoformat()[:16]  # minute precision
            return f"{session_id}:{chat_id}:context_break:{timestamp}"
        
        # Use last 2 messages to create context-sensitive cache key
        recent_messages = messages[-2:] if len(messages) >= 2 else messages
        message_summary = ""
        for msg in recent_messages:
            # Create a short hash of the message content and metadata
            content = f"{msg.get('text', '')[:50]}_{msg.get('is_outgoing', False)}_{msg.get('sender_id', '')}"
            message_summary += content
        
        import hashlib
        context_hash = hashlib.md5(message_summary.encode()).hexdigest()[:8]
        return f"{session_id}:{chat_id}:{context_hash}"

# Global instance
message_analyzer = MessageAnalyzer() 
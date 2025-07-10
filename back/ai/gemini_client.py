import os
import logging
import google.generativeai as genai
from typing import List, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Define the Chat class outside of GeminiClient
class Chat:
    def __init__(self, client_instance):
        self.client_instance = client_instance
        self.completions = self.Completions(client_instance)
    
    class Completions:
        def __init__(self, client_instance):
            self.client_instance = client_instance
        
        async def create(self, model: str, messages: List[Dict], max_tokens: int = 800, temperature: float = 0.7, response_format: Dict = None, **kwargs):
            """Mimic OpenAI's chat.completions.create method for compatibility"""
            try:
                if not self.client_instance or not self.client_instance.client:
                    logger.warning("Gemini client not available")
                    return None
                
                # Convert OpenAI-style messages to Gemini format
                system_prompt = ""
                user_prompt = ""
                
                for msg in messages:
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    
                    if role == "system":
                        system_prompt += content + "\n"
                    elif role == "user":
                        user_prompt += content + "\n"
                
                # Combine system and user prompts
                full_prompt = system_prompt + user_prompt
                
                # Add JSON format instruction if requested
                if response_format and response_format.get("type") == "json_object":
                    full_prompt += "\n\nIMPORTANT: You must respond with a valid JSON object only, without any additional text."
                
                # Generate response
                model = self.client_instance.client.GenerativeModel(self.client_instance.text_model)
                
                # Set generation config
                generation_config = {
                    "temperature": temperature,
                    "max_output_tokens": max_tokens
                }
                
                response = model.generate_content(full_prompt, generation_config=generation_config)
                
                # Create a response object that mimics OpenAI's response structure
                class Choice:
                    class Message:
                        def __init__(self, content):
                            self.content = content
                            self.role = "assistant"
                    
                    def __init__(self, text):
                        self.message = self.Message(text)
                
                class Response:
                    def __init__(self, text):
                        self.choices = [Choice(text)]
                
                return Response(response.text)
                
            except Exception as e:
                logger.error(f"Error in chat.completions.create: {e}")
                return None

class GeminiClient:
    """Client for Google Gemini API to replace OpenAI functionality"""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.client = genai
                logger.info("Gemini client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                self.client = None
        else:
            logger.warning("GEMINI_API_KEY not found. AI features will be disabled.")
            self.client = None
        
        # Default model for text generation
        self.text_model = "gemini-1.5-pro"
        # Default model for embeddings
        self.embedding_model = "embedding-001"
        
        # Add chat as an instance attribute
        self.chat = Chat(self)
        
    async def generate_text(self, prompt: str, max_tokens: int = 800, temperature: float = 0.7) -> Optional[str]:
        """Generate text using Gemini API"""
        if not self.client:
            logger.warning("Gemini client not available")
            return None
        
        try:
            model = self.client.GenerativeModel(self.text_model)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Error generating text with Gemini: {e}")
            return None
    
    async def generate_chat_response(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """Generate chat response from a list of messages"""
        if not self.client:
            logger.warning("Gemini client not available")
            return None
        
        try:
            model = self.client.GenerativeModel(self.text_model)
            chat = model.start_chat(history=[])
            
            # Process each message and add to chat
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("text", "")
                
                if role == "user":
                    chat.send_message(content)
                
            # Generate response to the last message
            if messages and messages[-1].get("role") == "user":
                response = chat.send_message(messages[-1].get("text", ""))
                return response.text
            else:
                # If the last message is not from user, add a generic prompt
                response = chat.send_message("Please continue the conversation.")
                return response.text
                
        except Exception as e:
            logger.error(f"Error generating chat response with Gemini: {e}")
            return None
    
    async def create_embedding(self, text: str) -> Optional[List[float]]:
        """Create embedding using Gemini API"""
        if not self.client:
            logger.warning("Gemini client not available")
            return None
        
        try:
            # Truncate text if too long (Gemini has different limits than OpenAI)
            if len(text) > 8000:
                text = text[:8000]
            
            # Create embedding
            embedding_model = self.client.get_embedding_model(self.embedding_model)
            result = embedding_model.embed_content(text)
            
            # Return the embedding values
            if hasattr(result, "embedding"):
                return result.embedding
            else:
                logger.warning("No embedding returned from Gemini API")
                return None
                
        except Exception as e:
            logger.error(f"Error creating embedding with Gemini: {e}")
            return None

# Create a singleton instance
gemini_client = GeminiClient() 
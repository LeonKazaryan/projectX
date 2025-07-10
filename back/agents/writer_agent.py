import logging
from typing import Dict, Any
from .base import Agent
from .agent_prompts import WRITER_AGENT_PROMPT

logger = logging.getLogger(__name__)

class WriterAgent(Agent):
    """
    Drafts a response based on persona and context.
    """
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Executing WriterAgent...")
        
        persona = state.get('persona_profile', 'A neutral and helpful assistant.')
        context = state.get('context', 'No specific context provided.')
        query = state.get('query', 'Could you help me?')
        
        # Format persona to handle both string and dict formats
        formatted_persona = persona
        if isinstance(persona, dict):
            try:
                formatted_persona = "\n".join([f"{k}: {v}" for k, v in persona.items()])
            except Exception as e:
                logger.error(f"WriterAgent: Error formatting persona: {e}")
                formatted_persona = str(persona)

        prompt = f"""
Persona Profile:
---
{formatted_persona}
---

Conversation Context:
---
{context}
---

User's Request: "{query}"

Based on the persona and context, please draft a response to the user's request.
Respond directly as if you are the user's contact. Do not include any explanations or meta-commentary.
"""
        
        try:
            response = await self.llm_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": WRITER_AGENT_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            try:
                draft_response = response.choices[0].message.content.strip()
                
                # Clean up common Gemini artifacts
                prefixes_to_remove = [
                    "Here's a draft response:",
                    "Draft response:",
                    "Response:",
                    "Here is a response:"
                ]
                
                for prefix in prefixes_to_remove:
                    if draft_response.startswith(prefix):
                        draft_response = draft_response[len(prefix):].strip()
                
                # Remove quotes if present
                if (draft_response.startswith('"') and draft_response.endswith('"')) or \
                   (draft_response.startswith("'") and draft_response.endswith("'")):
                    draft_response = draft_response[1:-1].strip()
                
                logger.info("WriterAgent: Successfully drafted a response.")
                state['draft_response'] = draft_response
                
            except Exception as e:
                logger.error(f"WriterAgent: Error processing response: {e}")
                state['draft_response'] = "Sorry, I'm having trouble generating a response right now."

        except Exception as e:
            logger.error(f"WriterAgent: Failed to draft a response. Error: {e}")
            state['draft_response'] = "Sorry, I'm having trouble generating a response right now."

        return state 
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

        prompt = f"""
Persona Profile:
---
{persona}
---

Conversation Context:
---
{context}
---

User's Request: "{query}"

Based on the persona and context, please draft a response to the user's request.
"""
        
        try:
            response = await self.llm_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": WRITER_AGENT_PROMPT},
                    {"role": "user", "content": prompt}
                ]
            )
            draft_response = response.choices[0].message.content
            logger.info("WriterAgent: Successfully drafted a response.")
            state['draft_response'] = draft_response

        except Exception as e:
            logger.error(f"WriterAgent: Failed to draft a response. Error: {e}")
            state['draft_response'] = f"Error drafting response: {e}"

        return state 
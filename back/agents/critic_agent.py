import logging
from typing import Dict, Any
from .base import Agent
from .agent_prompts import CRITIC_AGENT_PROMPT

logger = logging.getLogger(__name__)

class CriticAgent(Agent):
    """
    Reviews the draft response and refines it for authenticity and quality.
    """
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Executing CriticAgent...")
        
        draft_response = state.get('draft_response', '')
        persona = state.get('persona_profile', 'A neutral and helpful assistant.')

        if not draft_response:
            logger.warning("CriticAgent: No draft response to review.")
            state['final_response'] = "No draft available to review."
            return state

        prompt = f"""
Persona Profile:
---
{persona}
---

Draft Message to Review:
---
"{draft_response}"
---

Based on the Persona Profile, please review the draft. If it's perfect, just respond with the draft itself. If it needs improvement, rewrite it to be more authentic.
"""
        
        try:
            response = await self.llm_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": CRITIC_AGENT_PROMPT},
                    {"role": "user", "content": prompt}
                ]
            )
            final_response = response.choices[0].message.content
            logger.info("CriticAgent: Successfully reviewed and finalized the response.")
            state['final_response'] = final_response

        except Exception as e:
            logger.error(f"CriticAgent: Failed to review the response. Error: {e}")
            state['final_response'] = f"Error reviewing response: {e}"
        
        return state 
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
            
        # Format persona to handle both string and dict formats
        formatted_persona = persona
        if isinstance(persona, dict):
            try:
                formatted_persona = "\n".join([f"{k}: {v}" for k, v in persona.items()])
            except Exception as e:
                logger.error(f"CriticAgent: Error formatting persona: {e}")
                formatted_persona = str(persona)

        prompt = f"""
Persona Profile:
---
{formatted_persona}
---

Draft Message to Review:
---
"{draft_response}"
---

Based on the Persona Profile, please review the draft. If it's perfect, just respond with the draft itself. If it needs improvement, rewrite it to be more authentic.
IMPORTANT: Respond ONLY with the final message text. Do not include any explanations, formatting, or meta-commentary.
"""
        
        try:
            response = await self.llm_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": CRITIC_AGENT_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5
            )
            
            try:
                final_response = response.choices[0].message.content.strip()
                
                # Clean up common Gemini artifacts
                prefixes_to_remove = [
                    "Final response:",
                    "Improved response:",
                    "Here's the final response:",
                    "Here's the improved response:",
                    "Revised message:"
                ]
                
                for prefix in prefixes_to_remove:
                    if final_response.lower().startswith(prefix.lower()):
                        final_response = final_response[len(prefix):].strip()
                
                # Remove quotes if present
                if (final_response.startswith('"') and final_response.endswith('"')) or \
                   (final_response.startswith("'") and final_response.endswith("'")):
                    final_response = final_response[1:-1].strip()
                
                logger.info("CriticAgent: Successfully reviewed and finalized the response.")
                state['final_response'] = final_response
                
            except Exception as e:
                logger.error(f"CriticAgent: Error processing response: {e}")
                # Fall back to the draft response if there's an error
                state['final_response'] = draft_response

        except Exception as e:
            logger.error(f"CriticAgent: Failed to review the response. Error: {e}")
            # Fall back to the draft response if there's an error
            state['final_response'] = draft_response
        
        return state 
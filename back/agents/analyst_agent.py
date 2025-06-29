import logging
from typing import Dict, Any, List
from .base import Agent
from .agent_prompts import ANALYST_AGENT_PROMPT
import json

logger = logging.getLogger(__name__)

class AnalystAgent(Agent):
    """
    Analyzes user's message history to create a persona profile.
    """
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Executing AnalystAgent...")
        
        message_history: List[Dict] = state.get('message_history', [])
        if not message_history:
            logger.warning("AnalystAgent: No message history found.")
            state['persona_profile'] = "No message history available to create a persona."
            return state

        # Format the message history for the prompt
        formatted_history = "\n".join(
            [f"{msg['sender']}: {msg['text']}" for msg in message_history]
        )

        try:
            # Call the LLM to get the persona profile
            response = await self.llm_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": ANALYST_AGENT_PROMPT},
                    {"role": "user", "content": f"Here is the message history:\n\n{formatted_history}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            
            # The response is now a JSON object
            persona_profile = json.loads(response.choices[0].message.content)
            logger.info(f"AnalystAgent: Successfully generated persona profile (JSON).")
            state['persona_profile'] = persona_profile

        except Exception as e:
            logger.error(f"AnalystAgent: Failed to generate persona profile. Error: {e}")
            state['persona_profile'] = f"Error creating persona profile: {e}"

        return state 
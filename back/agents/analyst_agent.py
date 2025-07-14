import logging
from typing import Dict, Any, List
from .base import Agent
from .agent_prompts import ANALYST_AGENT_PROMPT
import json
import re

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
            [
                f"Вы: {msg['text']}" if msg.get('role') == 'Вы' else f"Собеседник: {msg['text']}"
                for msg in message_history
            ]
        )

        try:
            # Call the LLM to get the persona profile
            response = await self.llm_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": ANALYST_AGENT_PROMPT + "\n\nIMPORTANT: You MUST respond with a valid JSON object only. Do not include any text outside the JSON object."},
                    {"role": "user", "content": f"Here is the message history:\n\n{formatted_history}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            
            # Extract JSON from the response - with error handling for Gemini
            try:
                content = response.choices[0].message.content
                
                # Clean up the content - sometimes Gemini adds text before/after JSON
                json_match = re.search(r'(\{.*\})', content, re.DOTALL)
                if json_match:
                    content = json_match.group(1)
                
                # Try to parse the JSON
                persona_profile = json.loads(content)
                logger.info(f"AnalystAgent: Successfully generated persona profile (JSON).")
                
            except json.JSONDecodeError:
                # If JSON parsing fails, create a default profile
                logger.error(f"AnalystAgent: Failed to parse JSON from response: {content}")
                persona_profile = {
                    "communication_style": "neutral",
                    "interests": ["general topics"],
                    "personality_traits": ["helpful", "friendly"],
                    "background": "Unknown based on limited conversation history",
                    "relationship_context": "casual conversation"
                }
                
            state['persona_profile'] = persona_profile

        except Exception as e:
            logger.error(f"AnalystAgent: Failed to generate persona profile. Error: {e}")
            state['persona_profile'] = {
                "communication_style": "neutral",
                "interests": ["general topics"],
                "personality_traits": ["helpful", "friendly"],
                "background": "Unknown based on limited conversation history",
                "relationship_context": "casual conversation"
            }

        return state 
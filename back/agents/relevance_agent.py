import logging
from typing import Dict, Any, List
from .base import Agent
from .agent_prompts import RELEVANCE_AGENT_PROMPT
import json
import re

logger = logging.getLogger(__name__)

class RelevanceAgent(Agent):
    """
    Analyzes if the retrieved context is relevant to the last message in a conversation.
    """
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Executing RelevanceAgent...")
        
        last_message: Dict = state.get('last_message')
        context: str = state.get('context')

        if not last_message or not context:
            logger.warning("RelevanceAgent: Missing last_message or context.")
            state['is_context_relevant'] = False
            return state

        last_message_text = last_message.get('text', '')
        
        # Avoid checking relevance for simple greetings or context-free messages
        if len(last_message_text.split()) < 4 and "?" not in last_message_text:
             logger.info("RelevanceAgent: Last message is too short, assuming context is not needed.")
             state['is_context_relevant'] = False
             state['context'] = "No relevant context needed for a short greeting."
             return state

        try:
            prompt_input = f"""
            Last Message: "{last_message_text}"

            Retrieved Context from past conversations:
            ---
            {context}
            ---

            Is the retrieved context relevant for forming a reply to the last message?
            Answer with only a JSON object with a single key "is_relevant" and a boolean value (true or false).
            """

            response = await self.llm_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": RELEVANCE_AGENT_PROMPT + "\n\nIMPORTANT: You MUST respond with a valid JSON object only. Do not include any text outside the JSON object."},
                    {"role": "user", "content": prompt_input}
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
                result = json.loads(content)
                is_relevant = result.get("is_relevant", False)
                
                logger.info(f"RelevanceAgent: Context relevance evaluated as: {is_relevant}")
                state['is_context_relevant'] = is_relevant
                
                if not is_relevant:
                    state['context'] = "Retrieved context was not relevant to the last message."
                    
            except json.JSONDecodeError:
                logger.error(f"RelevanceAgent: Failed to parse JSON from response: {content}")
                state['is_context_relevant'] = False
                state['context'] = "Error parsing relevance evaluation. Treating context as not relevant."

        except Exception as e:
            logger.error(f"RelevanceAgent: Failed to evaluate context relevance. Error: {e}")
            state['is_context_relevant'] = False # Default to irrelevant on error
            state['context'] = f"Error evaluating context relevance: {e}"

        return state 
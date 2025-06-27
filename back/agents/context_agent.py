import logging
from typing import Dict, Any
from .base import Agent
from ai.secure_rag_engine import secure_rag_engine
from telegram.telegram_client import TelegramClientManager

logger = logging.getLogger(__name__)

class ContextAgent(Agent):
    """
    Fetches relevant conversation history using the RAG engine and Telegram client.
    """
    def __init__(self, llm_client: Any, telegram_manager: TelegramClientManager):
        super().__init__(llm_client)
        self.telegram_manager = telegram_manager

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Executing ContextAgent...")

        query = state.get('query')
        if not query:
            logger.warning("ContextAgent: No query found in state.")
            state['context'] = "No query provided for context retrieval."
            return state

        session_id = state.get('session_id')
        chat_id = state.get('chat_id')

        if not session_id or not chat_id:
            logger.error("ContextAgent: session_id or chat_id missing from state.")
            state['context'] = "Missing session_id or chat_id for context retrieval."
            return state

        try:
            # 1. Find similar message IDs using RAG
            similar_message_ids = await secure_rag_engine.find_similar_messages_secure(
                session_id=session_id,
                chat_id=chat_id,
                query_text=query,
                limit=5
            )

            message_ids_to_fetch = [msg['payload']['message_id'] for msg in similar_message_ids if msg['payload']]
            
            if not message_ids_to_fetch:
                state['context'] = "No similar messages found in the conversation history."
                return state

            # 2. Fetch full message content using Telegram client
            client = await self.telegram_manager.get_client(session_id)
            full_messages = await client.get_messages(chat_id, ids=message_ids_to_fetch)
            
            # 3. Format the context for the AI agents
            formatted_context = "\n".join(
                [f"Similar message from past: '{msg.text}'" for msg in full_messages if msg and msg.text]
            )

            # 4. Also store similar messages for the frontend
            similar_messages_for_frontend = [
                msg.text for msg in full_messages if msg and msg.text
            ]

            if not formatted_context:
                formatted_context = "Could not retrieve full text for similar messages."
                similar_messages_for_frontend = []

            logger.info(f"ContextAgent: Successfully retrieved context for query: '{query}'")
            state['context'] = formatted_context
            state['similar_messages'] = similar_messages_for_frontend

        except Exception as e:
            logger.error(f"ContextAgent: Failed to retrieve context. Error: {e}")
            state['context'] = f"Error retrieving context: {e}"

        return state 
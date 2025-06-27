import logging
from typing import Dict, Any, List
from .base import Agent
from .analyst_agent import AnalystAgent
from .context_agent import ContextAgent
from .writer_agent import WriterAgent
from .critic_agent import CriticAgent
from telegram.telegram_client import TelegramClientManager

logger = logging.getLogger(__name__)

class ChiefAgent:
    """
    The orchestrator of the multi-agent system.
    It manages the workflow by calling specialized agents in a specific sequence
    to generate a personalized, context-aware, and refined response.
    """
    def __init__(self, llm_client: Any, telegram_manager: TelegramClientManager):
        self.llm_client = llm_client
        self.telegram_manager = telegram_manager
        self.agent_workflow: List[Agent] = [
            AnalystAgent(llm_client),
            ContextAgent(llm_client, telegram_manager),
            WriterAgent(llm_client),
            CriticAgent(llm_client)
        ]

    async def execute(self, initial_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the full agentic workflow.
        """
        state = initial_state.copy()
        logger.info(f"ChiefAgent: Starting workflow with initial state: {state}")
        
        for agent in self.agent_workflow:
            agent_name = agent.get_name()
            logger.info(f"ChiefAgent: Handing over to {agent_name}...")
            try:
                state = await agent.execute(state)
                logger.info(f"ChiefAgent: {agent_name} finished execution.")
            except Exception as e:
                logger.error(f"ChiefAgent: Error during execution of {agent_name}. Error: {e}")
                state['error'] = f"An error occurred in {agent_name}: {e}"
                return state

        logger.info("ChiefAgent: Workflow finished successfully.")
        return state 
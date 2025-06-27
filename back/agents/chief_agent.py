import logging
from typing import Dict, Any, List
from .base import Agent
from .analyst_agent import AnalystAgent
from .context_agent import ContextAgent
from .relevance_agent import RelevanceAgent
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
            RelevanceAgent(llm_client),
            WriterAgent(llm_client),
            CriticAgent(llm_client)
        ]

    async def execute(self, initial_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the full agentic workflow.
        """
        state = initial_state.copy()
        logger.info(f"ChiefAgent: Starting workflow with initial state: {state}")
        
        # 1. Analyze user's persona
        analyst = AnalystAgent(self.llm_client)
        state = await self._run_agent(analyst, state)
        if state.get('error'): return state

        # 2. Retrieve context from RAG
        context_agent = ContextAgent(self.llm_client, self.telegram_manager)
        state = await self._run_agent(context_agent, state)
        if state.get('error'): return state

        # 3. Check if the retrieved context is relevant
        relevance_agent = RelevanceAgent(self.llm_client)
        state = await self._run_agent(relevance_agent, state)
        if state.get('error'): return state

        # If context is not relevant, we can pass this info to the writer
        if not state.get('is_context_relevant', True):
            logger.info("ChiefAgent: Context is not relevant. Writer will rely on persona and last message only.")
            # The context field is already updated by the RelevanceAgent
            pass

        # 4. Draft the initial response
        writer = WriterAgent(self.llm_client)
        state = await self._run_agent(writer, state)
        if state.get('error'): return state

        # 5. Critique and refine the response
        critic = CriticAgent(self.llm_client)
        state = await self._run_agent(critic, state)
        if state.get('error'): return state
        
        logger.info("ChiefAgent: Workflow finished successfully.")
        return state

    async def _run_agent(self, agent: Agent, state: Dict[str, Any]) -> Dict[str, Any]:
        """Helper to run a single agent and handle errors."""
        agent_name = agent.get_name()
        logger.info(f"ChiefAgent: Handing over to {agent_name}...")
        try:
            state = await agent.execute(state)
            logger.info(f"ChiefAgent: {agent_name} finished execution.")
        except Exception as e:
            logger.error(f"ChiefAgent: Error during execution of {agent_name}. Error: {e}")
            state['error'] = f"An error occurred in {agent_name}: {e}"
        return state 
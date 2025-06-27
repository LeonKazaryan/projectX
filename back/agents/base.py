from abc import ABC, abstractmethod
from typing import Dict, Any

class Agent(ABC):
    """
    Abstract Base Class for all agents in the multi-agent system.
    It defines the common interface for executing an agent's task.
    """
    def __init__(self, llm_client: Any):
        self.llm_client = llm_client

    @abstractmethod
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's logic.

        Args:
            state (Dict[str, Any]): The current state of the workflow, 
                                    containing all necessary data.

        Returns:
            Dict[str, Any]: An updated state with the results of the agent's execution.
        """
        pass

    def get_name(self) -> str:
        """
        Returns the name of the agent class.
        """
        return self.__class__.__name__ 
// RAG Service for Telegram Client
// Handles communication with backend RAG API

interface Message {
  id: number;
  text: string;
  date: string;
  sender_id?: number;
  is_outgoing: boolean;
}

interface RAGSearchResult {
  score: number;
  message: any;
  relevance: string;
}

interface RAGContext {
  recent_messages: any[];
  similar_messages: RAGSearchResult[];
  total_context_items: number;
  rag_enhanced: boolean;
}

interface EnhancedSuggestion {
  suggestion: string;
  rag_enhanced: boolean;
  context_sources: {
    traditional_messages?: number;
    rag_recent_messages?: number;
    similar_messages?: number;
    total_context?: number;
    traditional_only?: boolean;
  };
  similar_context?: string[];
}

export class RAGService {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000/api/rag') {
    this.baseURL = baseURL;
  }

  /**
   * Add a single message to RAG vector store
   */
  async addMessage(sessionId: string, chatId: number, message: Message): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/store_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId,
          messages: [message] // The endpoint expects a list of messages
        })
      });

      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      console.error('Error adding message to RAG:', error);
      return false;
    }
  }

  /**
   * Add multiple messages to RAG in bulk (for chat history sync)
   */
  async addMessagesBulk(sessionId: string, chatId: number, messages: Message[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/store_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId,
          messages: messages
        })
      });

      const data = await response.json();
      console.log(`RAG: Bulk added ${data.stored_count} messages`);
      return data.status === "success";
    } catch (error) {
      console.error('Error adding bulk messages to RAG:', error);
      return false;
    }
  }

  /**
   * Search for similar messages in conversation history
   */
  async searchSimilarMessages(
    sessionId: string, 
    chatId: number, 
    query: string, 
    limit: number = 5,
    scoreThreshold: number = 0.7
  ): Promise<RAGSearchResult[]> {
    try {
      const response = await fetch(`${this.baseURL}/search-similar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId,
          query: query,
          limit: limit,
          score_threshold: scoreThreshold
        })
      });

      const data = await response.json();
      if (data.success) {
        return data.similar_messages;
      }
      return [];
    } catch (error) {
      console.error('Error searching similar messages:', error);
      return [];
    }
  }

  /**
   * Get enhanced conversation context using RAG
   */
  async getEnhancedContext(
    sessionId: string, 
    chatId: number, 
    currentMessage: string,
    contextLimit: number = 10
  ): Promise<RAGContext | null> {
    try {
      const response = await fetch(`${this.baseURL}/get-enhanced-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId,
          current_message: currentMessage,
          context_limit: contextLimit
        })
      });

      const data = await response.json();
      if (data.success) {
        return data.context;
      }
      return null;
    } catch (error) {
      console.error('Error getting enhanced context:', error);
      return null;
    }
  }

  /**
   * Get AI suggestion enhanced with RAG context (DEPRECATED - use getAgentResponse instead)
   */
  async getEnhancedSuggestion(
    sessionId: string, 
    chatId: number, 
    userId: number,
    currentMessage: string = "",
    useRAG: boolean = true,
    recentMessages: Message[] = []
  ): Promise<EnhancedSuggestion | null> {
    try {
      const response = await fetch(`${this.baseURL}/suggest-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId,
          user_id: userId,
          current_message: currentMessage,
          use_rag: useRAG,
          recent_messages: recentMessages,
        })
      });

      const data = await response.json();
      if (data.success) {
        return {
          suggestion: data.suggestion,
          rag_enhanced: data.rag_enhanced,
          context_sources: data.context_sources,
          similar_context: data.similar_context
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting enhanced suggestion:', error);
      return null;
    }
  }

  /**
   * Get AI response using our new multi-agent system
   * This is the new, improved method that replaces getEnhancedSuggestion
   */
  async getAgentResponse(
    sessionId: string, 
    chatId: number, 
    query: string,
    recentMessages: Message[] = []
  ): Promise<EnhancedSuggestion | null> {
    try {
      // Format message history for the agents
      const messageHistory = recentMessages.map(msg => ({
        sender: msg.is_outgoing ? "user" : "contact",
        text: msg.text
      }));

      const response = await fetch(`http://localhost:8000/api/ai/generate-agent-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId,
          query: query,
          message_history: messageHistory
        })
      });

      const data = await response.json();
      if (data.success) {
        // Format the response to match the expected EnhancedSuggestion interface
        return {
          suggestion: data.response,
          rag_enhanced: true, // Our agent system is always RAG-enhanced
          context_sources: {
            rag_recent_messages: messageHistory.length,
            similar_messages: data.debug_data?.similar_messages?.length || 0,
            total_context: messageHistory.length + (data.debug_data?.similar_messages?.length || 0),
            traditional_only: false
          },
          similar_context: data.debug_data?.similar_messages || []
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting agent response:', error);
      return null;
    }
  }

  /**
   * Sync chat history with RAG system
   */
  async syncChatHistory(sessionId: string, chatId: number, limit: number = 100): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/sync-telegram-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId,
          message_limit: limit,
          force_resync: false
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log(`RAG: Started syncing messages for chat ${chatId}. Message: ${data.message}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error syncing chat history:', error);
      return false;
    }
  }

  /**
   * Get RAG engine statistics
   */
  async getRAGStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/stats`);
      const data = await response.json();
      if (data.success) {
        return data.stats;
      }
      return null;
    } catch (error) {
      console.error('Error getting RAG stats:', error);
      return null;
    }
  }

  /**
   * Clear RAG history for a chat
   */
  async clearChatHistory(sessionId: string, chatId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/clear-chat/${sessionId}/${chatId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return false;
    }
  }

  /**
   * Auto-sync messages when a chat is selected
   */
  async autoSyncOnChatSelection(sessionId: string, chatId: number): Promise<void> {
    try {
      // Check if this chat has been synced recently
      const lastSyncKey = `rag_last_sync_${sessionId}_${chatId}`;
      const lastSync = localStorage.getItem(lastSyncKey);
      const now = Date.now();
      
      // Sync if more than 1 hour has passed or never synced
      const shouldSync = !lastSync || (now - parseInt(lastSync)) > 3600000; // 1 hour
      
      if (shouldSync) {
        console.log(`RAG: Auto-syncing chat ${chatId}...`);
        const success = await this.syncChatHistory(sessionId, chatId, 50);
        
        if (success) {
          localStorage.setItem(lastSyncKey, now.toString());
          console.log(`RAG: Auto-sync completed for chat ${chatId}`);
        }
      } else {
        console.log(`RAG: Chat ${chatId} recently synced, skipping`);
      }
    } catch (error) {
      console.error('Error in auto-sync:', error);
    }
  }
}

// Export singleton instance
export const ragService = new RAGService(); 
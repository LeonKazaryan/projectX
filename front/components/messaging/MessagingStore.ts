import { create } from "zustand";
import { TelegramProvider } from "./TelegramProvider";
import { WhatsAppProvider } from "./WhatsAppProvider";
import { getMessages, saveMessage, setMessages } from "../utils/localMessageStore";
import type { Chat, Message, MessagingEvent, IMessagingProvider } from "./types";

interface MessagingState {
  // Providers
  providers: Record<string, IMessagingProvider>;
  activeProvider: string | null;
  
  // Data
  chats: Chat[];
  messages: Record<string, Message[]>;
  selectedChat: Chat | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  showArchived: boolean;
  showReadOnly: boolean;
  showGroups: boolean;
  unifiedView: boolean; // Feature flag for future merge view
  
  // Actions
  initializeProviders: () => void;
  connectProvider: (source: 'telegram' | 'whatsapp') => Promise<boolean>;
  disconnectProvider: (source: 'telegram' | 'whatsapp') => Promise<void>;
  loadChats: (source?: 'telegram' | 'whatsapp') => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  refreshMessages: (chatId: string) => Promise<void>;
  sendMessage: (source: 'telegram' | 'whatsapp', chatId: string, text: string) => Promise<void>;
  selectChat: (chat: Chat | null) => void;
  handleEvent: (event: MessagingEvent) => void;
  updateSettings: (settings: Partial<{
    showArchived: boolean;
    showReadOnly: boolean;
    showGroups: boolean;
    unifiedView: boolean;
  }>) => void;
  
  // Selectors
  getFilteredChats: () => Chat[];
  getChatMessages: (chatId: string) => Message[];
  getProviderStatus: (source: 'telegram' | 'whatsapp') => boolean;
  resetAllProviders: () => Promise<void>;
  clearAllUserSessions: () => void;
  restoreProviderStates: () => Promise<void>;
}

// Local storage helpers for caching
function getCachedMessages(chatId: string): Message[] {
  try {
    const cached = localStorage.getItem(`chathut_messages_${chatId}`);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function setCachedMessages(chatId: string, messages: Message[]) {
  try {
    localStorage.setItem(`chathut_messages_${chatId}`, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to cache messages:', error);
  }
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  // Initial state
  providers: {},
  activeProvider: null,
  chats: [],
  messages: {},
  selectedChat: null,
  isLoading: false,
  error: null,
  showArchived: false,
  showReadOnly: false,
  showGroups: true,
  unifiedView: false,

  // Initialize providers
  initializeProviders: () => {
    const providers: Record<string, IMessagingProvider> = {
      telegram: new TelegramProvider(),
      whatsapp: new WhatsAppProvider(),
    };
    set({ providers });
  },

  // Connect to a provider
  connectProvider: async (source) => {
    const { providers } = get();
    const provider = providers[source];
    
    if (!provider) {
      console.error(`Provider ${source} not found`);
      return false;
    }
    
    try {
      const success = await provider.connect();
      if (success) {
        set({ activeProvider: source });
        // Auto-load chats after successful connection
        await get().loadChats(source);
      }
      return success;
    } catch (error) {
      console.error(`Failed to connect ${source}:`, error);
      set({ error: `Failed to connect ${source}: ${error}` });
      return false;
    }
  },

  // Disconnect from a provider
  disconnectProvider: async (source) => {
    const { providers } = get();
    const provider = providers[source];
    
    if (!provider) return;

    try {
      await provider.disconnect();
      if (get().activeProvider === source) {
      set({ activeProvider: null });
      }
    } catch (error) {
      console.error(`Failed to disconnect ${source}:`, error);
    }
  },

  // Load chats from a provider
  loadChats: async (source) => {
    const { providers } = get();

      if (source) {
        const provider = providers[source];
      if (!provider) return;

      set({ isLoading: true });
      try {
        const newChats = await provider.getChats();
          set((state) => ({
          chats: [...state.chats.filter(c => c.source !== source), ...newChats],
          }));
      } catch (error) {
        set({ error: `Failed to load ${source} chats: ${error}` });
      } finally {
        set({ isLoading: false });
        }
      } else {
      // Load from all providers
      set({ isLoading: true });
      try {
        const allChats: Chat[] = [];
        for (const [source, provider] of Object.entries(providers)) {
          try {
            const chats = await provider.getChats();
            allChats.push(...chats);
          } catch (error) {
            console.error(`Failed to load ${source} chats:`, error);
          }
        }
        set({ chats: allChats });
    } catch (error) {
      set({ error: `Failed to load chats: ${error}` });
    } finally {
      set({ isLoading: false });
      }
    }
  },

  // Load messages for a specific chat from provider
  loadMessages: async (chatId: string) => {
    const { chats, providers } = get();

    // Validate chatId
    if (!chatId || typeof chatId !== 'string') {
      console.warn('Invalid chatId for loadMessages:', chatId);
      return;
    }
    
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) {
      console.warn('Chat not found in store for chatId:', chatId);
      return;
    }

    // Get the provider for this chat's source
    const provider = providers[chat.source];
    if (!provider) {
      console.warn(`Provider ${chat.source} not found for chat:`, chatId);
      return;
    }

    try {
      console.log(`📡 Loading messages from ${chat.source} provider for chat:`, chatId);
      
      // Load fresh messages from the provider
      const freshMessages = await provider.loadHistory(chatId);
      console.log(`📨 Loaded ${freshMessages.length} messages from ${chat.source}`);
      
      // Update store with fresh messages
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: freshMessages,
        },
      }));

      // Save to local storage for caching
      try {
        await setMessages(chatId, freshMessages);
      } catch (error) {
        console.warn('Failed to save messages to local storage:', error);
      }

    } catch (error) {
      console.error(`Failed to load messages from ${chat.source}:`, error);
      
      // Fallback: try to load from local storage
      try {
        const localMessages = await getMessages(chatId);
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: localMessages,
          },
        }));
      } catch (localError) {
        console.error('Failed to load messages from local storage:', localError);
        set({ error: `Failed to load messages: ${error}` });
      }
    }
  },

  // Refresh messages - NOW ONLY FROM LOCAL STORAGE
  refreshMessages: async (chatId: string) => {
    const { chats } = get();
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) return;

    console.log(`Refreshing messages for chat: ${chatId}`);

    try {
      // Just reload from local storage
      const messages = await getMessages(chatId);
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: messages
        }
      }));
      console.log(`Refreshed ${messages.length} messages for ${chatId}`);
    } catch (error) {
      console.error(`Failed to refresh messages for ${chatId}:`, error);
    }
  },

  // Send a message
  sendMessage: async (source, chatId, text) => {
    const { providers } = get();
    const provider = providers[source];
    
    if (!provider) {
      throw new Error(`Provider ${source} not found`);
    }

    try {
      // Send message through provider
      if (provider.sendMessage) {
      await provider.sendMessage(chatId, text);
      }
      
      // Save message to local storage
      const newMessage: Message = {
        id: Date.now().toString(),
        chatId,
        from: 'You',
        text,
        timestamp: new Date().toISOString(),
        source,
        isOutgoing: true,
      };
      
      await saveMessage(chatId, newMessage);
      
      // Update local state
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: [...(state.messages[chatId] || []), newMessage],
        },
      }));
    } catch (error) {
      console.error(`Failed to send message via ${source}:`, error);
      throw error;
    }
  },

  // Select a chat
  selectChat: (chat) => {
    set({ selectedChat: chat });
    if (chat) {
      // Auto-load messages for selected chat
      get().loadMessages(chat.id);
    }
  },

  // Handle messaging events
  handleEvent: (event) => {
    const { messages } = get();
    
    if (event.type === "message:new") {
      const messageData = event.data as Message;
      
      set((state) => ({
        messages: {
            ...state.messages,
          [messageData.chatId]: [...(state.messages[messageData.chatId] || []), messageData],
        },
      }));
        
      // Save new message to local storage
      saveMessage(messageData.chatId, messageData).catch(console.error);
    }
  },

  // Update settings
  updateSettings: (settings) => {
    set(settings);
  },

  // Selectors
  getFilteredChats: () => {
    const { chats, showArchived, showReadOnly, showGroups } = get();
    return chats.filter((chat) => {
      if (!showArchived && chat.isArchived) return false;
      if (!showReadOnly && !chat.canSendMessages) return false;
      if (!showGroups && (chat.isGroup || chat.isChannel)) return false;
      return true;
    });
  },

  getChatMessages: (chatId) => {
    const { messages } = get();
    return messages[chatId] || [];
  },

  getProviderStatus: (source) => {
    const { providers } = get();
    const provider = providers[source];
    return provider ? provider.isConnected() : false;
  },

  // Reset all providers
  resetAllProviders: async () => {
    const { providers } = get();
    
    for (const provider of Object.values(providers)) {
        try {
          if (provider.reset) {
            await provider.reset();
          }
        } catch (error) {
        console.error('Failed to reset provider:', error);
        }
    }
    
    set({
      chats: [],
      messages: {},
      selectedChat: null,
      activeProvider: null,
      error: null,
    });
  },

  // Clear all user sessions
  clearAllUserSessions: () => {
    const { providers } = get();
    
    for (const provider of Object.values(providers)) {
      try {
        if (provider.clearAllSessions) {
          provider.clearAllSessions();
        }
      } catch (error) {
        console.error('Failed to clear provider sessions:', error);
      }
    }
  },

  // Restore provider states
  restoreProviderStates: async () => {
    const { providers } = get();
    
    for (const [source, provider] of Object.entries(providers)) {
      try {
        console.log(`🔄 Checking ${source} provider state...`);
        
        // Try to restore from saved session first
        if (provider.init) {
          const restored = await provider.init();
          if (restored) {
            console.log(`✅ ${source} provider restored from saved session`);
            await get().loadChats(source as 'telegram' | 'whatsapp');
            continue;
          }
        }
        
        // Check if already connected
        if (provider.isConnected()) {
          console.log(`${source} provider already connected, loading chats...`);
          await get().loadChats(source as 'telegram' | 'whatsapp');
        }
      } catch (error) {
        console.error(`Failed to restore ${source} provider state:`, error);
      }
    }
  },
})); 
import { create } from 'zustand';
import type { Chat, Message, MessagingEvent, IMessagingProvider } from './types';
import { TelegramProvider } from './TelegramProvider';
import { WhatsAppProvider } from './WhatsAppProvider';

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
  sendMessage: (chatId: string, text: string) => Promise<boolean>;
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
  showReadOnly: true,
  showGroups: true,
  unifiedView: false,

  // Initialize providers
  initializeProviders: () => {
    const providers = {
      telegram: new TelegramProvider(),
      whatsapp: new WhatsAppProvider(),
    };
    
    set({ providers });
    
    // Subscribe to events from all providers
    Object.values(providers).forEach(provider => {
      provider.subscribe((event) => get().handleEvent(event));
    });
  },

  // Connect to a specific provider
  connectProvider: async (source) => {
    const { providers } = get();
    const provider = providers[source];
    
    if (!provider) {
      set({ error: `Provider ${source} not found` });
      return false;
    }

    set({ isLoading: true, error: null });
    
    try {
      const success = await provider.connect();
      if (success) {
        set({ activeProvider: source });
        await get().loadChats(source);
      } else {
        set({ error: `Failed to connect to ${source}` });
      }
      return success;
    } catch (error) {
      set({ error: `Error connecting to ${source}: ${error}` });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Disconnect from a provider
  disconnectProvider: async (source) => {
    const { providers } = get();
    const provider = providers[source];
    
    if (provider) {
      await provider.disconnect();
      set({ activeProvider: null });
    }
  },

  // Load chats for a specific provider or all
  loadChats: async (source) => {
    const { providers } = get();
    set({ isLoading: true });

    try {
      if (source) {
        const provider = providers[source];
        if (provider && provider.isConnected()) {
          const chats = await provider.getChats();
          set((state) => ({
            chats: state.unifiedView 
              ? [...state.chats.filter(c => c.source !== source), ...chats]
              : chats
          }));
        }
      } else {
        // Load from all connected providers
        const allChats: Chat[] = [];
        for (const [sourceKey, provider] of Object.entries(providers)) {
          if (provider.isConnected()) {
            const chats = await provider.getChats();
            allChats.push(...chats);
          }
        }
        set({ chats: allChats });
      }
    } catch (error) {
      set({ error: `Failed to load chats: ${error}` });
    } finally {
      set({ isLoading: false });
    }
  },

  // Load messages for a specific chat
  loadMessages: async (chatId: string) => {
    const { providers, chats, messages } = get();
    
    // Don't reload if messages already exist for this chat
    if (messages[chatId] && messages[chatId].length > 0) {
      console.log(`Messages already loaded for ${chatId}, skipping`);
      return;
    }
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const provider = providers[chat.source];
    if (!provider) return;

    console.log(`Loading messages for chat: ${chatId}`);
    set({ isLoading: true });

    try {
      const messages = await provider.loadHistory(chatId);
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: messages
        }
      }));
      console.log(`Loaded ${messages.length} messages for ${chatId}`);
    } catch (error) {
      console.error(`Failed to load messages for ${chatId}:`, error);
      set({ error: `Failed to load messages: ${error}` });
    } finally {
      set({ isLoading: false });
    }
  },

  // Send a message
  sendMessage: async (chatId: string, text: string) => {
    const { providers, chats } = get();
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) return false;

    const provider = providers[chat.source];
    if (!provider) return false;

    try {
      const success = await provider.sendMessage(chatId, text);
      if (success) {
        // Reload messages to get the new one
        await get().loadMessages(chatId);
      }
      return success;
    } catch (error) {
      set({ error: `Failed to send message: ${error}` });
      return false;
    }
  },

  // Select a chat
  selectChat: (chat) => {
    set({ selectedChat: chat });
    // Don't auto-load messages here - let the component handle it
  },

  // Handle events from providers
  handleEvent: (event: MessagingEvent) => {
    switch (event.type) {
      case 'message:new':
        const newMessage = event.data as Message;
        set((state) => ({
          messages: {
            ...state.messages,
            [newMessage.chatId]: [
              ...(state.messages[newMessage.chatId] || []),
              newMessage
            ]
          }
        }));
        // Reload chats to update last message
        get().loadChats();
        break;
        
      case 'chat:updated':
        // Reload chats to get updates
        get().loadChats();
        break;
        
      case 'status:changed':
        // Handle connection status changes
        break;
    }
  },

  // Update settings
  updateSettings: (settings) => {
    set(settings);
    // Reload chats with new filters
    get().loadChats();
  },

  // Selectors
  getFilteredChats: () => {
    const { chats, showArchived, showReadOnly, showGroups } = get();
    
    return chats.filter(chat => {
      if (!showArchived && chat.isArchived) return false;
      if (!showReadOnly && !chat.canSendMessages) return false;
      if (!showGroups && chat.isGroup) return false;
      return true;
    });
  },

  getChatMessages: (chatId: string) => {
    const { messages } = get();
    return messages[chatId] || [];
  },

  getProviderStatus: (source: 'telegram' | 'whatsapp') => {
    const { providers } = get();
    const provider = providers[source];
    return provider ? provider.isConnected() : false;
  },
})); 
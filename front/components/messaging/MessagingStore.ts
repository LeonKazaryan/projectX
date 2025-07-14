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

// LocalStorage helpers for message caching
function getCachedMessages(chatId: string): Message[] {
  try {
    const raw = localStorage.getItem(`chathut_messages_${chatId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setCachedMessages(chatId: string, messages: Message[]) {
  try {
    localStorage.setItem(`chathut_messages_${chatId}` , JSON.stringify(messages));
  } catch {}
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

    // Auto-restore provider states after initialization
    setTimeout(async () => {
      try {
        // Try to restore WhatsApp session
        const whatsappRestored = await providers.whatsapp.init();
        if (whatsappRestored) {
          console.log("WhatsApp session restored successfully");
        }

        // Try to restore Telegram session
        const telegramRestored = await providers.telegram.init();
        if (telegramRestored) {
          console.log("Telegram session restored successfully");
        }
      } catch (error) {
        console.error("Error restoring provider states:", error);
      }
    }, 100); // Small delay to allow providers to fully initialize
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
        for (const [, provider] of Object.entries(providers)) {
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

    // 0. Валидация chatId
    if (!chatId || typeof chatId !== 'string') {
      console.warn('Invalid chatId for loadMessages:', chatId);
      return;
    }
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) {
      console.warn('Chat not found in store for chatId:', chatId);
      // Чистим кэш если чат не найден
      localStorage.removeItem(`chathut_messages_${chatId}`);
      set((state) => {
        const newMessages = { ...state.messages };
        delete newMessages[chatId];
        return { messages: newMessages };
      });
      return;
    }
    const provider = providers[chat.source];
    if (!provider) {
      console.warn('Provider not found for chat:', chat);
      return;
    }

    // 1. Показать кэшированные сообщения сразу
    const cached = getCachedMessages(chatId);
    if (cached.length > 0) {
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: cached,
        },
      }));
    }

    // 2. Не грузить с сервера, если уже есть актуальные сообщения
    if (messages[chatId] && messages[chatId].length > 0) {
      return;
    }

    set({ isLoading: true });
    try {
      const freshMessages = await provider.loadHistory(chatId);
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: freshMessages,
        },
      }));
      // 3. Обновить кэш
      setCachedMessages(chatId, freshMessages);
    } catch (error: any) {
      // Если сервер вернул 400 — чистим кэш и удаляем чат
      if (error?.response?.status === 400 || (error + '').includes('400')) {
        console.warn('Server returned 400 for chatId:', chatId, ' — removing cache and hiding chat');
        localStorage.removeItem(`chathut_messages_${chatId}`);
        set((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[chatId];
          return { messages: newMessages };
        });
        // Можно также скрыть чат из списка, если нужно:
        set((state) => ({
          chats: state.chats.filter((c) => c.id !== chatId),
        }));
      }
      set({ error: `Failed to load messages: ${error}` });
    } finally {
      set({ isLoading: false });
    }
  },

  // Refresh messages for a chat (force reload)
  refreshMessages: async (chatId: string) => {
    const { providers, chats } = get();
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) return;

    const provider = providers[chat.source];
    if (!provider) return;

    console.log(`Refreshing messages for chat: ${chatId}`);

    try {
      const messages = await provider.loadHistory(chatId);
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

  // Send message through provider
  sendMessage: async (source: 'telegram' | 'whatsapp', chatId: string, text: string) => {
    const provider = get().providers[source];
    if (!provider) {
      console.error(`Provider ${source} not found`);
      return;
    }

    if (!provider.sendMessage) {
      console.error(`Provider ${source} does not support sending messages`);
      return;
    }

    try {
      await provider.sendMessage(chatId, text);
    } catch (error) {
      console.error(`Error sending message via ${source}:`, error);
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
        console.log('Handling new message event:', newMessage);
        
        // Add message to messages
        set((state) => {
          const updated = {
            ...state.messages,
            [newMessage.chatId]: [
              ...(state.messages[newMessage.chatId] || []),
              newMessage,
            ],
          };
          // Обновить кэш
          setCachedMessages(newMessage.chatId, updated[newMessage.chatId]);
          return { messages: updated };
        });
        
        // Update chat list immediately for better UX
        set((state) => {
          const updatedChats = state.chats.map(chat => {
            if (chat.id === newMessage.chatId) {
              return {
                ...chat,
                lastMessage: {
                  text: newMessage.text,
                  date: newMessage.timestamp
                }
              };
            }
            return chat;
          });
          
          // Sort chats by last message timestamp
          updatedChats.sort((a, b) => {
            if (a.lastMessage && !b.lastMessage) return -1;
            if (!a.lastMessage && b.lastMessage) return 1;
            if (a.lastMessage && b.lastMessage) {
              const aTime = new Date(a.lastMessage.date).getTime();
              const bTime = new Date(b.lastMessage.date).getTime();
              return bTime - aTime;
            }
            return 0;
          });
          
          return { chats: updatedChats };
        });
        
        // Also reload chats from provider to ensure consistency
        setTimeout(() => {
          get().loadChats();
        }, 100);
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

  // Reset all providers (for user switching)
  resetAllProviders: async () => {
    console.log("Resetting all messaging providers");
    
    const providers = get().providers;
    
    // Reset each provider
    await Promise.all(
      Object.values(providers).map(async (provider) => {
        try {
          if (provider.reset) {
            await provider.reset();
          }
        } catch (error) {
          console.error(`Error resetting ${provider.getSource()}:`, error);
        }
      })
    );
    
    console.log("All providers reset complete");
  },

  // Clear all user sessions (for user switching)
  clearAllUserSessions: () => {
    console.log("Clearing all user sessions");
    
    const providers = get().providers;
    
    // Clear all sessions for each provider
    Object.values(providers).forEach((provider) => {
      try {
        if (provider.clearAllSessions) {
          provider.clearAllSessions();
        }
      } catch (error) {
        console.error(`Error clearing sessions for ${provider.getSource()}:`, error);
      }
    });
    
    console.log("All user sessions cleared");
  },

  // Restore provider states (can be called manually when needed)
  restoreProviderStates: async () => {
    console.log("Restoring provider states");
    
    const providers = get().providers;
    
    try {
      // Try to restore WhatsApp session
      if (providers.whatsapp?.init) {
        const whatsappRestored = await providers.whatsapp.init();
        if (whatsappRestored) {
          console.log("WhatsApp session restored successfully");
        }
      }

      // Try to restore Telegram session
      if (providers.telegram?.init) {
        const telegramRestored = await providers.telegram.init();
        if (telegramRestored) {
          console.log("Telegram session restored successfully");
        }
      }
    } catch (error) {
      console.error("Error restoring provider states:", error);
    }
  },
})); 
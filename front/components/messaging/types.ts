export interface Chat {
  id: string;
  title: string;
  participants: string[];
  source: 'telegram' | 'whatsapp';
  isUser: boolean;
  isGroup: boolean;
  isChannel: boolean;
  canSendMessages: boolean;
  isArchived: boolean;
  unreadCount: number;
  lastMessage?: {
    text: string;
    date: string;
  };
}

export interface Message {
  id: string;
  chatId: string;
  from: string;
  text: string;
  media?: any;
  timestamp: string;
  source: 'telegram' | 'whatsapp';
  isOutgoing: boolean;
}

export interface MessagingEvent {
  type: 'message:new' | 'chat:updated' | 'status:changed';
  data: any;
  source: 'telegram' | 'whatsapp';
}

export interface IMessagingProvider {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  sendMessage(chatId: string, text: string): Promise<boolean>;
  subscribe(callback: (event: MessagingEvent) => void): void;
  unsubscribe(callback: (event: MessagingEvent) => void): void;
  loadHistory(chatId: string, cursor?: string): Promise<Message[]>;
  getChats(): Promise<Chat[]>;
  isConnected(): boolean;
  getSource(): 'telegram' | 'whatsapp';
}

export interface ProviderConfig {
  telegram?: {
    apiId: string;
    apiHash: string;
  };
  whatsapp?: {
    sessionPath?: string;
  };
} 
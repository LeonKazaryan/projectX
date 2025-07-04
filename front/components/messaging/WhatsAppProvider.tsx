import type {
  IMessagingProvider,
  Chat,
  Message,
  MessagingEvent,
} from "./types";

export class WhatsAppProvider implements IMessagingProvider {
  private isConnectedState: boolean = false;
  private subscribers: ((event: MessagingEvent) => void)[] = [];
  private websocket: WebSocket | null = null;
  private sessionId: string | null = null;
  private qrCode: string | null = null;
  private ready: boolean = false;

  constructor() {}

  async connect(): Promise<boolean> {
    try {
      // Generate a sessionId (for dev, just use a random string or user id)
      const sessionId =
        "whatsapp_" +
        (localStorage.getItem("user_id") ||
          Math.random().toString(36).slice(2));
      const response = await fetch("http://localhost:3000/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (data.success) {
        this.sessionId = data.sessionId;
        this.qrCode = data.qrCode;
        this.isConnectedState = false; // Not ready until QR is scanned
        this.ready = false;
        this.setupWebSocket();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to connect WhatsApp provider:", error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.sessionId) {
      try {
        await fetch(`http://localhost:3000/whatsapp/disconnect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: this.sessionId }),
        });
      } catch (error) {
        console.error("Failed to disconnect WhatsApp:", error);
      }
    }

    this.isConnectedState = false;
    this.sessionId = null;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.sessionId) return false;

    try {
      const response = await fetch("http://localhost:3000/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          chatId: chatId,
          text: text,
        }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      return false;
    }
  }

  subscribe(callback: (event: MessagingEvent) => void): void {
    this.subscribers.push(callback);
  }

  unsubscribe(callback: (event: MessagingEvent) => void): void {
    this.subscribers = this.subscribers.filter((sub) => sub !== callback);
  }

  async loadHistory(chatId: string, cursor?: string): Promise<Message[]> {
    if (!this.sessionId) return [];

    try {
      const response = await fetch(
        `http://localhost:3000/whatsapp/messages?sessionId=${this.sessionId}&chatId=${chatId}&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        return data.messages.map((msg: any) => ({
          id: msg.id,
          chatId: chatId,
          from: msg.from,
          text: msg.body || msg.text || "",
          timestamp: new Date(msg.timestamp).toISOString(),
          source: "whatsapp" as const,
          isOutgoing: msg.isOutgoing || msg.fromMe || false,
        }));
      }
      return [];
    } catch (error) {
      console.error("Failed to load WhatsApp history:", error);
      return [];
    }
  }

  async getChats(): Promise<Chat[]> {
    if (!this.sessionId) return [];

    try {
      const response = await fetch(
        `http://localhost:3000/whatsapp/chats?sessionId=${this.sessionId}`
      );
      const data = await response.json();

      if (data.success) {
        console.log("WhatsApp chats raw data:", data.chats.slice(0, 2)); // Debug first 2 chats
        return data.chats.map((chat: any) => {
          const chatId = chat.id._serialized || chat.id.toString() || chat.id;
          console.log("Mapping chat:", { original: chat.id, mapped: chatId });
          return {
            id: chatId, // Convert WhatsApp ID object to string
            title: chat.name,
            participants: chat.participants || [],
            source: "whatsapp" as const,
            isUser: chat.isUser,
            isGroup: chat.isGroup,
            isChannel: false, // WhatsApp doesn't have channels
            canSendMessages: true, // WhatsApp chats are always writable
            isArchived: chat.isArchived || false,
            unreadCount: chat.unreadCount || 0,
            lastMessage: chat.lastMessage
              ? {
                  text: chat.lastMessage.text,
                  date: chat.lastMessage.timestamp,
                }
              : undefined,
          };
        });
      }
      return [];
    } catch (error) {
      console.error("Failed to load WhatsApp chats:", error);
      return [];
    }
  }

  isConnected(): boolean {
    return this.isConnectedState;
  }

  getSource(): "whatsapp" {
    return "whatsapp";
  }

  private setupWebSocket(): void {
    // Real backend uses Socket.IO; raw WebSocket endpoint is not available.
    // Disable for now to avoid connection errors that reset isConnectedState.
  }

  getQrCode(): string | null {
    return this.qrCode;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isReady(): boolean {
    return this.ready;
  }

  setReady(val: boolean) {
    this.ready = val;
    this.isConnectedState = val;
  }
}

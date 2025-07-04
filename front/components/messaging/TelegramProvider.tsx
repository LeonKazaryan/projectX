import { IMessagingProvider, Chat, Message, MessagingEvent } from "./types";
import { API_BASE_URL } from "../services/authService";

export class TelegramProvider implements IMessagingProvider {
  private sessionId: string | null = null;
  private isConnectedState: boolean = false;
  private subscribers: ((event: MessagingEvent) => void)[] = [];
  private websocket: WebSocket | null = null;

  constructor() {}

  async connect(): Promise<boolean> {
    try {
      // Try to restore session from localStorage
      const sessionString = localStorage.getItem("telegram_session_string");
      if (!sessionString) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/restore-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_string: sessionString }),
      });

      const data = await response.json();
      if (data.success) {
        this.sessionId = data.session_id;
        this.isConnectedState = true;
        this.setupWebSocket();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to connect Telegram provider:", error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnectedState = false;
    this.sessionId = null;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.sessionId) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          dialog_id: parseInt(chatId),
          text: text,
        }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
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
        `${API_BASE_URL}/messages/history?session_id=${this.sessionId}&dialog_id=${chatId}&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        return data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          chatId: chatId,
          from: msg.sender_id?.toString() || "unknown",
          text: msg.text || "",
          timestamp: msg.date,
          source: "telegram" as const,
          isOutgoing: msg.out || false,
        }));
      }
      return [];
    } catch (error) {
      console.error("Failed to load Telegram history:", error);
      return [];
    }
  }

  async getChats(): Promise<Chat[]> {
    if (!this.sessionId) return [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/chats/list?session_id=${this.sessionId}`
      );
      const data = await response.json();

      if (data.success) {
        return data.dialogs.map((dialog: any) => ({
          id: dialog.id.toString(),
          title: dialog.name,
          participants: [], // Telegram doesn't provide participants in dialog list
          source: "telegram" as const,
          isUser: dialog.is_user,
          isGroup: dialog.is_group,
          isChannel: dialog.is_channel,
          canSendMessages: dialog.can_send_messages,
          isArchived: dialog.is_archived,
          unreadCount: dialog.unread_count,
          lastMessage: dialog.last_message
            ? {
                text: dialog.last_message.text,
                date: dialog.last_message.date,
              }
            : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error("Failed to load Telegram chats:", error);
      return [];
    }
  }

  isConnected(): boolean {
    return this.isConnectedState;
  }

  getSource(): "telegram" {
    return "telegram";
  }

  private setupWebSocket(): void {
    if (!this.sessionId) return;

    this.websocket = new WebSocket(
      `ws://localhost:8000/ws/telegram/${this.sessionId}`
    );

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messagingEvent: MessagingEvent = {
          type: data.type,
          data: data.data,
          source: "telegram",
        };

        this.subscribers.forEach((callback) => callback(messagingEvent));
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.websocket.onclose = () => {
      this.isConnectedState = false;
    };
  }
}

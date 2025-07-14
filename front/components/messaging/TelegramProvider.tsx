import type {
  IMessagingProvider,
  Chat,
  Message,
  MessagingEvent,
} from "./types";
import { API_BASE_URL } from "../services/authService";

export class TelegramProvider implements IMessagingProvider {
  private sessionId: string | null = null;
  private isConnectedState: boolean = false;
  private subscribers: ((event: MessagingEvent) => void)[] = [];
  private websocket: WebSocket | null = null;

  constructor() {}

  /**
   * Attempt to restore an existing Telegram session from localStorage.
   * If successful, sets up WebSocket and marks the provider as connected.
   * Returns true if a session was restored.
   */
  async init(): Promise<boolean> {
    try {
      // Try to restore session from localStorage
      const sessionString = localStorage.getItem("telegram_session_string");
      if (!sessionString) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/telegram/restore-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "chathut_access_token"
          )}`,
        },
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
      console.error("Failed to restore Telegram session:", error);
      return false;
    }
  }

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

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.isConnected()) {
      console.error("Telegram provider not connected");
      return;
    }

    try {
      const token = localStorage.getItem("chathut_access_token");
      if (!token) {
        console.error("No access token found");
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/telegram/send_message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to send message:", response.statusText);
        return;
      }

      const data = await response.json();
      console.log("Message sent successfully:", data);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  subscribe(callback: (event: MessagingEvent) => void): void {
    this.subscribers.push(callback);
  }

  unsubscribe(callback: (event: MessagingEvent) => void): void {
    this.subscribers = this.subscribers.filter((sub) => sub !== callback);
  }

  async loadHistory(chatId: string): Promise<Message[]> {
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

  /**
   * Reset Telegram provider state and clear localStorage
   * Should be called when user logs out or changes
   */
  async reset(): Promise<void> {
    console.log("Resetting Telegram provider state");

    // Disconnect socket if connected
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Reset all state
    this.isConnectedState = false;
    this.sessionId = null;
    this.subscribers = [];

    // Clear localStorage to prevent session persistence across users
    localStorage.removeItem("telegram_session_id");
    localStorage.removeItem("telegram_session_string");

    console.log("Telegram provider reset complete");
  }

  /**
   * Clear all Telegram sessions - use only for user switching
   */
  clearAllSessions(): void {
    // Telegram sessions are per-user by default, so this is the same as reset
    localStorage.removeItem("telegram_session_id");
    localStorage.removeItem("telegram_session_string");
  }
}

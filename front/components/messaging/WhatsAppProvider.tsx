import type {
  IMessagingProvider,
  Chat,
  Message,
  MessagingEvent,
} from "./types";
import { io, Socket } from "socket.io-client";
import authService from "../services/authService";

// Удалить кастомный интерфейс ImportMeta, использовать стандартный import.meta.env
const WHATSAPP_API_URL =
  import.meta.env.VITE_WHATSAPP_API_URL || "http://localhost:3000";

export class WhatsAppProvider implements IMessagingProvider {
  private isConnectedState: boolean = false;
  private subscribers: ((event: MessagingEvent) => void)[] = [];
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private qrCode: string | null = null;
  private ready: boolean = false;

  private getCurrentUser() {
    return authService.getUser();
  }

  private isSessionForCurrentUser(sessionId: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    // Check if sessionId contains current user's ID
    return sessionId.includes(`whatsapp_${currentUser.id}_`);
  }

  private clearForeignSession(): void {
    // Clear any session that doesn't belong to current user
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.startsWith("whatsapp_session_id_") &&
        key !== `whatsapp_session_id_${currentUser.id}`
      ) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Attempt to restore an existing WhatsApp session from localStorage.
   * If successful, sets up Socket.IO and marks the provider as connected.
   * Returns true if a ready session was restored.
   */
  async init(): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    // Clear any sessions that don't belong to current user
    this.clearForeignSession();

    const storedId = localStorage.getItem(
      `whatsapp_session_id_${currentUser.id}`
    );
    if (!storedId) return false;

    // Double-check session belongs to current user
    if (!this.isSessionForCurrentUser(storedId)) {
      localStorage.removeItem(`whatsapp_session_id_${currentUser.id}`);
      return false;
    }

    try {
      const res = await fetch(
        `${WHATSAPP_API_URL}/whatsapp/status?sessionId=${storedId}`
      );
      const data = await res.json();

      if (data.success && data.isReady) {
        // Session is alive
        this.sessionId = storedId;
        this.ready = true;
        this.isConnectedState = true;
        this.qrCode = null;
        this.setupSocketIO();

        // Notify subscribers that status changed
        this.subscribers.forEach((cb) => {
          cb({ type: "status:changed", source: "whatsapp", data: true });
        });

        return true;
      }
    } catch (e) {
      console.warn("Failed to restore WhatsApp session", e);
    }

    return false;
  }

  constructor() {}

  async connect(): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.error("No authenticated user found");
        return false;
      }

      // Use user-specific sessionId
      let sessionId = localStorage.getItem(
        `whatsapp_session_id_${currentUser.id}`
      );

      // If we already have sessionId, first check its status
      if (sessionId) {
        try {
          const statusRes = await fetch(
            `${WHATSAPP_API_URL}/whatsapp/status?sessionId=${sessionId}`
          );
          const statusData = await statusRes.json();
          if (statusData.success && statusData.isReady) {
            // Session already ready – no need for QR
            this.sessionId = sessionId;
            this.qrCode = null;
            this.isConnectedState = true;
            this.ready = true;
            this.setupSocketIO();
            return true;
          }
        } catch (e) {
          console.warn("WhatsApp status check failed, will reconnect", e);
        }
      }

      // If no sessionId or not ready – create a new one with user ID
      if (!sessionId) {
        sessionId = `whatsapp_${currentUser.id}_${Math.random()
          .toString(36)
          .slice(2)}`;
        localStorage.setItem(
          `whatsapp_session_id_${currentUser.id}`,
          sessionId
        );
      }

      const response = await fetch(`${WHATSAPP_API_URL}/whatsapp/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (data.success) {
        this.sessionId = data.sessionId;
        this.qrCode = data.qrCode; // may be null if already linked
        this.isConnectedState = data.qrCode ? false : true;
        this.ready = data.qrCode ? false : true;
        this.setupSocketIO();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to connect WhatsApp provider:", error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.sessionId) {
      try {
        await fetch(`${WHATSAPP_API_URL}/whatsapp/disconnect`, {
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

    // Clear user-specific session ID
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      localStorage.removeItem(`whatsapp_session_id_${currentUser.id}`);
    }
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.sessionId) {
      console.error("WhatsApp provider not connected");
      return;
    }

    try {
      const response = await fetch(`${WHATSAPP_API_URL}/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          chatId: chatId,
          message: message,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send WhatsApp message:", response.statusText);
        return;
      }

      const data = await response.json();
      console.log("WhatsApp message sent successfully:", data);
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
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
        `${WHATSAPP_API_URL}/whatsapp/messages?sessionId=${this.sessionId}&chatId=${chatId}&limit=50`
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
        `${WHATSAPP_API_URL}/whatsapp/chats?sessionId=${this.sessionId}`
      );
      const data = await response.json();

      if (data.success) {
        console.log("WhatsApp chats raw data:", data.chats.slice(0, 2)); // Debug first 2 chats
        return data.chats.map((chat: any) => {
          // Backend now returns enriched chats with proper structure
          const chatId = chat.id; // Already serialized by backend
          console.log("Mapping chat:", {
            id: chatId,
            name: chat.name,
            lastMessage: chat.lastMessage,
          });
          return {
            id: chatId,
            title: chat.name,
            participants: chat.participants || [],
            source: "whatsapp" as const,
            isUser: !chat.isGroup, // If not group, then it's a user
            isGroup: chat.isGroup,
            isChannel: false, // WhatsApp doesn't have channels
            canSendMessages: true, // WhatsApp chats are always writable
            isArchived: chat.archived || false,
            unreadCount: chat.unreadCount || 0,
            lastMessage: chat.lastMessage
              ? {
                  text: chat.lastMessage.text || "",
                  date: chat.lastMessage.date,
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

  private setupSocketIO(): void {
    if (!this.sessionId) return;

    try {
      console.log("Setting up Socket.IO connection for WhatsApp...");

      // Connect to Socket.IO server
      this.socket = io(WHATSAPP_API_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Join the session room
      this.socket.emit("join-session", this.sessionId);

      // Handle connection events
      this.socket.on("connect", () => {
        console.log("WhatsApp Socket.IO connected");
      });

      this.socket.on("disconnect", (reason) => {
        console.log("WhatsApp Socket.IO disconnected:", reason);
      });

      // Handle WhatsApp events
      this.socket.on("qr", (data) => {
        console.log("QR code received via Socket.IO");
        this.qrCode = data.qr;
        this.ready = false;
        this.isConnectedState = false;
      });

      this.socket.on("ready", () => {
        console.log("WhatsApp client ready via Socket.IO");
        this.qrCode = null;
        this.ready = true;
        this.isConnectedState = true;
      });

      this.socket.on("auth_failure", (data) => {
        console.error("WhatsApp auth failure via Socket.IO:", data.message);
        this.ready = false;
        this.isConnectedState = false;
      });

      // Handle new messages in real-time
      this.socket.on("new_message", (message) => {
        console.log("New WhatsApp message received via Socket.IO:", message);

        // Notify all subscribers about the new message
        this.subscribers.forEach((callback) => {
          callback({
            type: "message:new",
            source: "whatsapp",
            data: {
              id: message.id,
              chatId: message.chatId,
              from: message.from,
              text: message.text,
              timestamp: message.timestamp,
              source: "whatsapp" as const,
              isOutgoing: message.isOutgoing,
            },
          });
        });
      });

      this.socket.on("disconnected", (data) => {
        console.log("WhatsApp client disconnected via Socket.IO:", data.reason);
        this.ready = false;
        this.isConnectedState = false;
      });
    } catch (error) {
      console.error("Failed to setup Socket.IO connection:", error);
    }
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

  /**
   * Reset provider state and clear foreign sessions
   * Should be called when user logs out or changes
   */
  async reset(): Promise<void> {
    this.isConnectedState = false;
    this.sessionId = null;
    this.qrCode = null;
    this.ready = false;
    this.subscribers = [];

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Only clear foreign sessions, not current user's session
    this.clearForeignSession();
  }

  /**
   * Clear all WhatsApp sessions - use only for user switching
   */
  clearAllSessions(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("whatsapp_session_id_")) {
        localStorage.removeItem(key);
      }
    });
  }
}

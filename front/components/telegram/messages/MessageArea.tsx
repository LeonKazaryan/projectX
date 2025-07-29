import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../../../src/components/ui/button";
import { Textarea } from "../../../src/components/ui/textarea";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { Separator } from "../../../src/components/ui/separator";
import {
  Send,
  Bot,
  MessageCircle,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Clock,
  ChevronDown,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL, authService } from "../../services/authService";
import ChatBackground from "../../messaging/ChatBackground";
import { useMessagingStore } from "../../messaging/MessagingStore";
import {
  getMessages,
  saveMessage,
  setMessages as setLocalMessages,
} from "../../utils/localMessageStore";

interface Message {
  id: number;
  text: string;
  date: string;
  is_outgoing: boolean;
  sender_name?: string;
  sender_id?: number;
}

interface AISettings {
  enabled: boolean;
  memory_limit: number;
  suggestion_delay: number;
  continuous_suggestions?: boolean;
  proactive_suggestions?: boolean;
  auto_suggest_on_incoming?: boolean;
}

interface MessageAreaProps {
  sessionId: string;
  chatId: number;
  chatName: string;
  userId?: number;
  isAIPanelOpen?: boolean;
  setIsAIPanelOpen?: (open: boolean) => void;
  onMessagesUpdated?: () => void;
}

const useAISettings = (sessionId: string) => {
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: true,
    memory_limit: 20,
    suggestion_delay: 1.0,
    continuous_suggestions: false,
    proactive_suggestions: false,
    auto_suggest_on_incoming: false,
  });
  // const [loading, setLoading] = useState(true); // Удалено

  // Removed AI settings loading - not needed for MessageArea

  return { aiSettings };
};

const MessageArea: React.FC<Omit<MessageAreaProps, "aiSettings">> = ({
  sessionId,
  chatId,
  chatName,
  userId,

  setIsAIPanelOpen,
  onMessagesUpdated,
}) => {
  // [CONTEXT-TRACE] Track why AI gets no messages
  console.log(
    `[CONTEXT-TRACE-1] MessageArea rendered: chatId=${chatId}, sessionId=${
      sessionId ? "present" : "missing"
    }`
  );

  const { aiSettings } = useAISettings(sessionId);
  const { loadMessages: loadMessagesFromStore, getChatMessages } =
    useMessagingStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasSuggestion, setHasSuggestion] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragEnhanced, setRagEnhanced] = useState(false);
  const [similarContext, setSimilarContext] = useState<string[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestMessageId, setOldestMessageId] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiSuggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousChatIdRef = useRef<number>(0);
  const isChatSwitchRef = useRef(true);
  const justSentMessageRef = useRef(false);

  const connectWebSocket = useCallback(() => {
    if (!sessionId || !chatId) {
      console.log("No session ID or chat ID, skipping WebSocket connection");
      return;
    }

    try {
      setConnectionStatus("connecting");
      console.log("Connecting MessageArea WebSocket...");

      const wsProtocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
      const wsHost = API_BASE_URL.split("//")[1].split("/api")[0];
      const wsUrl = `${wsProtocol}://${wsHost}/ws/${sessionId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("MessageArea WebSocket connected");
        setConnectionStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("MessageArea WebSocket message:", data);

          if (data.type === "new_message" && data.data.chat_id === chatId) {
            setMessages((prev) => {
              const messageExists = prev.some((msg) => msg.id === data.data.id);
              if (!messageExists) {
                const newMessages = [...prev, data.data];

                // Sort by date first, then by ID as fallback
                return newMessages.sort((a, b) => {
                  const dateA = new Date(a.date).getTime();
                  const dateB = new Date(b.date).getTime();
                  if (dateA !== dateB) {
                    return dateA - dateB;
                  }
                  return a.id - b.id;
                });
              }
              return prev;
            });

            // Trigger automatic AI suggestion if enabled and it's an incoming message
            if (
              aiSettings.enabled &&
              aiSettings.auto_suggest_on_incoming &&
              !data.data.is_outgoing
            ) {
              if (aiSuggestionTimeoutRef.current) {
                clearTimeout(aiSuggestionTimeoutRef.current);
              }

              aiSuggestionTimeoutRef.current = setTimeout(() => {
                regenerateAISuggestion();
              }, aiSettings.suggestion_delay * 1000);
            }
          }
        } catch (error) {
          console.error("Error parsing MessageArea WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("MessageArea WebSocket closed:", event.code, event.reason);
        setConnectionStatus("disconnected");

        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect MessageArea WebSocket...");
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error("MessageArea WebSocket error:", error);
        setConnectionStatus("disconnected");
      };

      wsRef.current = ws;
    } catch (error) {
      console.error(
        "Failed to create MessageArea WebSocket connection:",
        error
      );
      setConnectionStatus("disconnected");
    }
  }, [sessionId, chatId, aiSettings]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Component unmounting");
      wsRef.current = null;
    }

    setConnectionStatus("disconnected");
  }, []);

  const regenerateAISuggestion = useCallback(async () => {
    if (aiSuggestionLoading) return;
    setAiSuggestionLoading(true);
    setAiSuggestion("");

    try {
      const historyForAgent = messages.slice(-15);

      // Convert messages to the format expected by API
      const recentMessages = historyForAgent.map((msg) => ({
        id: msg.id.toString(),
        text: msg.text,
        isOutgoing: msg.is_outgoing,
        from: msg.sender_name || (msg.is_outgoing ? "You" : "Contact"),
        timestamp: msg.date,
      }));

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE_URL}/ai/suggest-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          chat_id: chatId.toString(),
          source: "telegram",
          chat_name: chatName,
          recent_messages: recentMessages,
        }),
      });

      const data = await response.json();

      if (data.success && data.suggestion) {
        setAiSuggestion(data.suggestion);
        setRagEnabled(false);
        setRagEnhanced(false);
        setSimilarContext([]);
        setShowAiSuggestion(true);
        setHasSuggestion(true);
        console.log("🤖 AI suggestion generated:", data.suggestion);
      } else {
        throw new Error(data.error || "Failed to generate suggestion");
      }
    } catch (error) {
      console.error("Error generating AI suggestion:", error);
      setAiSuggestion("Ошибка при генерации ответа. Попробуйте еще раз.");
      setShowAiSuggestion(true);
      setHasSuggestion(true);
    } finally {
      setAiSuggestionLoading(false);
    }
  }, [aiSuggestionLoading, messages, sessionId, chatId, chatName]);

  // This is now just an alias
  const getManualAISuggestion = regenerateAISuggestion;

  // New function for continuous AI monitoring
  const startContinuousAI = useCallback(() => {
    // Auto-generate suggestion when new message from contact arrives
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // If last message is from contact (not outgoing), generate suggestion
      if (!lastMessage.is_outgoing && !aiSuggestionLoading) {
        console.log(
          "🤖 New contact message detected, generating suggestion..."
        );
        setTimeout(() => {
          regenerateAISuggestion();
        }, 1000); // Small delay to avoid rapid-fire suggestions
      }
    }
    return () => {}; // Return empty cleanup function
  }, [messages, aiSuggestionLoading, regenerateAISuggestion]);

  // Auto-generate suggestions when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      startContinuousAI();
    }
  }, [messages, startContinuousAI]);

  const loadLocalMessages = async () => {
    console.log(`[CONTEXT-TRACE-2] Loading messages for chat ${chatId}`);

    // First load from local storage (instant)
    const localMsgs = await getMessages(chatId.toString());
    console.log(`[CONTEXT-TRACE-3] Local messages count: ${localMsgs.length}`);

    // Update UI with local messages immediately
    if (localMsgs.length > 0) {
      setMessages(
        localMsgs.map((msg) => ({
          id: parseInt(msg.id),
          text: msg.text,
          date: msg.timestamp,
          is_outgoing: msg.isOutgoing,
          sender_name: msg.from,
        }))
      );
    }

    // Then load fresh data directly from API (bypassing MessagingStore because chats are not in store)
    try {
      const url = `${API_BASE_URL}/messages/history?session_id=${sessionId}&dialog_id=${chatId}&limit=5000&offset_id=0`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.messages) {
        console.log(
          `[CONTEXT-TRACE-4] Fresh messages count: ${data.messages.length}`
        );

        const freshMessages = data.messages.sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return a.id - b.id;
        });

        // Update UI with fresh messages
        setMessages(freshMessages);

        // Convert to MessagingStore format and save to local storage
        const storeMessages = freshMessages.map((msg: any) => ({
          id: msg.id.toString(),
          chatId: chatId.toString(),
          from: msg.sender_name || (msg.is_outgoing ? "You" : "Unknown"),
          text: msg.text,
          timestamp: msg.date,
          source: "telegram" as const,
          isOutgoing: msg.is_outgoing,
        }));

        // Save to local storage for instant loading next time
        await setLocalMessages(chatId.toString(), storeMessages);
        console.log(
          `[CONTEXT-TRACE-5] Saved ${storeMessages.length} messages to local storage`
        );

        // Notify TelegramClient to refresh AI context
        if (onMessagesUpdated) {
          onMessagesUpdated();
        }
      } else {
        console.log(
          `[CONTEXT-TRACE-ERROR] API failed: ${data.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error(`[CONTEXT-TRACE-ERROR] Failed to load messages:`, error);
    }
  };

  useEffect(() => {
    console.log(
      `[CONTEXT-TRACE-1] useEffect triggered: chatId=${chatId}, sessionId=${
        sessionId ? "present" : "missing"
      }`
    );

    if (chatId && sessionId) {
      const isSwitch = previousChatIdRef.current !== chatId;
      if (isSwitch) {
        isChatSwitchRef.current = true;
        setMessages([]);
        setShowScrollButton(false);
        setAiSuggestion("");
        setHasSuggestion(false);
        // Reset pagination state
        setIsLoadingMore(false);
        setHasMoreMessages(true);
        setOldestMessageId(0);
        // ... reset other states
      }
      previousChatIdRef.current = chatId;

      loadLocalMessages();
      connectWebSocket();
    } else {
      console.log(`[CONTEXT-TRACE-ERROR] Missing sessionId or chatId`);
    }
    return () => disconnectWebSocket();
  }, [sessionId, chatId, connectWebSocket, disconnectWebSocket]);

  // Start continuous AI monitoring when component mounts or settings change
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (sessionId && chatId && userId) {
      cleanup = startContinuousAI();
    }

    return cleanup;
  }, [sessionId, chatId, userId, aiSettings, startContinuousAI]);

  // Auto-scroll logic for new messages
  useEffect(() => {
    if (messages.length === 0) return;

    if (isChatSwitchRef.current) {
      scrollToBottom(false); // INSTANT scroll on chat switch only
      isChatSwitchRef.current = false;
      setIsNearBottom(true);
    } else if (isNearBottom) {
      // Auto-scroll if user is near bottom when new message arrives
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages, isNearBottom]);

  // Maintain focus after sending message, even if re-renders happen
  useEffect(() => {
    if (justSentMessageRef.current && textareaRef.current) {
      const focusTimer = setTimeout(() => {
        if (textareaRef.current && justSentMessageRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [messages]);

  const fetchMessages = async (
    offsetId: number = 0,
    isLoadingMore: boolean = false
  ) => {
    if (!chatId || !sessionId) return;

    try {
      console.log(
        `[CONTEXT-TRACE-4] fetchMessages: Calling API for chat ${chatId}`
      );

      const url = `${API_BASE_URL}/messages/history?session_id=${sessionId}&dialog_id=${chatId}&limit=100&offset_id=${offsetId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        console.log(
          `[CONTEXT-TRACE-5] API returned ${
            (data.messages || []).length
          } messages`
        );
        const newMessages = (data.messages || []).sort(
          (a: Message, b: Message) => {
            // Sort by date first, then by ID as fallback
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) {
              return dateA - dateB;
            }
            return a.id - b.id;
          }
        );

        if (isLoadingMore) {
          // При загрузке старых сообщений добавляем их в начало
          setMessages((prevMessages) => {
            const combined = [...newMessages, ...prevMessages];
            // Убираем дубликаты по ID
            const uniqueMessages = combined.filter(
              (msg, index, self) =>
                index === self.findIndex((m) => m.id === msg.id)
            );
            return uniqueMessages.sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              if (dateA !== dateB) {
                return dateA - dateB;
              }
              return a.id - b.id;
            });
          });

          // Проверяем есть ли еще сообщения
          setHasMoreMessages(newMessages.length === 100);

          if (newMessages.length > 0) {
            setOldestMessageId(Math.min(...newMessages.map((m) => m.id)));
          }
        } else {
          // При первоначальной загрузке заменяем все сообщения
          setMessages(newMessages);
          setHasMoreMessages(newMessages.length === 100);

          if (newMessages.length > 0) {
            setOldestMessageId(Math.min(...newMessages.map((m) => m.id)));
          }

          // Также обновляем store для AIPanel - напрямую добавляем сообщения
          try {
            // Convert MessageArea format to MessagingStore format
            const storeMessages = newMessages.map((msg) => ({
              id: msg.id.toString(),
              chatId: chatId.toString(),
              from: msg.sender_name || (msg.is_outgoing ? "You" : "Unknown"),
              text: msg.text,
              timestamp: msg.date,
              source: "telegram" as const,
              isOutgoing: msg.is_outgoing,
            }));

            // Save to local storage for instant loading next time
            await setLocalMessages(chatId.toString(), storeMessages);

            console.log(
              `[CONTEXT-TRACE-6] Updated MessagingStore with ${storeMessages.length} messages`
            );
          } catch (error) {
            console.warn("Failed to update MessagingStore:", error);
          }
        }
      } else {
        console.log(
          `[CONTEXT-TRACE-ERROR] API failed: ${data.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error loading messages from server:", error);
    }
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages || !oldestMessageId) return;

    setIsLoadingMore(true);

    // Сохраняем текущую позицию скролла
    const scrollContainer = scrollContainerRef.current;
    const scrollTop = scrollContainer?.scrollTop || 0;
    const scrollHeight = scrollContainer?.scrollHeight || 0;

    try {
      await fetchMessages(oldestMessageId, true);

      // Восстанавливаем позицию скролла после загрузки
      setTimeout(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const scrollDifference = newScrollHeight - scrollHeight;
          scrollContainer.scrollTop = scrollTop + scrollDifference;
        }
      }, 50);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId || !chatId || sendingMessage) return;

    try {
      setSendingMessage(true);
      setHasSuggestion(false);
      // setSuggestionDismissed(true); // Removed as per edit hint

      const response = await fetch(`${API_BASE_URL}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          dialog_id: chatId,
          text: newMessage.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage("");
        justSentMessageRef.current = true;
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        // Keep focus on the input after sending message - use setTimeout to ensure it happens after re-renders
        setTimeout(() => {
          if (textareaRef.current && justSentMessageRef.current) {
            textareaRef.current.focus();
            justSentMessageRef.current = false;
          }
        }, 100);
        // Force scroll to bottom after sending your own message
        setIsNearBottom(true);
        setTimeout(() => scrollToBottom(true), 150);
      } else {
        // setError(data.error || "Ошибка отправки сообщения"); // Removed as per edit hint
      }
    } catch (error) {
      // setError("Ошибка соединения с сервером"); // Removed as per edit hint
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = (smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Track if user is near bottom (within 100px)
    const nearBottom = distanceFromBottom <= 100;
    setIsNearBottom(nearBottom);

    // Show button when scrolled up more than 100px from bottom
    setShowScrollButton(!nearBottom);

    // Infinite scroll: load more messages when near top
    const distanceFromTop = scrollTop;
    const nearTop = distanceFromTop <= 100;

    if (nearTop && hasMoreMessages && !isLoadingMore) {
      console.log("🔄 Near top, loading more messages...");
      loadMoreMessages();
    }
  };

  const handleScrollToBottom = () => {
    scrollToBottom(true);
    setIsNearBottom(true);
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "??:??";
      }
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting time:", error, dateString);
      return "??:??";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Only handle AI shortcuts when AI is enabled
    if (!aiSettings.enabled) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      return;
    }

    if (e.key === "Tab" && showAiSuggestion) {
      e.preventDefault();
      useAISuggestion();
    } else if (e.key === "Escape" && showAiSuggestion) {
      e.preventDefault();
      dismissAISuggestion();
    } else if (e.key === "F1" || (e.ctrlKey && e.key === " ")) {
      e.preventDefault();
      if (hasSuggestion && !showAiSuggestion) {
        restoreAISuggestion();
      } else {
        getManualAISuggestion();
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";

    // Don't hide AI suggestion when typing
  };

  const copyMessage = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const useAISuggestion = () => {
    setNewMessage(aiSuggestion);
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea after setting AI suggestion
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  };

  const dismissAISuggestion = () => {
    setShowAiSuggestion(false);
    // setSuggestionDismissed(true); // Removed as per edit hint
    setHasSuggestion(false);

    // Don't get new suggestions for a while after dismissal
    if (aiSuggestionTimeoutRef.current) {
      clearTimeout(aiSuggestionTimeoutRef.current);
    }
  };

  const restoreAISuggestion = () => {
    if (hasSuggestion && aiSuggestion) {
      setShowAiSuggestion(true);
      // setSuggestionDismissed(false); // Removed as per edit hint
    } else {
      // Generate new suggestion
      getManualAISuggestion();
    }
  };

  // Reset suggestion dismissed state when switching chats or when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only reset dismissal for new incoming messages, not user's own messages
      if (!lastMessage.is_outgoing) {
        // setSuggestionDismissed(false); // Removed as per edit hint
      }
    }
  }, [messages]);

  // Also reset dismissal when switching chats
  useEffect(() => {
    // setSuggestionDismissed(false); // Removed as per edit hint
  }, [chatId]);

  // Re-enable automatic suggestions when enabled in settings
  useEffect(() => {
    if (
      messages.length > 0 &&
      aiSettings.enabled &&
      aiSettings.auto_suggest_on_incoming
    ) {
      const lastMessage = messages[messages.length - 1];
      const messageAge = Date.now() - new Date(lastMessage.date).getTime();

      // Only suggest for messages less than 5 minutes old and incoming messages
      if (messageAge < 5 * 60 * 1000 && !lastMessage.is_outgoing) {
        // Use delay from settings
        if (aiSuggestionTimeoutRef.current) {
          clearTimeout(aiSuggestionTimeoutRef.current);
        }

        aiSuggestionTimeoutRef.current = setTimeout(() => {
          getManualAISuggestion();
        }, aiSettings.suggestion_delay * 1000);
      }
    }
  }, [messages, aiSettings, regenerateAISuggestion]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Выберите чат
            </h3>
            <p className="text-sm text-muted-foreground">
              Выберите чат из списка, чтобы начать переписку
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden max-h-screen">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {chatName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-medium text-foreground">
                {chatName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${getConnectionStatusColor()}`}
                />
                <span>
                  {connectionStatus === "connected" ? "в сети" : "не в сети"}
                </span>
                {aiSettings.enabled && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <div className="flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      <span>AI включен</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Chat Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAIPanelOpen?.(true)}
              className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all"
            >
              <Bot className="h-4 w-4" />
              <span className="text-sm font-medium">AI</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ChatBackground platform="telegram">
        <div
          ref={scrollContainerRef}
          className="h-full px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200/60 dark:scrollbar-thumb-blue-900/40 scrollbar-track-transparent"
          onScroll={handleScroll}
        >
          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Загружаем старые сообщения...</span>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`flex mb-2 ${
                  message.is_outgoing ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`group max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-md transition-all duration-300 border border-transparent ${
                    message.is_outgoing
                      ? "bg-gradient-to-br from-blue-400/90 to-blue-600/90 text-white shadow-blue-200/40 dark:shadow-blue-900/30"
                      : message.sender_name === "AI"
                      ? "bg-gradient-to-br from-orange-100/90 to-orange-200/90 text-orange-900 border-orange-300/60 shadow-orange-200/40 dark:from-orange-900/80 dark:to-orange-800/80 dark:text-orange-100 dark:border-orange-700/60"
                      : "bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 border-gray-200/60 dark:border-gray-700/60 shadow-gray-200/30 dark:shadow-gray-900/20"
                  }`}
                  style={{
                    boxShadow: message.is_outgoing
                      ? "0 4px 24px 0 rgba(0,136,204,0.10)"
                      : message.sender_name === "AI"
                      ? "0 4px 24px 0 rgba(255,107,53,0.10)"
                      : "0 2px 12px 0 rgba(80,80,120,0.08)",
                    backdropFilter: "blur(2px)",
                  }}
                >
                  <div className="space-y-1">
                    {!message.is_outgoing && message.sender_name && (
                      <p className="text-xs font-semibold text-blue-500 dark:text-blue-300 mb-1">
                        {message.sender_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs opacity-70">
                        {formatTime(message.date)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => copyMessage(message.text, message.id)}
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20"
              initial={{
                opacity: 0,
                y: 15,
                scale: 0.7,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 15,
                scale: 0.7,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                duration: 0.3,
              }}
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{
                scale: 0.95,
              }}
            >
              <Button
                onClick={handleScrollToBottom}
                size="icon"
                variant="secondary"
                className="relative rounded-full shadow-lg hover:shadow-xl bg-background/95 backdrop-blur-sm border border-border hover:bg-muted/90 h-10 w-10"
                title="Прокрутить вниз к новым сообщениям"
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </ChatBackground>

      {/* AI Suggestion - only show when AI is enabled */}
      {aiSettings.enabled && showAiSuggestion && aiSuggestion && (
        <div className="px-4 py-2 border-t border-border">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    AI предлагает ответ:
                  </p>
                  {ragEnabled && ragEnhanced && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        RAG
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {aiSuggestion}
                </p>
                {similarContext.length > 0 && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs">
                    <p className="text-green-700 dark:text-green-300 font-medium mb-1">
                      Основано на похожих сообщениях:
                    </p>
                    {similarContext.slice(0, 2).map((context, index) => (
                      <p
                        key={index}
                        className="text-green-600 dark:text-green-400 truncate"
                      >
                        • {context}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    Tab - использовать
                  </span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    Esc - скрыть
                  </span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    F1/Ctrl+Space - обновить
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regenerateAISuggestion}
                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  disabled={aiSuggestionLoading}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissAISuggestion}
                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={useAISuggestion}
                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  Использовать
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Loading - only show when AI is enabled */}
      {aiSettings.enabled && aiSuggestionLoading && (
        <div className="px-4 py-2 border-t border-border">
          <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-pulse text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                AI анализирует переписку...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-gradient-to-br from-white/80 to-blue-50/60 dark:from-gray-900/80 dark:to-blue-950/80 backdrop-blur-md">
        <div className="flex items-end gap-2 max-h-32 overflow-hidden">
          {aiSettings.enabled && (
            <Button
              variant="outline"
              size="icon"
              onClick={restoreAISuggestion}
              className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 bg-white/60 dark:bg-gray-900/60 border-blue-200 dark:border-blue-800 shadow-md"
              title="Показать предложение AI"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 min-h-0">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              placeholder="Написать сообщение..."
              className="min-h-[40px] max-h-[80px] resize-none rounded-xl bg-white/70 dark:bg-gray-900/70 shadow-inner border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-400/40 transition-all overflow-y-auto"
              disabled={sendingMessage}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            size="icon"
            className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-lg transform-gpu transition-all duration-200"
          >
            {sendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageArea;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../../../src/components/ui/button";
import { Textarea } from "../../../src/components/ui/textarea";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { Separator } from "../../../src/components/ui/separator";
import { ragService } from "../utils/ragService";
import {
  Send,
  Bot,
  MessageCircle,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Clock,
  ChevronDown,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { RAGService } from "../utils/ragService";
import { motion, AnimatePresence } from "framer-motion";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const loadSettings = async () => {
      setLoading(true);
      try {
        // This would be your actual API call
        const response = await fetch(
          `http://localhost:8000/api/ai/settings?session_id=${sessionId}`
        );
        const data = await response.json();
        if (data.success && data.settings) {
          setAiSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to load AI settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [sessionId]);

  return { aiSettings, loading };
};

const MessageArea: React.FC<Omit<MessageAreaProps, "aiSettings">> = ({
  sessionId,
  chatId,
  chatName,
  userId,
}) => {
  const { aiSettings, loading: aiSettingsLoading } = useAISettings(sessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [hasSuggestion, setHasSuggestion] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragEnhanced, setRagEnhanced] = useState(false);
  const [similarContext, setSimilarContext] = useState<string[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiSuggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousChatIdRef = useRef<number>(0);
  const isChatSwitchRef = useRef(true);

  const API_BASE = "http://localhost:8000/api";

  const connectWebSocket = useCallback(() => {
    if (!sessionId || !chatId) {
      console.log("No session ID or chat ID, skipping WebSocket connection");
      return;
    }

    try {
      setConnectionStatus("connecting");
      console.log("Connecting MessageArea WebSocket...");

      const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);

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

                // Add new message to RAG asynchronously
                ragService
                  .addMessage(sessionId, chatId, data.data)
                  .catch((err) =>
                    console.warn("Failed to add message to RAG:", err)
                  );

                return newMessages.sort((a, b) => a.id - b.id);
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

    const historyForAgent = messages.slice(-15);
    const lastContactMessage = [...historyForAgent]
      .filter((m) => !m.is_outgoing)
      .pop();
    const query = lastContactMessage?.text || "Что ответить?";

    try {
      const ragService = new RAGService();
      const suggestion = await ragService.getAgentResponse(
        sessionId,
        chatId,
        query,
        historyForAgent
      );

      if (suggestion && suggestion.suggestion) {
        setAiSuggestion(suggestion.suggestion);
        setRagEnabled(true);
        setRagEnhanced(suggestion.rag_enhanced || false);
        setSimilarContext(suggestion.similar_context || []);
        setShowAiSuggestion(true);
        setHasSuggestion(true);
        setSuggestionDismissed(false);
      } else {
        setAiSuggestion("Не удалось сгенерировать ответ. Попробуйте еще раз.");
        setShowAiSuggestion(true);
      }
    } catch (error) {
      console.error("Error regenerating AI suggestion via agent:", error);
      setAiSuggestion("Ошибка при генерации ответа.");
      setShowAiSuggestion(true);
    } finally {
      setAiSuggestionLoading(false);
    }
  }, [aiSuggestionLoading, messages, sessionId, chatId]);

  // This is now just an alias
  const getManualAISuggestion = regenerateAISuggestion;

  // New function for continuous AI monitoring
  const startContinuousAI = useCallback(() => {
    // DISABLED: No more automatic suggestions
    // AI will only suggest when user explicitly asks for it
    return () => {}; // Return empty cleanup function
  }, []);

  useEffect(() => {
    if (chatId && sessionId) {
      const isSwitch = previousChatIdRef.current !== chatId;
      if (isSwitch) {
        isChatSwitchRef.current = true;
        setMessages([]);
        setShowScrollButton(false);
        setAiSuggestion("");
        setHasSuggestion(false);
        setSuggestionDismissed(false);
        // ... reset other states
      }
      previousChatIdRef.current = chatId;
      fetchMessages();
      connectWebSocket();
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

  // Only auto-scroll on chat switch, not on new messages
  useEffect(() => {
    if (messages.length === 0) return;

    if (isChatSwitchRef.current) {
      scrollToBottom(false); // INSTANT scroll on chat switch only
      isChatSwitchRef.current = false;
    }
    // NO MORE AUTO-SCROLL ON NEW MESSAGES!
  }, [messages]);

  const fetchMessages = async () => {
    if (!chatId || !sessionId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/messages/history?session_id=${sessionId}&dialog_id=${chatId}&limit=200`
      );
      const data = await response.json();

      if (data.success) {
        const sortedMessages = (data.messages || []).sort(
          (a: Message, b: Message) => {
            // Sort by ID (or date if needed)
            return a.id - b.id;
          }
        );
        setMessages(sortedMessages);
        setError("");
      } else {
        setError(data.error || "Ошибка загрузки сообщений");
      }
    } catch (error) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreMessages = async () => {
    if (!chatId || !sessionId || messages.length === 0 || isHistoryLoading)
      return;

    setIsHistoryLoading(true);
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Preserve scroll position
    const oldScrollHeight = scrollContainer.scrollHeight;
    const oldScrollTop = scrollContainer.scrollTop;

    try {
      const oldestMessageId = messages[0].id;
      const response = await fetch(
        `${API_BASE}/messages/history?session_id=${sessionId}&dialog_id=${chatId}&limit=100&offset_id=${oldestMessageId}`
      );
      const data = await response.json();

      if (data.success && data.messages.length > 0) {
        const uniqueNewMessages = data.messages.filter(
          (newMsg: Message) =>
            !messages.some((existingMsg) => existingMsg.id === newMsg.id)
        );

        setMessages((prev) =>
          [...uniqueNewMessages, ...prev].sort((a, b) => a.id - b.id)
        );

        // Restore scroll position after DOM update
        setTimeout(() => {
          if (scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            scrollContainerRef.current.scrollTop =
              newScrollHeight - oldScrollHeight + oldScrollTop;
          }
        }, 0);
      }
    } catch (error) {
      console.error("Failed to fetch more messages:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId || !chatId || sendingMessage) return;

    try {
      setSendingMessage(true);
      setHasSuggestion(false);
      setSuggestionDismissed(true);

      const response = await fetch(`${API_BASE}/messages/send`, {
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
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        // Force scroll to bottom after sending
        // Message sent, no auto-scroll
      } else {
        setError(data.error || "Ошибка отправки сообщения");
      }
    } catch (error) {
      setError("Ошибка соединения с сервером");
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

    // Show button when scrolled up more than 100px from bottom
    if (distanceFromBottom > 100) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
    }
  };

  const handleScrollToBottom = () => {
    scrollToBottom(true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
    setSuggestionDismissed(true);
    setHasSuggestion(false);

    // Don't get new suggestions for a while after dismissal
    if (aiSuggestionTimeoutRef.current) {
      clearTimeout(aiSuggestionTimeoutRef.current);
    }
  };

  const restoreAISuggestion = () => {
    if (hasSuggestion && aiSuggestion) {
      setShowAiSuggestion(true);
      setSuggestionDismissed(false);
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
        setSuggestionDismissed(false);
      }
    }
  }, [messages]);

  // Also reset dismissal when switching chats
  useEffect(() => {
    setSuggestionDismissed(false);
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
  }, [messages, aiSettings, getManualAISuggestion]);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden">
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
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={scrollContainerRef}
          className="h-full px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Загрузка сообщений...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                {messages.length > 0 && (
                  <Button
                    onClick={fetchMoreMessages}
                    disabled={isHistoryLoading}
                    variant="outline"
                    size="sm"
                  >
                    {isHistoryLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Загрузить еще
                  </Button>
                )}
              </div>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.is_outgoing ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`group max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.is_outgoing
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="space-y-1">
                      {!message.is_outgoing && message.sender_name && (
                        <p className="text-xs font-medium text-primary">
                          {message.sender_name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                      <div className="flex items-center justify-between gap-2">
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
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
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
      </div>

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
      <div className="flex-shrink-0 p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          {/* Manual AI Suggestion Button - only show when AI is enabled */}
          {aiSettings.enabled && (
            <Button
              variant="outline"
              size="icon"
              onClick={getManualAISuggestion}
              className="flex-shrink-0 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 relative group"
              title="Получить предложение AI"
              disabled={aiSuggestionLoading}
            >
              {aiSuggestionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {aiSettings.auto_suggest_on_incoming
                  ? "Ручной запрос AI"
                  : "Спросить AI"}
              </span>
            </Button>
          )}

          {/* Restore AI Button - only show when AI is enabled */}
          {aiSettings.enabled &&
            (hasSuggestion || suggestionDismissed) &&
            !showAiSuggestion &&
            !aiSuggestionLoading && (
              <Button
                variant="outline"
                size="icon"
                onClick={restoreAISuggestion}
                className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 relative group"
                title="Показать предложение AI"
              >
                <Sparkles className="h-4 w-4" />
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  F1 / Ctrl+Space
                </span>
              </Button>
            )}
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              placeholder="Написать сообщение..."
              className="min-h-[40px] max-h-[150px] resize-none"
              disabled={sendingMessage}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            size="icon"
            className="flex-shrink-0"
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

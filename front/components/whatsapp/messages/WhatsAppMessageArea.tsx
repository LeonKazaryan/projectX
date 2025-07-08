import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMessagingStore } from "../../messaging/MessagingStore";
import type { Message } from "../../messaging/types";
import { Button } from "../../../src/components/ui/button";
import { Textarea } from "../../../src/components/ui/textarea";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MessageCircle,
  ChevronDown,
  Loader2,
  Bot,
  Sparkles,
  Trash2,
} from "lucide-react";
import { RAGService } from "../../telegram/utils/ragService";
import { API_BASE_URL } from "../../services/authService";

interface WhatsAppMessageAreaProps {
  chatId: string;
  chatName: string;
}

// AI settings interface
interface AISettings {
  enabled: boolean;
  memory_limit: number;
  suggestion_delay: number;
}

// Hook to load AI settings for the current WhatsApp session
const useAISettings = (sessionId: string) => {
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: true,
    memory_limit: 20,
    suggestion_delay: 1,
  });

  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/ai/settings?session_id=${sessionId}`
        );
        const data = await res.json();
        if (data.success && data.settings) {
          setAiSettings(data.settings);
        }
      } catch (e) {
        console.error("Failed to load AI settings:", e);
      }
    })();
  }, [sessionId]);

  return { aiSettings };
};

const WhatsAppMessageArea: React.FC<WhatsAppMessageAreaProps> = ({
  chatId,
  chatName,
}) => {
  const {
    messages: allMessages,
    sendMessage,
    loadMessages,
    refreshMessages,
    providers,
  } = useMessagingStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadedChatId, setLoadedChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Refs like in Telegram
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousChatIdRef = useRef<string>("");
  const isChatSwitchRef = useRef(true);
  const justSentMessageRef = useRef(false);

  // WhatsApp session for AI backend
  const whatsappSessionId =
    (providers?.whatsapp as any)?.getSessionId?.() || "";
  const { aiSettings } = useAISettings(whatsappSessionId);

  // AI suggestion states
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);

  // Refs – (reserved for future enhancements)

  // Auto-load messages when chat changes, but only once per chat
  useEffect(() => {
    if (chatId && chatId !== loadedChatId) {
      console.log("Auto-loading messages for chatId:", chatId);
      const isSwitch = previousChatIdRef.current !== chatId;
      if (isSwitch) {
        isChatSwitchRef.current = true;
        setMessages([]);
        setShowScrollButton(false);
        previousChatIdRef.current = chatId;
      }
      loadMessages(chatId);
      setLoadedChatId(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    const chatMessages = allMessages[chatId] || [];
    setMessages(chatMessages);
  }, [allMessages, chatId]);

  // Auto-scroll logic copied from Telegram
  useEffect(() => {
    if (messages.length === 0) return;

    if (isChatSwitchRef.current) {
      // INSTANT scroll on chat switch only
      scrollToBottom(false);
      isChatSwitchRef.current = false;
      setIsNearBottom(true);
      // Focus input after chat switch
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    } else if (isNearBottom) {
      // Auto-scroll if user is near bottom when new message arrives
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages, isNearBottom]);

  // Maintain focus after sending message
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

  const handleLoadMessages = () => {
    if (chatId) {
      console.log("Manual reload messages for chatId:", chatId);
      loadMessages(chatId);
      setLoadedChatId(chatId);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setIsTyping(false);
    try {
      const success = await sendMessage(chatId, newMessage.trim());
      if (success) {
        setNewMessage("");
        justSentMessageRef.current = true;
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        // Keep focus on the input after sending message
        setTimeout(() => {
          if (textareaRef.current && justSentMessageRef.current) {
            textareaRef.current.focus();
            justSentMessageRef.current = false;
          }
        }, 100);
        // Force scroll to bottom after sending your own message
        setIsNearBottom(true);
        setTimeout(() => scrollToBottom(true), 150);

        // Reload messages after sending to see the new message
        setTimeout(() => {
          refreshMessages(chatId);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Scroll functions copied from Telegram
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
  };

  const handleScrollToBottom = () => {
    scrollToBottom(true);
    setIsNearBottom(true);
  };

  // Real-time messages now come via Socket.IO, no need for polling
  // The MessagingStore automatically handles new message events from providers

  const getAISuggestion = useCallback(async () => {
    if (!aiSettings.enabled || aiSuggestionLoading) return;

    setAiSuggestionLoading(true);
    setAiSuggestion("");

    const recentHistory = messages.slice(-15);
    const lastIncoming = [...recentHistory].filter((m) => !m.isOutgoing).pop();
    const query = lastIncoming?.text || "Что ответить?";

    try {
      // Extract numeric part of chatId for backend that expects int
      const numericChatId = parseInt(chatId.replace(/\D/g, "")) || 0;

      const rag = new RAGService();
      const suggestion = await rag.getAgentResponse(
        whatsappSessionId,
        numericChatId,
        query,
        recentHistory.map((m) => ({
          sender: m.isOutgoing ? "user" : "contact",
          text: m.text,
        })) as any
      );

      console.log("AI suggestion response:", suggestion);

      if (suggestion) {
        setAiSuggestion(suggestion.suggestion);
        setShowAiSuggestion(true);
      }
    } catch (e) {
      console.error("AI suggestion error:", e);
    } finally {
      setAiSuggestionLoading(false);
    }
  }, [aiSettings, aiSuggestionLoading, messages, whatsappSessionId, chatId]);

  const useAISuggestion = () => {
    setNewMessage(aiSuggestion);
    setShowAiSuggestion(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const dismissAISuggestion = () => {
    setShowAiSuggestion(false);
  };

  // Key handler with AI suggestion shortcuts
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && showAiSuggestion) {
      e.preventDefault();
      useAISuggestion();
    } else if (e.key === "Escape" && showAiSuggestion) {
      e.preventDefault();
      dismissAISuggestion();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setIsTyping(false);
      handleSendMessage();
    }
  };

  // Textarea auto-resize like in Telegram
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";

    // Show typing indicator when user starts typing
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-600">
              {chatName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-medium text-foreground">{chatName}</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? "печатает..." : "WhatsApp"}
            </p>
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
          {messages.length === 0 && loadedChatId === chatId && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Нет сообщений в этом чате</p>
            </div>
          )}
          {messages.length === 0 && loadedChatId !== chatId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Загрузка сообщений...
                </p>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isOutgoing ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`group max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.isOutgoing
                        ? "bg-green-600 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                      <div className="flex items-center justify-end">
                        <span className="text-xs opacity-70">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to bottom button with animation */}
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

      {/* AI Suggestion Panel */}
      {aiSettings.enabled && showAiSuggestion && aiSuggestion && (
        <div className="px-4 py-2 border-t border-border">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                AI предлагает ответ:
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap break-words">
                {aiSuggestion}
              </p>
            </div>
            <div className="flex items-center gap-1">
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
      )}

      {aiSettings.enabled && aiSuggestionLoading && (
        <div className="px-4 py-2 border-t border-border">
          <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              AI анализирует переписку...
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          {aiSettings.enabled && (
            <Button
              variant="outline"
              size="icon"
              onClick={getAISuggestion}
              disabled={aiSuggestionLoading}
              className="flex-shrink-0 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              {aiSuggestionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
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
              disabled={isSending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="flex-shrink-0"
          >
            {isSending ? (
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

export default WhatsAppMessageArea;

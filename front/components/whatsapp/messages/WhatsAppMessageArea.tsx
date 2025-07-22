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

import ChatBackground from "../../messaging/ChatBackground";

interface WhatsAppMessageAreaProps {
  chatId: string;
  chatName: string;
  isAIPanelOpen?: boolean;
  setIsAIPanelOpen?: (open: boolean) => void;
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

  setIsAIPanelOpen,
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setIsTyping(false);
    try {
      await sendMessage("whatsapp", chatId, newMessage.trim());
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
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden max-h-screen">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-600">
                {chatName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-medium text-foreground">
                {chatName}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isTyping ? "печатает..." : "WhatsApp"}
              </p>
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
      <ChatBackground platform="whatsapp">
        <div
          ref={scrollContainerRef}
          className="h-full px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-green-200/60 dark:scrollbar-thumb-green-900/40 scrollbar-track-transparent"
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
                    className={`group max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-md transition-all duration-300 border border-transparent ${
                      message.isOutgoing
                        ? "bg-gradient-to-br from-green-400/90 to-green-600/90 text-white shadow-green-200/40 dark:shadow-green-900/30"
                        : "bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 border-gray-200/60 dark:border-gray-700/60 shadow-gray-200/30 dark:shadow-gray-900/20"
                    }`}
                    style={{
                      boxShadow: message.isOutgoing
                        ? "0 4px 24px 0 rgba(37,211,102,0.10)"
                        : "0 2px 12px 0 rgba(80,80,120,0.08)",
                      backdropFilter: "blur(2px)",
                    }}
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
      </ChatBackground>

      {/* AI Suggestion Panel */}
      {aiSettings.enabled && showAiSuggestion && aiSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="px-4 py-3 border-t border-border"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 via-emerald-500/8 to-teal-500/10 dark:from-green-500/20 dark:via-emerald-500/15 dark:to-teal-500/20 border border-green-200/50 dark:border-green-700/50 rounded-2xl p-4 backdrop-blur-sm shadow-lg">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-transparent to-emerald-400/20 animate-pulse" />
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)] animate-ping" />
            </div>

            <div className="relative flex items-start gap-3">
              {/* Animated AI icon */}
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
              >
                <Sparkles className="h-5 w-5 text-white" />
              </motion.div>

              <div className="flex-1 min-w-0 space-y-3">
                {/* Header with animated elements */}
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                >
                  AI предлагает ответ:
                </motion.p>

                {/* Suggestion text with typing animation */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words"
                >
                  {aiSuggestion}
                </motion.p>
              </div>

              {/* Action buttons with animations */}
              <div className="flex flex-col gap-3 min-w-[120px]">
                {/* Main action button */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button
                    onClick={useAISuggestion}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl font-medium"
                  >
                    Использовать
                  </Button>
                </motion.div>

                {/* Secondary action button */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissAISuggestion}
                    className="w-full h-9 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 hover:scale-105 border border-red-200/50 dark:border-red-700/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {aiSettings.enabled && aiSuggestionLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="px-4 py-3 border-t border-border"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 via-emerald-500/8 to-teal-500/10 dark:from-green-500/20 dark:via-emerald-500/15 dark:to-teal-500/20 border border-green-200/50 dark:border-green-700/50 rounded-2xl p-4 backdrop-blur-sm shadow-lg">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-transparent to-emerald-400/20 animate-pulse" />
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)] animate-ping" />
            </div>

            <div className="relative flex items-center gap-3">
              {/* Animated loading icon */}
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                }}
                className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
              >
                <Loader2 className="h-5 w-5 text-white" />
              </motion.div>

              <div className="flex-1">
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                >
                  AI анализирует переписку...
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-xs text-gray-600 dark:text-gray-400 mt-1"
                >
                  Изучаю контекст и ваш стиль общения
                </motion.p>
              </div>

              {/* Animated dots */}
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -8, 0],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-2 h-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-gradient-to-br from-white/80 to-green-50/60 dark:from-gray-900/80 dark:to-green-950/80 backdrop-blur-md">
        <div className="flex items-end gap-2 max-h-32 overflow-hidden">
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
          <div className="flex-1 min-h-0">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              placeholder="Написать сообщение..."
              className="min-h-[40px] max-h-[80px] resize-none rounded-xl bg-white/70 dark:bg-gray-900/70 shadow-inner border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-400/40 transition-all overflow-y-auto"
              disabled={isSending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="flex-shrink-0 bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white shadow-lg transform-gpu transition-all duration-200"
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

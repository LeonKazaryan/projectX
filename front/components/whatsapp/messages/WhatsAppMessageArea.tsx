import React, { useState, useEffect, useRef } from "react";
import { useMessagingStore } from "../../messaging/MessagingStore";
import type { Message } from "../../messaging/types";
import { Button } from "../../../src/components/ui/button";
import { Textarea } from "../../../src/components/ui/textarea";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { ScrollArea } from "../../../src/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, ChevronDown, Loader2 } from "lucide-react";

interface WhatsAppMessageAreaProps {
  chatId: string;
  chatName: string;
}

const WhatsAppMessageArea: React.FC<WhatsAppMessageAreaProps> = ({
  chatId,
  chatName,
}) => {
  const {
    messages: allMessages,
    sendMessage,
    loadMessages,
    refreshMessages,
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
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

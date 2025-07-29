import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronDown, Sparkles, Loader2 } from "lucide-react";
import {
  getMessages,
  // saveMessage, // Unused import
  setMessages,
} from "../../utils/localMessageStore";
import { useMessagingStore } from "../../messaging/MessagingStore";
import type { Message } from "../../messaging/types";

interface WhatsAppMessageAreaProps {
  chatId: string;
  chatName: string;
  setIsAIPanelOpen: (open: boolean) => void;
}

const WhatsAppMessageArea: React.FC<WhatsAppMessageAreaProps> = ({
  chatId,
  chatName,
  setIsAIPanelOpen,
}) => {
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadedChatId, setLoadedChatId] = useState<string | null>(null);
  const [_isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [_oldestMessageId, setOldestMessageId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousChatIdRef = useRef<string>("");
  const isChatSwitchRef = useRef(true);
  const justSentMessageRef = useRef(false);

  useEffect(() => {
    if (chatId && chatId !== loadedChatId) {
      const isSwitch = previousChatIdRef.current !== chatId;
      if (isSwitch) {
        isChatSwitchRef.current = true;
        setMessagesState([]);
        setShowScrollButton(false);
        // Reset pagination state
        setIsLoadingMore(false);
        setHasMoreMessages(true);
        setOldestMessageId("");
        previousChatIdRef.current = chatId;
      }
      loadLocalMessages();
      setLoadedChatId(chatId);
    }
  }, [chatId]);

  const {
    loadMessages: loadMessagesFromStore,
    getChatMessages,
    sendMessage,
  } = useMessagingStore();

  const loadLocalMessages = async () => {
    console.log("💬 Loading messages for chat:", chatId);

    // First load from local storage (instant)
    const localMsgs = await getMessages(chatId);
    console.log("📱 Local messages count:", localMsgs.length);
    setMessagesState(localMsgs);

    // Then load from WhatsApp API (fresh data)
    try {
      await loadMessagesFromStore(chatId);
      const freshMessages = getChatMessages(chatId);
      console.log("🌐 Fresh messages count:", freshMessages.length);
      if (freshMessages.length > 0) {
        // Save fresh messages to local storage
        await setMessages(chatId, freshMessages);
        setMessagesState(freshMessages);
      }
    } catch (error) {
      console.error("❌ Failed to load messages from WhatsApp:", error);
    }
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (isChatSwitchRef.current) {
      scrollToBottom(false);
      isChatSwitchRef.current = false;
      setIsNearBottom(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    } else if (isNearBottom) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages, isNearBottom]);

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

    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately

    try {
      console.log("📤 Sending WhatsApp message to chat:", chatId);

      // Send message through MessagingStore (which will use WhatsApp Provider)
      await sendMessage("whatsapp", chatId, messageText);

      console.log("✅ Message sent successfully");
      justSentMessageRef.current = true;
      setIsNearBottom(true);

      // Reload messages to get the sent message
      setTimeout(() => {
        loadLocalMessages();
        scrollToBottom(true);
      }, 500);
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      // Restore message text if sending failed
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  };

  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isBottom = scrollTop + clientHeight >= scrollHeight - 100;
    setIsNearBottom(isBottom);
    setShowScrollButton(!isBottom);

    // Infinite scroll: load more messages when near top
    const distanceFromTop = scrollTop;
    const nearTop = distanceFromTop <= 100;

    if (nearTop && hasMoreMessages && !isLoadingMore) {
      console.log("🔄 Near top, loading more WhatsApp messages...");
      loadMoreMessages();
    }
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);

    // Сохраняем текущую позицию скролла
    const scrollContainer = scrollContainerRef.current;
    const scrollTop = scrollContainer?.scrollTop || 0;
    const scrollHeight = scrollContainer?.scrollHeight || 0;

    try {
      console.log("📱 Loading more WhatsApp messages from server...");

      // Load more messages from MessagingStore
      await loadMessagesFromStore(chatId);
      const allMessages = getChatMessages(chatId);

      // Update local storage and state
      await setMessages(chatId, allMessages);
      setMessagesState(allMessages);

      // Check if we have more messages to load
      setHasMoreMessages(
        allMessages.length % 100 === 0 && allMessages.length > 0
      );

      console.log(`📱 Loaded total ${allMessages.length} WhatsApp messages`);

      // Восстанавливаем позицию скролла после загрузки
      setTimeout(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const scrollDifference = newScrollHeight - scrollHeight;
          scrollContainer.scrollTop = scrollTop + scrollDifference;
        }
      }, 50);
    } catch (error) {
      console.error("❌ Failed to load more WhatsApp messages:", error);
      setHasMoreMessages(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) {
      return "??:??";
    }

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "??:??";
      }

      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting time:", error, "for date:", dateString);
      return "??:??";
    }
  };

  // Check if current chat is a group chat
  const isGroupChat = () => {
    // WhatsApp group chats end with @g.us, personal chats end with @c.us
    return chatId.includes("@g.us");
  };

  // Get contact name from phone number/ID
  const getContactName = (contactId: string) => {
    // Extract phone number without @c.us or @g.us
    const phoneNumber = contactId.split("@")[0];

    // For now, just return the phone number
    // TODO: In the future, we could implement contact name lookup
    return phoneNumber;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-200/60 dark:border-green-800/40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {chatName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {chatName}
            </h3>
            <p className="text-xs text-green-600 dark:text-green-400">
              WhatsApp
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAIPanelOpen(true)}
          className="p-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:from-orange-500 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/25"
        >
          <Sparkles size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-green-200 dark:scrollbar-thumb-green-800 scrollbar-track-transparent"
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

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
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
                }}
              >
                <div className="flex flex-col space-y-1">
                  {!message.isOutgoing && isGroupChat() && (
                    <div className="flex items-center mb-1">
                      <span className="text-xs font-medium opacity-80 text-green-600 dark:text-green-400">
                        {getContactName(message.from)}
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed break-words">
                    {message.text}
                  </p>
                  <div className="flex items-center justify-end">
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.isOutgoing && (
                      <span className="ml-1 text-xs opacity-70">✓</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-20 right-6 p-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-full shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-110"
          >
            <ChevronDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-green-200/60 dark:border-green-800/40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Написать сообщение..."
              className="w-full px-4 py-3 pr-12 bg-white/80 dark:bg-gray-700/80 border border-green-200/60 dark:border-green-800/40 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              rows={1}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className={`p-3 rounded-full transition-all duration-300 ${
              newMessage.trim() && !isSending
                ? "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg hover:shadow-green-500/25"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMessageArea;

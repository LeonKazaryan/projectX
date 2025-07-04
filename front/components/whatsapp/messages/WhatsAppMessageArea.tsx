import React, { useState, useEffect, useRef } from "react";
import { useMessagingStore } from "../../messaging/MessagingStore";
import type { Message } from "../../messaging/types";
import { Button } from "../../../src/components/ui/button";
import { Input } from "../../../src/components/ui/input";
import { ScrollArea } from "../../../src/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";

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
  } = useMessagingStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadedChatId, setLoadedChatId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Remove automatic loading - let user click to load messages
  const handleLoadMessages = () => {
    if (chatId && chatId !== loadedChatId) {
      console.log("Loading messages for chatId:", chatId);
      loadMessages(chatId);
      setLoadedChatId(chatId);
    }
  };

  useEffect(() => {
    const chatMessages = allMessages[chatId] || [];
    setMessages(chatMessages);

    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current && chatMessages.length > 0) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [allMessages, chatId]); // Depend on actual messages data

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const success = await sendMessage(chatId, newMessage.trim());
      if (success) {
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold">{chatName}</h3>
          <p className="text-xs text-muted-foreground">WhatsApp</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-muted-foreground mb-4">
                Нажмите чтобы загрузить сообщения
              </p>
              <Button
                onClick={handleLoadMessages}
                variant="outline"
                disabled={loadedChatId === chatId}
              >
                {loadedChatId === chatId
                  ? "Сообщения загружены"
                  : "Загрузить сообщения"}
              </Button>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isOutgoing ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  message.isOutgoing
                    ? "bg-green-600 text-white"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.isOutgoing
                      ? "text-green-100"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

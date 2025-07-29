import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../src/components/ui/button";
import { Textarea } from "../../src/components/ui/textarea";
import { ScrollArea } from "../../src/components/ui/scroll-area";
import {
  Bot,
  Send,
  X,
  MessageSquare,
  Loader2,
  Sparkles,
  AlertCircle,
  Lightbulb,
  Search,
  Clock,
} from "lucide-react";
import { API_BASE_URL } from "../services/authService";

interface AIMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  source: "telegram" | "whatsapp";
  sessionId: string;
  currentMessages: any[]; // recent chat messages for context
}

const AIPanel: React.FC<AIPanelProps> = ({
  isOpen,
  onClose,
  chatId,
  chatName,
  source,
  sessionId,
  currentMessages = [],
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string>("");
  const [suggestions] = useState([
    "О чём мы говорили вчера?",
    "Сделай краткий пересказ переписки",
    "Как лучше ответить на это сообщение?",
    "Найди упоминания адреса или встречи",
    "Найди все обсуждения про работу",
    "Когда мы договаривались о встрече?",
  ]);

  const [isIndexing, setIsIndexing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const indexFullChat = async () => {
    if (isIndexing || currentMessages.length === 0) return;

    setIsIndexing(true);
    try {
      console.log(
        `🧠 Indexing ${currentMessages.length} messages for smart search...`
      );

      const res = await fetch(`${API_BASE_URL}/ai/analyze-full-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "chathut_access_token"
          )}`,
        },
        body: JSON.stringify({
          query: "Index entire chat history",
          session_id: sessionId,
          chat_id: chatId.toString(),
          source,
          chat_name: chatName,
          context_messages: currentMessages,
        }),
      });

      const data = await res.json();
      if (data.success) {
        console.log(
          `✅ Indexed ${data.vectorized_messages} conversation chunks`
        );
        // Show success message
        const successMsg: AIMessage = {
          id: Date.now().toString(),
          type: "ai",
          content: `✅ Успешно проиндексировал ${data.vectorized_messages} блоков переписки! Теперь я могу быстро находить информацию по всей истории чата.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMsg]);
      } else {
        throw new Error(data.error || "Indexing failed");
      }
    } catch (e: any) {
      console.error("Indexing error:", e);
      const errorMsg: AIMessage = {
        id: Date.now().toString(),
        type: "ai",
        content: `❌ Ошибка индексации: ${e.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsIndexing(false);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || isLoading) return;

    console.log(
      `[CONTEXT-TRACE-9] AI Panel sending query with ${currentMessages.length} context messages`
    );

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      type: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError("");

    // typing indicator
    const typingMsg: AIMessage = {
      id: "typing",
      type: "ai",
      content: "",
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMsg]);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "chathut_access_token"
          )}`,
        },
        body: JSON.stringify({
          query: text,
          session_id: sessionId,
          chat_id: chatId.toString(),
          source,
          chat_name: chatName,
          context_messages: currentMessages,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "AI error");

      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) =>
        prev.filter((m) => m.id !== "typing").concat(aiMsg)
      );
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ошибка AI");
      setMessages((prev) => prev.filter((m) => m.id !== "typing"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  const renderMessage = (m: AIMessage) => {
    if (m.isTyping) {
      return (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3"
        >
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">AI думает...</span>
            </div>
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div
        key={m.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-3 p-3 ${
          m.type === "user" ? "flex-row-reverse" : ""
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            m.type === "user" ? "bg-blue-500" : "bg-orange-500"
          }`}
        >
          {m.type === "user" ? (
            <MessageSquare className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
        <div className="flex-1 max-w-[80%]">
          <div
            className={`${
              m.type === "user"
                ? "bg-gradient-to-br from-blue-400/90 to-blue-600/90 text-white shadow-blue-200/40 dark:shadow-blue-900/30"
                : "bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 border border-orange-200/60 dark:border-orange-800/60 shadow-orange-200/30 dark:shadow-orange-900/20"
            } rounded-2xl px-4 py-3 backdrop-blur-sm`}
          >
            <p className="text-sm whitespace-pre-wrap">{m.content}</p>
          </div>
          <p
            className={`text-xs text-gray-500 mt-1 ${
              m.type === "user" ? "text-right" : "text-left"
            }`}
          >
            {formatTime(m.timestamp)}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-96 bg-gradient-to-br from-white/95 via-orange-50/90 to-orange-100/80 dark:from-gray-900/95 dark:via-orange-950/90 dark:to-orange-900/80 border-l border-orange-200/60 dark:border-orange-800/60 shadow-2xl transform-gpu z-50 backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500 to-orange-600">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Помощник</h3>
                <p className="text-xs text-orange-100">{chatName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={indexFullChat}
                disabled={isIndexing || currentMessages.length === 0}
                className="h-8 px-2 text-white hover:bg-white hover:bg-opacity-20 text-xs"
                title="Проиндексировать всю историю чата для умного поиска"
              >
                {isIndexing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                {isIndexing ? "Индексация..." : "Индекс"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-white hover:bg-white hover:bg-opacity-20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <>
            {/* Messages */}
            <div className="flex-1 overflow-hidden relative bg-gradient-to-br from-orange-50/60 via-white/80 to-orange-100/60 dark:from-gray-900/80 dark:via-gray-900/90 dark:to-orange-950/80 backdrop-blur-md">
              <ScrollArea className="h-[calc(100vh-14rem)]">
                <div className="p-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Задайте вопрос об этом чате
                      </h4>
                      <p className="text-sm text-gray-500 mb-6">
                        Я могу проанализировать переписку, найти информацию или
                        помочь с ответом
                      </p>

                      <div className="space-y-2">
                        {suggestions.map((s, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => sendMessage(s)}
                            className="w-full text-left p-3 rounded-lg border border-orange-200/60 dark:border-orange-800/60 hover:bg-orange-50/80 dark:hover:bg-orange-900/20 transition-colors group bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-800 transition-colors">
                                {i === 0 && (
                                  <Clock className="w-3 h-3 text-orange-600" />
                                )}
                                {i === 1 && (
                                  <MessageSquare className="w-3 h-3 text-orange-600" />
                                )}
                                {i === 2 && (
                                  <Lightbulb className="w-3 h-3 text-orange-600" />
                                )}
                                {i === 3 && (
                                  <Search className="w-3 h-3 text-orange-600" />
                                )}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {s}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {messages.map(renderMessage)}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </motion.div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-orange-200/60 dark:border-orange-800/60 bg-gradient-to-br from-white/80 to-orange-50/60 dark:from-gray-900/80 dark:to-orange-950/80 backdrop-blur-md">
              <div className="flex gap-2 max-h-24 overflow-hidden">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Спросите что-нибудь об этом чате..."
                  className="flex-1 min-h-[2.5rem] max-h-16 resize-none bg-white/70 dark:bg-gray-900/70 border-orange-200/60 dark:border-orange-800/60 focus:ring-2 focus:ring-orange-400/40 transition-all rounded-xl overflow-y-auto"
                  disabled={isLoading}
                  style={{
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="h-10 w-10 p-0 bg-orange-500 hover:bg-orange-600 flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIPanel;

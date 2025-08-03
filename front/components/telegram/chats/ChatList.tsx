import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../../../src/components/ui/button";
import { Badge } from "../../../src/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../src/components/ui/avatar";
import { Input } from "../../../src/components/ui/input";
import { Loader2, RotateCcw, Search } from "lucide-react";

import { API_BASE_URL } from "../../services/authService";
import { motion, AnimatePresence } from "framer-motion";

interface Dialog {
  id: number;
  name: string;
  is_user: boolean;
  is_group: boolean;
  is_channel: boolean;
  can_send_messages: boolean;
  is_archived: boolean;
  unread_count: number;
  last_message: {
    text: string;
    date: string | null;
  };
  photo?: string; // Optional photo property
}

interface ChatListProps {
  sessionId: string;
  onChatSelect: (
    chatId: number,
    chatName: string,
    isGroup: boolean,
    isChannel: boolean
  ) => void;
  selectedChatId?: number;
  includeArchived?: boolean;
  includeReadonly?: boolean;
  includeGroups?: boolean;
  syncTrigger?: number;
}

const ChatList: React.FC<ChatListProps & { onSessionExpired?: () => void }> = ({
  sessionId,
  onChatSelect,
  selectedChatId,
  includeArchived = false,
  includeReadonly = false,
  includeGroups = true,
  syncTrigger = 0,
  onSessionExpired,
}) => {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [filteredDialogs, setFilteredDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const connectWebSocket = useCallback(async () => {
    if (!sessionId || sessionExpired) {
      console.log(
        "No session ID or session expired, skipping WebSocket connection"
      );
      return;
    }

    try {
      console.log("Connecting ChatList WebSocket...");

      const wsProtocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
      const wsHost = API_BASE_URL.split("//")[1].split("/api")[0];
      const wsUrl = `${wsProtocol}://${wsHost}/ws/${sessionId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("ChatList WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("ChatList WebSocket message:", data);

          if (data.type === "new_message") {
            setDialogs((prevDialogs) => {
              const updatedDialogs = [...prevDialogs];
              const dialogIndex = updatedDialogs.findIndex(
                (d) => d.id === data.data.chat_id
              );
              if (dialogIndex !== -1) {
                updatedDialogs[dialogIndex].last_message = {
                  text: data.data.text,
                  date: data.data.date,
                };
                if (!data.data.is_outgoing) {
                  updatedDialogs[dialogIndex].unread_count += 1;
                }

                // Move to top for recent messages
                return updatedDialogs.sort((a, b) => {
                  const aDate = new Date(a.last_message.date || 0).getTime();
                  const bDate = new Date(b.last_message.date || 0).getTime();
                  return bDate - aDate;
                });
              }
              return prevDialogs;
            });
          }
        } catch (error) {
          console.error("Error parsing ChatList WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("ChatList WebSocket closed:", event.code, event.reason);

        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect ChatList WebSocket...");
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error("ChatList WebSocket error:", error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create ChatList WebSocket connection:", error);
    }
  }, [sessionId, selectedChatId, sessionExpired]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Component unmounting");
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchDialogs();
  }, [sessionId, includeArchived, includeReadonly, includeGroups, syncTrigger]);

  useEffect(() => {
    if (sessionId && !sessionExpired) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [sessionId, connectWebSocket, disconnectWebSocket, sessionExpired]);

  useEffect(() => {
    if (selectedChatId) {
      setDialogs((prevDialogs) => {
        return prevDialogs.map((dialog) => {
          if (dialog.id === selectedChatId) {
            return {
              ...dialog,
              unread_count: 0,
            };
          }
          return dialog;
        });
      });
    }
  }, [selectedChatId]);

  useEffect(() => {
    const results = dialogs.filter((dialog) =>
      dialog.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDialogs(results);
  }, [searchTerm, dialogs]);

  const fetchDialogs = async () => {
    try {
      setLoading(true);
      setSessionExpired(false);
      const params = new URLSearchParams({
        session_id: sessionId,
        limit: "5000",
        include_archived: includeArchived.toString(),
        include_readonly: includeReadonly.toString(),
        include_groups: includeGroups.toString(),
      });
      const response = await fetch(`${API_BASE_URL}/chats/dialogs?${params}`);
      if (response.status === 400) {
        const data = await response.json();
        if (
          data.detail &&
          (data.detail.includes("Клиент не найден") ||
            data.detail.includes("client not found"))
        ) {
          // Сбросить session_id/session_string и показать ошибку
          localStorage.removeItem("telegram_session_id");
          localStorage.removeItem("telegram_session_string");
          setSessionExpired(true);
          setError(
            "Сессия Telegram устарела или недействительна. Войдите заново."
          );
          if (onSessionExpired) onSessionExpired();
          setLoading(false);
          return;
        }
      }
      const data = await response.json();
      if (data.success) {
        setDialogs(data.dialogs);
        setFilteredDialogs(data.dialogs);
        setError("");
      } else {
        setError(data.error || "Ошибка загрузки чатов");
      }
    } catch (error) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-card border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold tracking-tight">Чаты</h2>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Загрузка чатов...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-card border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold tracking-tight">Чаты</h2>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchDialogs} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Повторить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div className="flex flex-col h-full bg-card border-r items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-lg text-destructive font-semibold">
            Сессия Telegram устарела или недействительна
          </p>
          <p className="text-sm text-muted-foreground">
            Пожалуйста, войдите в Telegram заново, чтобы продолжить пользоваться
            чатами.
          </p>
          <Button
            variant="default"
            size="lg"
            onClick={() => {
              if (onSessionExpired) onSessionExpired();
              // Можно также сделать window.location.reload() или вызвать глобальный logout Telegram
            }}
          >
            Войти заново
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0 bg-gradient-to-br from-blue-50/60 via-white/80 to-purple-100/60 dark:from-gray-900/80 dark:via-gray-900/90 dark:to-blue-950/80 border-r backdrop-blur-md transition-colors duration-500">
      <div className="p-4 border-b bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
        <h2 className="text-xl font-semibold tracking-tight text-blue-600 dark:text-blue-300">
          Чаты
        </h2>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 dark:text-blue-300" />
          <Input
            placeholder="Поиск..."
            className="pl-8 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-blue-800 focus:ring-2 focus:ring-blue-400/40 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="p-2 space-y-1">
          <AnimatePresence initial={false}>
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center h-full p-8"
              >
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </motion.div>
            ) : (
              filteredDialogs.map((dialog) => (
                <motion.div
                  key={dialog.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group shadow-sm hover:bg-blue-100/60 dark:hover:bg-blue-900/30 ${
                      selectedChatId === dialog.id
                        ? "bg-blue-200/80 dark:bg-blue-900/60 border border-blue-400/40"
                        : ""
                    }`}
                    onClick={() =>
                      onChatSelect(
                        dialog.id,
                        dialog.name,
                        dialog.is_group,
                        dialog.is_channel
                      )
                    }
                  >
                    <Avatar className="h-10 w-10 shadow-md">
                      {dialog.photo ? (
                        <AvatarImage src={dialog.photo} alt={dialog.name} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white font-bold">
                          {dialog.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-900 dark:text-blue-200 truncate">
                          {dialog.name}
                        </span>
                        {dialog.unread_count > 0 && (
                          <Badge className="ml-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs animate-pulse">
                            {dialog.unread_count}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {dialog.last_message?.text}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChatList;

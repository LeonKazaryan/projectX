import React, { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "../../../src/components/ui/scroll-area";
import { Button } from "../../../src/components/ui/button";
import { Badge } from "../../../src/components/ui/badge";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import {
  MessageCircle,
  Users,
  Megaphone,
  User,
  Loader2,
  AlertCircle,
  RotateCcw,
  Hash,
  Archive,
} from "lucide-react";

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
}

interface ChatListProps {
  sessionId: string;
  onChatSelect: (chatId: number, chatName: string) => void;
  selectedChatId?: number;
  includeArchived?: boolean;
  includeReadonly?: boolean;
  includeGroups?: boolean;
  syncTrigger?: number;
}

const ChatList: React.FC<ChatListProps> = ({
  sessionId,
  onChatSelect,
  selectedChatId,
  includeArchived = false,
  includeReadonly = false,
  includeGroups = true,
  syncTrigger = 0,
}) => {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE = "http://localhost:8000/api";

  const connectWebSocket = useCallback(async () => {
    if (!sessionId) {
      console.log("No session ID, skipping WebSocket connection");
      return;
    }

    try {
      setConnectionStatus("connecting");
      console.log("Connecting ChatList WebSocket...");

      const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);

      ws.onopen = () => {
        console.log("ChatList WebSocket connected");
        setConnectionStatus("connected");
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
        setConnectionStatus("disconnected");

        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect ChatList WebSocket...");
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error("ChatList WebSocket error:", error);
        setConnectionStatus("disconnected");
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create ChatList WebSocket connection:", error);
      setConnectionStatus("disconnected");
    }
  }, [sessionId, selectedChatId]);

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

  useEffect(() => {
    fetchDialogs();
  }, [sessionId, includeArchived, includeReadonly, includeGroups, syncTrigger]);

  useEffect(() => {
    if (sessionId) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [sessionId, connectWebSocket, disconnectWebSocket]);

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

  const fetchDialogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        session_id: sessionId,
        limit: "200",
        include_archived: includeArchived.toString(),
        include_readonly: includeReadonly.toString(),
        include_groups: includeGroups.toString(),
      });

      const response = await fetch(`${API_BASE}/chats/dialogs?${params}`);
      const data = await response.json();

      if (data.success) {
        setDialogs(data.dialogs);
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

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "вчера";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("ru-RU", { weekday: "short" });
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  const getChatIcon = (dialog: Dialog) => {
    if (dialog.is_user) return <User className="h-4 w-4" />;
    if (dialog.is_group) return <Users className="h-4 w-4" />;
    if (dialog.is_channel) return <Megaphone className="h-4 w-4" />;
    return <MessageCircle className="h-4 w-4" />;
  };

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

  if (loading) {
    return (
      <div className="w-80 bg-card border-r border-border flex flex-col h-full">
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Telegram</h2>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}
              />
            </div>
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
      <div className="w-80 bg-card border-r border-border flex flex-col h-full">
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Telegram</h2>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
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

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram
          </h2>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}
              title={`Real-time: ${connectionStatus}`}
            />
            <Badge variant="secondary" className="text-xs">
              {dialogs.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">
            {dialogs.map((dialog) => (
              <div
                key={dialog.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 mb-1 ${
                  selectedChatId === dialog.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onChatSelect(dialog.id, dialog.name)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getChatIcon(dialog)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate flex items-center gap-1">
                        {dialog.name}
                        {dialog.is_archived && (
                          <Archive className="h-3 w-3 text-muted-foreground" />
                        )}
                        {!dialog.can_send_messages && (
                          <Hash className="h-3 w-3 text-muted-foreground" />
                        )}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {dialog.unread_count > 0 && (
                          <Badge
                            variant="default"
                            className="h-5 min-w-5 text-xs px-1.5 bg-primary text-primary-foreground"
                          >
                            {dialog.unread_count > 99
                              ? "99+"
                              : dialog.unread_count}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(dialog.last_message.date)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {dialog.last_message.text || "Нет сообщений"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatList;

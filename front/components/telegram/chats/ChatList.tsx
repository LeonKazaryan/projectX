import React, { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [filteredDialogs, setFilteredDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE = "http://localhost:8000/api";

  const connectWebSocket = useCallback(async () => {
    if (!sessionId) {
      console.log("No session ID, skipping WebSocket connection");
      return;
    }

    try {
      console.log("Connecting ChatList WebSocket...");

      const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);

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

  useEffect(() => {
    const results = dialogs.filter((dialog) =>
      dialog.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDialogs(results);
  }, [searchTerm, dialogs]);

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
      <div className="flex-1 overflow-y-auto">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">
                <Loader2 className="mx-auto h-6 w-6 mb-2" />
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDialogs}
                  className="mt-2"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Повторить
                </Button>
              </div>
            ) : (
              filteredDialogs.map((dialog) => (
                <button
                  key={dialog.id}
                  onClick={() => onChatSelect(dialog.id, dialog.name)}
                  className={cn(
                    "flex items-start w-full text-left p-2 rounded-lg transition-colors",
                    selectedChatId === dialog.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={dialog.photo} alt={dialog.name} />
                    <AvatarFallback
                      className={cn(
                        "text-sm",
                        selectedChatId === dialog.id &&
                          "bg-primary-foreground text-primary"
                      )}
                    >
                      {dialog.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold truncate pr-2">
                        {dialog.name}
                      </p>
                      <time
                        className={cn(
                          "text-xs",
                          selectedChatId === dialog.id
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatTime(dialog.last_message?.date)}
                      </time>
                    </div>
                    <div className="flex justify-between items-end">
                      <p
                        className={cn(
                          "text-sm truncate pr-2",
                          selectedChatId === dialog.id
                            ? "text-primary-foreground/90"
                            : "text-muted-foreground"
                        )}
                      >
                        {dialog.last_message?.text}
                      </p>
                      {dialog.unread_count > 0 && (
                        <Badge
                          variant={
                            selectedChatId === dialog.id
                              ? "secondary"
                              : "default"
                          }
                          className="h-5 px-1.5 text-xs"
                        >
                          {dialog.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatList;

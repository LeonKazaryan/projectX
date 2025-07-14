import React, { useEffect, useState } from "react";
import { useMessagingStore } from "../../messaging/MessagingStore";
import type { Chat } from "../../messaging/types";
import { Badge } from "../../../src/components/ui/badge";
import { Button } from "../../../src/components/ui/button";
import { Input } from "../../../src/components/ui/input";
import { ScrollArea } from "../../../src/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import {
  MessageCircle,
  Users,
  User,
  Search,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "../../../src/lib/utils";

interface WhatsAppChatListProps {
  onChatSelect: (chat: Chat) => void;
  selectedChatId?: string;
}

const WhatsAppChatList: React.FC<WhatsAppChatListProps> = ({
  onChatSelect,
  selectedChatId,
}) => {
  const { chats: allChats, isLoading, loadChats } = useMessagingStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-load chats when component mounts, but only if WhatsApp is connected
  useEffect(() => {
    // Check if we have chats, if not - try to load them
    const whatsappChats = allChats.filter((chat) => chat.source === "whatsapp");
    if (whatsappChats.length === 0) {
      console.log("No WhatsApp chats found, attempting to load...");
      loadChats("whatsapp");
    }
  }, []); // Only run once on mount

  // Manual chat loading
  const handleLoadChats = () => {
    console.log("Manual reload of WhatsApp chats");
    loadChats("whatsapp");
  };

  useEffect(() => {
    const filteredChatsData = allChats
      .filter((chat) => chat.source === "whatsapp")
      .slice(0, 50); // Limit to prevent performance issues
    setChats(filteredChatsData);
  }, [allChats]); // Only depend on actual chats data

  // Search functionality like in Telegram
  useEffect(() => {
    const results = chats.filter((chat) =>
      chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredChats(results);
  }, [searchTerm, chats]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-card border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            WhatsApp
          </h2>
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

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            WhatsApp
          </h2>
          <Button
            onClick={handleLoadChats}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Загрузка..." : "Обновить"}
          </Button>
        </div>
        <div className="relative">
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
            {isLoading ? (
              <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredChats.length === 0 && searchTerm ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Search className="mx-auto h-6 w-6 mb-2 opacity-50" />
                <p>Чаты не найдены</p>
                <p className="text-xs">Попробуйте другой поисковый запрос</p>
              </div>
            ) : filteredChats.length === 0 && !searchTerm ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <MessageCircle className="mx-auto h-6 w-6 mb-2 opacity-50" />
                <p>Нет чатов</p>
                <p className="text-xs">Начните общение в WhatsApp</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onChatSelect(chat)}
                  className={cn(
                    "flex items-start w-full text-left p-2 rounded-lg transition-colors",
                    selectedChatId === chat.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback
                      className={cn(
                        "text-sm bg-green-100 dark:bg-green-900 text-green-600",
                        selectedChatId === chat.id &&
                          "bg-primary-foreground text-primary"
                      )}
                    >
                      {chat.title.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold truncate pr-2">
                        {chat.title}
                      </p>
                      <time
                        className={cn(
                          "text-xs",
                          selectedChatId === chat.id
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatTime(chat.lastMessage?.date || null)}
                      </time>
                    </div>
                    <div className="flex justify-between items-end">
                      <p
                        className={cn(
                          "text-sm truncate pr-2",
                          selectedChatId === chat.id
                            ? "text-primary-foreground/90"
                            : "text-muted-foreground"
                        )}
                      >
                        {chat.lastMessage?.text || "Нет сообщений"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge
                          variant={
                            selectedChatId === chat.id ? "secondary" : "default"
                          }
                          className="h-5 px-1.5 text-xs"
                        >
                          {chat.unreadCount}
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

export default WhatsAppChatList;

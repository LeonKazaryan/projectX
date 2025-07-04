import React, { useEffect, useState } from "react";
import { useMessagingStore } from "../../messaging/MessagingStore";
import type { Chat } from "../../messaging/types";
import { Badge } from "../../../src/components/ui/badge";
import { Button } from "../../../src/components/ui/button";
import { ScrollArea } from "../../../src/components/ui/scroll-area";
import { MessageCircle, Users, User } from "lucide-react";

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

  // Manual chat loading
  const handleLoadChats = () => {
    loadChats("whatsapp");
  };

  useEffect(() => {
    const filteredChats = allChats
      .filter((chat) => chat.source === "whatsapp")
      .slice(0, 50); // Limit to prevent performance issues
    setChats(filteredChats);
  }, [allChats]); // Only depend on actual chats data

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getChatIcon = (chat: Chat) => {
    if (chat.isGroup) {
      return <Users className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Загрузка чатов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              WhatsApp
            </h2>
            <p className="text-sm text-muted-foreground">
              {chats.length} чатов
            </p>
          </div>
          <Button
            onClick={handleLoadChats}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? "Загрузка..." : "Обновить"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedChatId === chat.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    {getChatIcon(chat)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">
                        {chat.title}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(chat.lastMessage.date)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {chat.lastMessage?.text || "Нет сообщений"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-2 flex-shrink-0"
                        >
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {chats.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Нет чатов</p>
            <p className="text-xs">Начните общение в WhatsApp</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppChatList;

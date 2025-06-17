import React, { useState, useEffect } from "react";
import "./ChatList.css";

interface Dialog {
  id: number;
  name: string;
  is_user: boolean;
  is_group: boolean;
  is_channel: boolean;
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
}

const ChatList: React.FC<ChatListProps> = ({
  sessionId,
  onChatSelect,
  selectedChatId,
}) => {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const API_BASE = "http://localhost:8000/api";

  useEffect(() => {
    fetchDialogs();
  }, [sessionId]);

  const fetchDialogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/chats/dialogs?session_id=${sessionId}&limit=50`
      );
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
    if (dialog.is_user) return "👤";
    if (dialog.is_channel) return "📢";
    if (dialog.is_group) return "👥";
    return "💬";
  };

  if (loading) {
    return (
      <div className="chat-list">
        <div className="chat-list-header">
          <h2>Telegram</h2>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка чатов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-list">
        <div className="chat-list-header">
          <h2>Telegram</h2>
        </div>
        <div className="error-container">
          <p className="error-text">{error}</p>
          <button onClick={fetchDialogs} className="retry-button">
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Telegram</h2>
        <div className="chat-count">{dialogs.length} чатов</div>
      </div>

      <div className="dialogs-container">
        {dialogs.map((dialog) => (
          <div
            key={dialog.id}
            className={`dialog-item ${
              selectedChatId === dialog.id ? "selected" : ""
            }`}
            onClick={() => onChatSelect(dialog.id, dialog.name)}
          >
            <div className="dialog-avatar">
              <span className="avatar-icon">{getChatIcon(dialog)}</span>
            </div>

            <div className="dialog-content">
              <div className="dialog-header">
                <h3 className="dialog-name">{dialog.name}</h3>
                <span className="dialog-time">
                  {formatTime(dialog.last_message.date)}
                </span>
              </div>

              <div className="dialog-footer">
                <p className="dialog-message">
                  {dialog.last_message.text || "Нет сообщений"}
                </p>
                {dialog.unread_count > 0 && (
                  <span className="unread-badge">{dialog.unread_count}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {dialogs.length === 0 && (
        <div className="empty-state">
          <p>У вас пока нет чатов</p>
        </div>
      )}
    </div>
  );
};

export default ChatList;

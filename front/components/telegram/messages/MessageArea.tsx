import React, { useState, useEffect, useRef } from "react";
import "./MessageArea.css";

interface Message {
  id: number;
  text: string;
  date: string;
  sender_id: number;
  is_outgoing: boolean;
}

interface MessageAreaProps {
  sessionId: string;
  chatId: number;
  chatName: string;
}

const MessageArea: React.FC<MessageAreaProps> = ({
  sessionId,
  chatId,
  chatName,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = "http://localhost:8000/api";

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    }
  }, [chatId, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${API_BASE}/messages/history?session_id=${sessionId}&dialog_id=${chatId}&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages.reverse()); // Reverse to show newest at bottom
      } else {
        setError(data.error || "Ошибка загрузки сообщений");
      }
    } catch (error) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          dialog_id: chatId,
          text: messageText.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessageText("");
        // Add the sent message to the list
        const newMessage: Message = {
          id: data.message.id,
          text: data.message.text,
          date: data.message.date,
          sender_id: 0, // Current user
          is_outgoing: true,
        };
        setMessages((prev) => [...prev, newMessage]);
      } else {
        setError(data.error || "Ошибка отправки сообщения");
      }
    } catch (error) {
      setError("Ошибка соединения с сервером");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!chatId) {
    return (
      <div className="message-area">
        <div className="no-chat-selected">
          <div className="no-chat-icon">💬</div>
          <h3>Выберите чат для начала общения</h3>
          <p>Выберите чат из списка слева, чтобы начать просмотр сообщений</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-area">
      <div className="message-header">
        <h3>{chatName}</h3>
        <div className="header-actions">
          <button
            onClick={fetchMessages}
            className="refresh-button"
            disabled={loading}
          >
            🔄
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      <div className="messages-container">
        {loading ? (
          <div className="loading-messages">
            <div className="loading-spinner"></div>
            <p>Загрузка сообщений...</p>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>В этом чате пока нет сообщений</p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${
                      message.is_outgoing ? "outgoing" : "incoming"
                    }`}
                  >
                    <div className="message-content">
                      <div className="message-text">{message.text}</div>
                      <div className="message-time">
                        {formatTime(message.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="message-input-container">
        <div className="message-input-wrapper">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            className="message-input"
            disabled={sending}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!messageText.trim() || sending}
            className="send-button"
          >
            {sending ? "⏳" : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageArea;

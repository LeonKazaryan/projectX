import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TelegramLogin from "./tlogin/TelegramLogin";
import MTProtoAuth from "./auth/MTProtoAuth";
import ChatList from "./chats/ChatList";
import MessageArea from "./messages/MessageArea";
import "./TelegramClient.css";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface AuthState {
  isAuthenticated: boolean;
  sessionId?: string;
  sessionString?: string;
  user?: TelegramUser;
  authMethod?: "widget" | "mtproto";
}

interface SelectedChat {
  id: number;
  name: string;
}

const TelegramClient: React.FC = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
  });
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [error, setError] = useState<string>("");
  const [showMTProtoAuth, setShowMTProtoAuth] = useState(false);

  // Load saved session on component mount
  useEffect(() => {
    const savedSession = localStorage.getItem("telegram_session");
    const savedSessionString = localStorage.getItem("telegram_session_string");

    if (savedSession && savedSessionString) {
      // Try to restore session
      restoreSession(savedSessionString);
    }
  }, []);

  const restoreSession = async (sessionString: string) => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/auth/restore-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_string: sessionString }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setAuthState({
          isAuthenticated: true,
          sessionId: data.session_id,
          sessionString: sessionString,
          authMethod: "mtproto",
        });
        setError("");
      } else {
        // Clear invalid session
        localStorage.removeItem("telegram_session");
        localStorage.removeItem("telegram_session_string");
        setError("Сессия истекла, необходимо войти заново");
      }
    } catch (error) {
      setError("Ошибка восстановления сессии");
    }
  };

  const handleTelegramWidgetAuth = (user: TelegramUser) => {
    console.log("Telegram Widget auth successful:", user);
    setAuthState({
      isAuthenticated: true,
      user: user,
      authMethod: "widget",
    });
    setError("");
  };

  const handleMTProtoAuth = (sessionId: string, sessionString: string) => {
    console.log("MTProto auth successful");
    setAuthState({
      isAuthenticated: true,
      sessionId: sessionId,
      sessionString: sessionString,
      authMethod: "mtproto",
    });

    // Save session to localStorage
    localStorage.setItem("telegram_session", sessionId);
    localStorage.setItem("telegram_session_string", sessionString);

    setError("");
    setShowMTProtoAuth(false);
  };

  const handleAuthError = (error: string) => {
    setError(error);
  };

  const handleChatSelect = (chatId: number, chatName: string) => {
    setSelectedChat({ id: chatId, name: chatName });
  };

  const handleLogout = async () => {
    if (authState.sessionId) {
      try {
        await fetch(
          `http://localhost:8000/api/auth/logout?session_id=${authState.sessionId}`,
          {
            method: "POST",
          }
        );
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    // Clear local storage
    localStorage.removeItem("telegram_session");
    localStorage.removeItem("telegram_session_string");

    // Reset state
    setAuthState({ isAuthenticated: false });
    setSelectedChat(null);
    setError("");
    setShowMTProtoAuth(false);
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="telegram-client">
        <div className="auth-container">
          <button onClick={handleBackToHome} className="back-to-home">
            ← Назад на главную
          </button>

          {!showMTProtoAuth ? (
            <div className="auth-options">
              <div className="auth-header">
                <h1>Войти в Telegram</h1>
                <p>Выберите способ входа в ваш аккаунт Telegram</p>
              </div>

              {error && (
                <div className="error-message">
                  <span>{error}</span>
                  <button onClick={() => setError("")}>✕</button>
                </div>
              )}

              <div className="auth-methods">
                <div className="auth-method">
                  <h3>Быстрый вход через Telegram Widget</h3>
                  <p>
                    Используйте готовый виджет Telegram для быстрой авторизации
                  </p>
                  <TelegramLogin
                    botName="your_bot_username" // Replace with your bot username
                    buttonSize="large"
                    cornerRadius={8}
                    onAuth={handleTelegramWidgetAuth}
                    className="telegram-widget"
                  />
                  <small>⚠️ Требует настройки бота и домена</small>
                </div>

                <div className="auth-divider">
                  <span>или</span>
                </div>

                <div className="auth-method">
                  <h3>Полный доступ через MTProto</h3>
                  <p>
                    Получите доступ ко всем чатам и сообщениям через MTProto API
                  </p>
                  <button
                    onClick={() => setShowMTProtoAuth(true)}
                    className="mtproto-button"
                  >
                    Войти через номер телефона
                  </button>
                  <small>✅ Полный доступ к Telegram API</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="mtproto-auth-container">
              <button
                onClick={() => setShowMTProtoAuth(false)}
                className="back-to-options"
              >
                ← Назад к выбору метода
              </button>

              {error && (
                <div className="error-message">
                  <span>{error}</span>
                  <button onClick={() => setError("")}>✕</button>
                </div>
              )}

              <MTProtoAuth
                onAuthenticated={handleMTProtoAuth}
                onError={handleAuthError}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="telegram-client">
      <div className="telegram-interface">
        {authState.authMethod === "mtproto" && authState.sessionId ? (
          <>
            <ChatList
              sessionId={authState.sessionId}
              onChatSelect={handleChatSelect}
              selectedChatId={selectedChat?.id}
            />
            <MessageArea
              sessionId={authState.sessionId}
              chatId={selectedChat?.id || 0}
              chatName={selectedChat?.name || ""}
            />
          </>
        ) : (
          <div className="widget-auth-info">
            <div className="user-info">
              <h2>Добро пожаловать, {authState.user?.first_name}!</h2>
              {authState.user?.photo_url && (
                <img
                  src={authState.user.photo_url}
                  alt="User avatar"
                  className="user-avatar"
                />
              )}
              <p>
                Вы вошли через Telegram Widget. Для полного доступа к чатам и
                сообщениям необходимо войти через MTProto API.
              </p>
              <button
                onClick={() => setShowMTProtoAuth(true)}
                className="upgrade-auth-button"
              >
                Перейти к полной авторизации
              </button>
            </div>
          </div>
        )}

        <div className="user-menu">
          <button onClick={handleBackToHome} className="home-button">
            🏠 Главная
          </button>
          <button onClick={handleLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramClient;

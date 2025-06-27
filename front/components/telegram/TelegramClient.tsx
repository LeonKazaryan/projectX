import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TelegramLogin from "./tlogin/TelegramLogin";
import MTProtoAuth from "./auth/MTProtoAuth";
import ChatList from "./chats/ChatList";
import MessageArea from "./messages/MessageArea";
import Settings from "./ui/Settings";
import { ragService } from "./utils/ragService";
import { Button } from "../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import { Badge } from "../../src/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../src/components/ui/avatar";
import { Separator } from "../../src/components/ui/separator";
import {
  ArrowLeft,
  MessageCircle,
  Zap,
  Phone,
  Settings as SettingsIcon,
  LogOut,
  Bot,
  Smartphone,
  Shield,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

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
  userId?: number;
}

interface SelectedChat {
  id: number;
  name: string;
}

interface AISettings {
  enabled: boolean;
  memory_limit: number;
  suggestion_delay: number;
}

const TelegramClient: React.FC = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
  });
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [error, setError] = useState<string>("");
  const [showMTProtoAuth, setShowMTProtoAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(() => {
    return localStorage.getItem("telegram_include_archived") === "true";
  });
  const [includeReadonly, setIncludeReadonly] = useState(() => {
    return localStorage.getItem("telegram_include_readonly") === "true";
  });
  const [includeGroups, setIncludeGroups] = useState(() => {
    return localStorage.getItem("telegram_include_groups") === "true";
  });
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: true,
    memory_limit: 20,
    suggestion_delay: 1.0,
  });
  const [isToggleLoading, setIsToggleLoading] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);

  const API_BASE = "http://localhost:8000/api";

  const handleSync = () => {
    setSyncTrigger((prev) => prev + 1);
  };

  // Load saved session and settings on component mount
  useEffect(() => {
    const savedSession = localStorage.getItem("telegram_session");
    const savedSessionString = localStorage.getItem("telegram_session_string");

    if (savedSession && savedSessionString) {
      restoreSession(savedSessionString);
    }
  }, []);

  // Load AI settings when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.sessionId) {
      loadAISettings();
    }
  }, [authState.isAuthenticated, authState.sessionId]);

  const loadAISettings = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/ai/settings?session_id=${authState.sessionId}`
      );
      const data = await response.json();
      if (data.success && data.settings) {
        setAiSettings(data.settings);
        console.log("AI settings loaded:", data.settings);
      }
    } catch (error) {
      console.error("Failed to load AI settings:", error);
    }
  };

  const toggleAI = async () => {
    if (!authState.sessionId || isToggleLoading) return;

    setIsToggleLoading(true);
    try {
      const newSettings = {
        ...aiSettings,
        enabled: !aiSettings.enabled,
      };

      const response = await fetch(`${API_BASE}/ai/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: authState.sessionId,
          settings: newSettings,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAiSettings(newSettings);
      } else {
        setError(data.error || "Failed to toggle AI settings");
      }
    } catch (error) {
      setError("Failed to toggle AI settings");
      console.error("Toggle AI error:", error);
    } finally {
      setIsToggleLoading(false);
    }
  };

  const handleAISettingsChange = async () => {
    // Reload AI settings after they've been changed
    await loadAISettings();
  };

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
        try {
          const userResponse = await fetch(
            `http://localhost:8000/api/auth/user-info?session_id=${data.session_id}`
          );
          const userData = await userResponse.json();

          setAuthState({
            isAuthenticated: true,
            sessionId: data.session_id,
            sessionString: sessionString,
            authMethod: "mtproto",
            userId: userData.success ? userData.user_id : undefined,
          });
        } catch (userError) {
          console.error("Failed to fetch user info:", userError);
          setAuthState({
            isAuthenticated: true,
            sessionId: data.session_id,
            sessionString: sessionString,
            authMethod: "mtproto",
          });
        }
        setError("");
      } else {
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

  const handleMTProtoAuth = async (
    sessionId: string,
    sessionString: string
  ) => {
    console.log("MTProto auth successful");

    try {
      const response = await fetch(
        `http://localhost:8000/api/auth/user-info?session_id=${sessionId}`
      );
      const userData = await response.json();

      setAuthState({
        isAuthenticated: true,
        sessionId: sessionId,
        sessionString: sessionString,
        authMethod: "mtproto",
        userId: userData.success ? userData.user_id : undefined,
      });
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      setAuthState({
        isAuthenticated: true,
        sessionId: sessionId,
        sessionString: sessionString,
        authMethod: "mtproto",
      });
    }

    localStorage.setItem("telegram_session", sessionId);
    localStorage.setItem("telegram_session_string", sessionString);

    setError("");
    setShowMTProtoAuth(false);
  };

  const handleAuthError = (error: string) => {
    setError(error);
  };

  const handleChatSelect = async (chatId: number, chatName: string) => {
    setSelectedChat({ id: chatId, name: chatName });

    // Auto-sync chat with RAG when selected
    if (authState.sessionId) {
      try {
        await ragService.autoSyncOnChatSelection(authState.sessionId, chatId);
      } catch (error) {
        console.error("RAG auto-sync failed:", error);
      }
    }
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

    localStorage.removeItem("telegram_session");
    localStorage.removeItem("telegram_session_string");

    setAuthState({ isAuthenticated: false });
    setSelectedChat(null);
    setError("");
    setShowMTProtoAuth(false);
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  const handleToggleArchived = () => {
    const newValue = !includeArchived;
    setIncludeArchived(newValue);
    localStorage.setItem("telegram_include_archived", newValue.toString());
  };

  const handleToggleReadonly = () => {
    const newValue = !includeReadonly;
    setIncludeReadonly(newValue);
    localStorage.setItem("telegram_include_readonly", newValue.toString());
  };

  const handleToggleGroups = () => {
    const newIncludeGroups = !includeGroups;
    setIncludeGroups(newIncludeGroups);
    localStorage.setItem("telegram_include_groups", String(newIncludeGroups));
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="w-fit mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад на главную
          </Button>

          <div className="flex-1 flex items-center justify-center">
            {!showMTProtoAuth ? (
              <Card className="w-full max-w-2xl mx-auto shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-8">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                    Войти в Telegram
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                    Выберите способ входа в ваш аккаунт Telegram
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError("")}
                        className="text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-1">
                    <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <CardTitle className="text-xl">
                          Быстрый вход через Telegram Widget
                        </CardTitle>
                        <CardDescription>
                          Используйте готовый виджет Telegram для быстрой
                          авторизации
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                        <TelegramLogin
                          botName="your_bot_username"
                          buttonSize="large"
                          cornerRadius={8}
                          onAuth={handleTelegramWidgetAuth}
                          className="flex justify-center"
                        />
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Требует настройки бота и домена
                        </Badge>
                      </CardContent>
                    </Card>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                          или
                        </span>
                      </div>
                    </div>

                    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                      <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <CardTitle className="text-xl">
                          Полный доступ через MTProto
                        </CardTitle>
                        <CardDescription>
                          Получите доступ ко всем чатам и сообщениям через
                          MTProto API
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                        <Button
                          onClick={() => setShowMTProtoAuth(true)}
                          size="lg"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Войти через номер телефона
                        </Button>
                        <Badge
                          variant="default"
                          className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Полный доступ к Telegram API
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full max-w-md mx-auto shadow-2xl">
                <CardHeader>
                  <Button
                    variant="ghost"
                    onClick={() => setShowMTProtoAuth(false)}
                    className="w-fit mb-4"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад к выбору метода
                  </Button>
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <CardTitle className="text-center">
                    MTProto Авторизация
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError("")}
                        className="text-red-700 dark:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <MTProtoAuth
                    onAuthenticated={handleMTProtoAuth}
                    onError={handleAuthError}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white dark:bg-gray-900">
      <div className="flex h-full flex-col">
        {/* Header Toolbar for authenticated users */}
        {authState.authMethod === "mtproto" && authState.sessionId && (
          <div className="flex-shrink-0 border-b border-border bg-card">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleBackToHome} size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Главная
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2">
                  {authState.user && (
                    <Avatar className="h-8 w-8">
                      {authState.user.photo_url ? (
                        <AvatarImage
                          src={authState.user.photo_url}
                          alt={authState.user.first_name}
                        />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {authState.user.first_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-foreground">
                      {authState.user?.first_name || "Telegram User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      MTProto подключение
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  size="sm"
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Настройки
                </Button>

                <Button
                  onClick={toggleAI}
                  disabled={isToggleLoading}
                  variant={aiSettings.enabled ? "default" : "outline"}
                  size="sm"
                  className={
                    aiSettings.enabled ? "bg-green-600 hover:bg-green-700" : ""
                  }
                >
                  <Bot className="mr-2 h-4 w-4" />
                  AI {aiSettings.enabled ? "ON" : "OFF"}
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {authState.authMethod === "mtproto" && authState.sessionId ? (
            <>
              <ChatList
                sessionId={authState.sessionId}
                onChatSelect={handleChatSelect}
                selectedChatId={selectedChat?.id}
                includeArchived={includeArchived}
                includeReadonly={includeReadonly}
                includeGroups={includeGroups}
                syncTrigger={syncTrigger}
              />
              <MessageArea
                sessionId={authState.sessionId}
                chatId={selectedChat?.id || 0}
                chatName={selectedChat?.name || ""}
                userId={authState.userId}
                aiSettings={aiSettings}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <Card className="w-full max-w-md mx-auto shadow-lg">
                <CardHeader className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    {authState.user?.photo_url ? (
                      <AvatarImage
                        src={authState.user.photo_url}
                        alt={authState.user.first_name}
                      />
                    ) : (
                      <AvatarFallback className="text-lg font-semibold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                        {authState.user?.first_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <CardTitle className="text-2xl">
                    Добро пожаловать, {authState.user?.first_name}!
                  </CardTitle>
                  <CardDescription>
                    Вы вошли через Telegram Widget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Для полного доступа к чатам и сообщениям рекомендуется
                      использовать MTProto авторизацию
                    </p>
                    <Button
                      onClick={() => {
                        setAuthState({ isAuthenticated: false });
                        setShowMTProtoAuth(true);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Обновить до MTProto
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <Button
                      onClick={() => setShowSettings(true)}
                      variant="outline"
                      size="sm"
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Настройки
                    </Button>

                    <Button
                      onClick={toggleAI}
                      disabled={isToggleLoading}
                      variant={aiSettings.enabled ? "default" : "outline"}
                      size="sm"
                      className={
                        aiSettings.enabled
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      AI {aiSettings.enabled ? "ON" : "OFF"}
                    </Button>

                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Выйти
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          includeArchived={includeArchived}
          includeReadonly={includeReadonly}
          includeGroups={includeGroups}
          onToggleArchived={handleToggleArchived}
          onToggleReadonly={handleToggleReadonly}
          onToggleGroups={handleToggleGroups}
          sessionId={authState.sessionId}
          onAISettingsChange={handleAISettingsChange}
          onSync={handleSync}
        />
      )}
    </div>
  );
};

export default TelegramClient;

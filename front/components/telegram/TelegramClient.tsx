import React, { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../src/components/ui/resizable";
import ChatList from "./chats/ChatList";
import MessageArea from "./messages/MessageArea";
import MTProtoAuth from "./auth/MTProtoAuth";
import { Button } from "../../src/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Settings } from "./ui/Settings";
import { API_BASE_URL } from "../services/authService";
import { useMessagingStore } from "../messaging/MessagingStore";
import AIPanel from "../messaging/AIPanel";
import { getMessages } from "../utils/localMessageStore";

const useTelegramSession = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionString, setSessionString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (hasAttemptedRestore) return;
      setHasAttemptedRestore(true);

      try {
        const savedSessionString = localStorage.getItem(
          "telegram_session_string"
        );
        if (savedSessionString) {
          // Try to validate the session
          try {
            const token = localStorage.getItem("chathut_access_token");
            const response = await fetch(`${API_BASE_URL}/telegram/connect`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ session_string: savedSessionString }),
            });

            if (response.ok) {
              setSessionString(savedSessionString);
              setIsAuthenticated(true);
              setError(null);
            } else {
              // Session is invalid, remove it
              localStorage.removeItem("telegram_session_string");
              throw new Error("Invalid session");
            }
          } catch (sessionError) {
            console.log("Failed to restore session:", sessionError);
            localStorage.removeItem("telegram_session_string");
          }
        }
      } catch (error) {
        console.error("Error during session restoration:", error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [hasAttemptedRestore]);

  const handleAuthSuccess = async (newSessionString: string) => {
    setSessionString(newSessionString);
    setIsAuthenticated(true);
    setError(null);
    localStorage.setItem("telegram_session_string", newSessionString);

    try {
      const token = localStorage.getItem("chathut_access_token");
      await fetch(`${API_BASE_URL}/telegram/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_string: newSessionString }),
      });
    } catch (error) {
      console.error("Failed to sync telegram session with backend", error);
      // Handle error? Maybe show a message to the user.
    }
  };

  const handleAuthError = (err: string) => {
    setError(err);
  };

  return {
    isAuthenticated,
    sessionString,
    error,
    isRestoring,
    handleAuthSuccess,
    handleAuthError,
  };
};

const TelegramClient: React.FC = () => {
  const {
    isAuthenticated,
    sessionString,
    error,
    isRestoring,
    handleAuthSuccess,
    handleAuthError,
  } = useTelegramSession();
  const [selectedChat, setSelectedChat] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [forceLogout, setForceLogout] = useState(false);
  const navigate = useNavigate();
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  // Get chat messages from local storage for AI context
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);

  // Load messages when chat changes
  useEffect(() => {
    const loadMessages = async () => {
      if (selectedChat?.id) {
        try {
          const messages = await getMessages(selectedChat.id.toString());
          setCurrentMessages(messages);
          console.log(
            `[CONTEXT-TRACE-LOCAL] Loaded ${messages.length} messages from local storage for chat ${selectedChat.id}`
          );
        } catch (error) {
          console.error("Failed to load local messages:", error);
          setCurrentMessages([]);
        }
      } else {
        setCurrentMessages([]);
      }
    };
    loadMessages();
  }, [selectedChat?.id]);

  // Callback to refresh messages when MessageArea updates them
  const handleMessagesUpdated = async () => {
    if (selectedChat?.id) {
      try {
        const messages = await getMessages(selectedChat.id.toString());
        setCurrentMessages(messages);
        console.log(
          `[CONTEXT-TRACE-REFRESH] Refreshed ${messages.length} messages for AIPanel`
        );
      } catch (error) {
        console.error("Failed to refresh messages:", error);
      }
    }
  };

  // Restore provider state on component mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        await useMessagingStore.getState().restoreProviderStates();
      } catch (error) {
        console.error("Failed to restore provider states:", error);
      }
    };
    restoreState();
  }, []);

  // Функция сброса Telegram-сессии
  const handleSessionExpired = () => {
    localStorage.removeItem("telegram_session_string");
    setForceLogout(true);
  };

  if (isRestoring) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Restoring session...</p>
      </div>
    );
  }

  if (forceLogout || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            На главную
          </Button>
          <MTProtoAuth
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
          {error && (
            <p className="text-sm text-destructive mt-4 text-center">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <ChatList
            sessionId={sessionString || ""}
            onChatSelect={(chatId, chatName) =>
              setSelectedChat({ id: chatId, name: chatName })
            }
            selectedChatId={selectedChat?.id}
            onSessionExpired={handleSessionExpired}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={70}>
          {selectedChat ? (
            <MessageArea
              sessionId={sessionString || ""}
              chatId={selectedChat.id}
              chatName={selectedChat.name}
              setIsAIPanelOpen={setIsAIPanelOpen}
              onMessagesUpdated={handleMessagesUpdated}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/30">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    Выберите чат
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Выберите чат из списка, чтобы начать переписку
                  </p>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        chatId={selectedChat?.id?.toString() || ""}
        chatName={selectedChat?.name || ""}
        source="telegram"
        sessionId={sessionString || ""}
        currentMessages={currentMessages}
      />
    </>
  );
};

export default TelegramClient;

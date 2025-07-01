import React, { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ChatList from "./chats/ChatList";
import MessageArea from "./messages/MessageArea";
import MTProtoAuth from "./auth/MTProtoAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Settings } from "./ui/Settings";

const useTelegramSession = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);

  useEffect(() => {
    if (hasAttemptedRestore) return; // Prevent multiple restore attempts

    const restoreSession = async () => {
      setHasAttemptedRestore(true);

      // First try to restore from localStorage
      const sessionString = localStorage.getItem("telegram_session_string");
      if (sessionString) {
        try {
          const response = await fetch(
            "http://localhost:8000/api/auth/restore-session",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_string: sessionString }),
            }
          );
          const data = await response.json();
          if (data.success) {
            setSessionId(data.session_id);
            setIsAuthenticated(true);
            setIsRestoring(false);
            return;
          }
        } catch (e) {
          console.error("Failed to restore session from localStorage", e);
        }
      }

      // If no localStorage session, try to restore from database
      try {
        const token = localStorage.getItem("chathut_access_token");
        if (token) {
          const response = await fetch(
            "http://localhost:8000/api/telegram/restore-session",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            // Restore the session using the existing endpoint
            const restoreResponse = await fetch(
              "http://localhost:8000/api/auth/restore-session",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_string: data.session_string }),
              }
            );
            const restoreData = await restoreResponse.json();
            if (restoreData.success) {
              setSessionId(restoreData.session_id);
              setIsAuthenticated(true);
              // Update localStorage with the restored session
              localStorage.setItem(
                "telegram_session_id",
                restoreData.session_id
              );
              localStorage.setItem(
                "telegram_session_string",
                data.session_string
              );
              setIsRestoring(false);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore session from database", e);
      }

      // Clear any invalid session data and finish
      localStorage.removeItem("telegram_session_id");
      localStorage.removeItem("telegram_session_string");
      setIsRestoring(false);
    };

    restoreSession();
  }, [hasAttemptedRestore]);

  const handleLoginSuccess = async (sid: string, sessionString: string) => {
    setSessionId(sid);
    setIsAuthenticated(true);
    setError(null);
    localStorage.setItem("telegram_session_id", sid);
    localStorage.setItem("telegram_session_string", sessionString);

    try {
      const token = localStorage.getItem("chathut_access_token");
      await fetch("http://localhost:8000/api/telegram/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_string: sessionString }),
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
    sessionId,
    error,
    isRestoring,
    handleLoginSuccess,
    handleAuthError,
  };
};

const TelegramClient: React.FC = () => {
  const {
    isAuthenticated,
    sessionId,
    error,
    isRestoring,
    handleLoginSuccess,
    handleAuthError,
  } = useTelegramSession();
  const [selectedChat, setSelectedChat] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();

  if (isRestoring) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Restoring session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
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
            onAuthenticated={handleLoginSuccess}
            onError={handleAuthError}
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
      <div className="w-full flex flex-col bg-background text-foreground h-full">
        <ResizablePanelGroup direction="horizontal" className="flex-grow">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            {sessionId && (
              <ChatList
                sessionId={sessionId}
                onChatSelect={(id, name) => setSelectedChat({ id, name })}
                selectedChatId={selectedChat?.id}
              />
            )}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={75}>
            {selectedChat && sessionId ? (
              <MessageArea
                sessionId={sessionId}
                chatId={selectedChat.id}
                chatName={selectedChat.name}
                userId={undefined}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-semibold">Выберите чат</p>
                  <p className="text-sm">
                    Чтобы начать общение, выберите чат из списка слева.
                  </p>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

export default TelegramClient;

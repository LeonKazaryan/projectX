import React, { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../src/components/ui/resizable";
import WhatsAppChatList from "./chats/WhatsAppChatList";
import WhatsAppMessageArea from "./messages/WhatsAppMessageArea";
import WhatsAppAuth from "./auth/WhatsAppAuth";
import { Button } from "../../src/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMessagingStore } from "../messaging/MessagingStore";
import type { Chat } from "../messaging/types";
import { WhatsAppProvider } from "../messaging/WhatsAppProvider";
import AIPanel from "../messaging/AIPanel";

const WhatsAppClient: React.FC = () => {
  const navigate = useNavigate();
  const {
    // connectProvider, // Unused
    error,
    // isLoading, // Unused
    selectedChat,
    selectChat,
    providers,
    loadChats,
    getChatMessages,
  } = useMessagingStore();

  const whatsappConnected = useMessagingStore((state) =>
    state.getProviderStatus("whatsapp")
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [_isConnecting, setIsConnecting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  // const [qrCode, setQrCode] = useState<string | null>(null); // Unused
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Get WhatsAppProvider instance
  const whatsappProvider = providers?.whatsapp;

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

  // Update readiness when provider already connected
  useEffect(() => {
    if (whatsappConnected && whatsappProvider) {
      const wa = whatsappProvider as WhatsAppProvider;
      if (wa.isReady()) {
        setIsReady(true);
        setIsAuthenticated(true);
      }
    }
  }, [whatsappConnected, whatsappProvider]);

  // Providers are initialized at app startup; no need to re-initialize here

  useEffect(() => {
    setIsAuthenticated(whatsappConnected);
  }, [whatsappConnected]);

  // Poll for readiness if QR is shown
  useEffect(() => {
    if (showQr && sessionId && !isReady) {
      const poll = setInterval(async () => {
        try {
          const res = await fetch(
            `${
              process.env.REACT_APP_WHATSAPP_API_URL || "http://localhost:3000"
            }/whatsapp/status?sessionId=${sessionId}`
          );
          const data = await res.json();
          if (data.success && data.isReady) {
            setIsReady(true);
            setShowQr(false);
            if (whatsappProvider) {
              const wa = whatsappProvider as WhatsAppProvider;
              wa.setReady(true);
            }
            setIsAuthenticated(true);
            // Auto-load chats after successful QR scan
            loadChats("whatsapp");
          }
        } catch {}
      }, 1500);
      return () => clearInterval(poll);
    }
  }, [showQr, sessionId, isReady]); // Remove loadChats from dependencies!

  const handleAuthSuccess = async (sessionData: string) => {
    console.log("🎯 handleAuthSuccess called with sessionData:", sessionData);
    setIsConnecting(true);
    try {
      // Use the sessionId from WhatsAppAuth
      setSessionId(sessionData);
      setShowQr(false);
      setIsReady(true);
      setIsAuthenticated(true);

      console.log("📱 Setting up WhatsApp provider with session:", sessionData);

      // Set the existing session in the provider instead of connecting from scratch
      if (whatsappProvider) {
        const wa = whatsappProvider as WhatsAppProvider;
        wa.setExistingSession(sessionData);

        console.log("💬 Loading WhatsApp chats...");
        // Load chats immediately after setting the session
        loadChats("whatsapp");
      } else {
        console.error("❌ WhatsApp provider not found!");
      }
    } catch (error) {
      console.error("❌ Failed to setup WhatsApp session:", error);
      setAuthError("Ошибка подключения к WhatsApp");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAuthError = (err: string) => {
    setAuthError(err);
    console.error("WhatsApp auth error:", err);
  };

  const handleChatSelect = (chat: Chat) => {
    selectChat(chat);
  };

  if (!isAuthenticated || !isReady) {
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
          <WhatsAppAuth
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
          {(error || authError) && (
            <p className="text-sm text-destructive mt-4 text-center">
              {authError || error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <WhatsAppChatList
            onChatSelect={handleChatSelect}
            selectedChatId={selectedChat?.id}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={70}>
          {selectedChat ? (
            <WhatsAppMessageArea
              chatId={selectedChat.id}
              chatName={selectedChat.title}
              setIsAIPanelOpen={setIsAIPanelOpen}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/30">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
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

      <AIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        chatId={selectedChat?.id || ""}
        chatName={selectedChat?.title || ""}
        source="whatsapp"
        sessionId={sessionId || ""}
        currentMessages={
          selectedChat?.id ? getChatMessages(selectedChat.id) : []
        }
      />
    </>
  );
};

export default WhatsAppClient;

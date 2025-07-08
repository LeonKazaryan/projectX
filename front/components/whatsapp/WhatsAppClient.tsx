import React, { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../src/components/ui/resizable";
import { Button } from "../../src/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WhatsAppAuth from "./auth/WhatsAppAuth";
import WhatsAppChatList from "./chats/WhatsAppChatList";
import WhatsAppMessageArea from "./messages/WhatsAppMessageArea";
import { useMessagingStore } from "../messaging/MessagingStore";
import type { Chat } from "../messaging/types";
import { WhatsAppProvider } from "../messaging/WhatsAppProvider";

const WhatsAppClient: React.FC = () => {
  const navigate = useNavigate();
  const {
    connectProvider,
    disconnectProvider,
    error,
    isLoading,
    selectedChat,
    selectChat,
    providers,
    loadChats,
  } = useMessagingStore();

  const whatsappConnected = useMessagingStore((state) =>
    state.getProviderStatus("whatsapp")
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Get WhatsAppProvider instance
  const whatsappProvider = providers?.whatsapp;

  // Update readiness when provider already connected
  useEffect(() => {
    if (whatsappConnected && whatsappProvider) {
      const wa = whatsappProvider as WhatsAppProvider;
      if (wa.isReady()) {
        setIsReady(true);
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
            `http://localhost:3000/whatsapp/status?sessionId=${sessionId}`
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

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await connectProvider("whatsapp");
      if (success && whatsappProvider) {
        const wa = whatsappProvider as WhatsAppProvider;
        setSessionId(wa.getSessionId());
        const qr = wa.getQrCode();
        setQrCode(qr);
        if (qr) {
          setShowQr(true);
          setIsReady(false);
        } else {
          // Session already ready
          setShowQr(false);
          setIsReady(true);
          setIsAuthenticated(true);
          // Load chats immediately
          loadChats("whatsapp");
        }
      }
    } catch (error) {
      console.error("Failed to connect WhatsApp:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectProvider("whatsapp");
    setIsAuthenticated(false);
    selectChat(null);
    setShowQr(false);
    setQrCode(null);
    setSessionId(null);
    setIsReady(false);
  };

  const handleChatSelect = (chat: Chat) => {
    selectChat(chat);
  };

  if (isLoading || isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isConnecting ? "Connecting to WhatsApp..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (showQr && qrCode) {
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
          <div className="flex flex-col items-center">
            <p className="mb-2 text-lg font-orbitron">
              Сканируй QR-код WhatsApp
            </p>
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              className="mb-4 border-4 border-green-500 rounded-lg shadow-lg"
            />
            <p className="text-sm text-muted-foreground mb-2">
              Открой WhatsApp на телефоне → Устройства → Подключить устройство
            </p>
            <p className="text-xs text-yellow-400 font-rajdhani">
              После сканирования QR-кода чат загрузится автоматически
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            onConnect={handleConnect}
            onError={(err) => console.error("WhatsApp auth error:", err)}
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
            <WhatsAppChatList
              onChatSelect={handleChatSelect}
              selectedChatId={selectedChat?.id}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={75}>
            {selectedChat ? (
              <WhatsAppMessageArea
                chatId={selectedChat.id}
                chatName={selectedChat.title}
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
    </>
  );
};

export default WhatsAppClient;

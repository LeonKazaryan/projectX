import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  QrCode,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Smartphone,
} from "lucide-react";
import { sessionService } from "../../services/sessionService";
import authService from "../../services/authService";
import { io, Socket } from "socket.io-client";

interface WhatsAppAuthProps {
  onAuthSuccess: (sessionData: string) => void;
  onAuthError: (error: string) => void;
}

const WhatsAppAuth: React.FC<WhatsAppAuthProps> = ({
  onAuthSuccess,
  onAuthError,
}) => {
  const [step, setStep] = useState<"checking" | "qr" | "connected">("checking");
  const [qrCode, setQrCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Проверяем наличие сохраненной сессии при загрузке
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!mounted) return;

      try {
        setStep("checking");
        const sessionString = await sessionService.getSessionString("whatsapp");

        if (sessionString && mounted) {
          // Пытаемся использовать сохраненную сессию
          try {
            console.log("🔄 Found saved session, trying to use it");
            onAuthSuccess(sessionString);
            return;
          } catch (sessionError) {
            console.log(
              "❌ Saved WhatsApp session is invalid, proceeding with QR login"
            );
            await sessionService.deleteSession("whatsapp");
          }
        }

        if (mounted) {
          startQRLogin();
        }
      } catch (error) {
        console.error("Error checking saved WhatsApp session:", error);
        if (mounted) {
          startQRLogin();
        }
      }
    };

    initAuth();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const startQRLogin = async () => {
    // Prevent multiple calls
    if (isLoading || sessionId) {
      console.log(
        "⚠️ startQRLogin already in progress or session exists, skipping"
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      setStep("qr");

      // Generate session ID for current user
      const currentUser = authService.getUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Check if we already have a sessionId for this user
      let newSessionId = sessionId;
      if (!newSessionId) {
        newSessionId = `whatsapp_${currentUser.id}_${Math.random()
          .toString(36)
          .slice(2)}`;
        console.log("🆕 Creating new sessionId:", newSessionId);
      } else {
        console.log("♻️ Reusing existing sessionId:", newSessionId);
      }

      // Request QR code from WhatsApp service
      const response = await fetch("http://localhost:3000/whatsapp/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: newSessionId }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(newSessionId);

        if (data.qrCode) {
          setQrCode(data.qrCode);
          // Setup Socket.IO to listen for auth events
          setupSocketConnection(newSessionId);
        } else {
          // Already authenticated
          setStep("connected");
          setTimeout(() => {
            onAuthSuccess(newSessionId);
          }, 1000);
        }
      } else {
        setError("Ошибка получения QR кода. Попробуйте еще раз.");
      }
    } catch (error) {
      console.error("QR login error:", error);
      setError("Ошибка получения QR кода. Попробуйте еще раз.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectionSuccess = async () => {
    try {
      // В реальности здесь будет настоящая сессия от WhatsApp
      // Пока просто показываем успешное подключение
      setStep("connected");

      // Небольшая задержка для показа успешного подключения
      setTimeout(() => {
        // В реальности здесь будет настоящая сессия
        const sessionString = "whatsapp_connected";
        onAuthSuccess(sessionString);
      }, 1000);
    } catch (error) {
      setError("Ошибка подключения к WhatsApp. Попробуйте еще раз.");
    }
  };

  const setupSocketConnection = (sessionId: string) => {
    console.log("🔌 Setting up Socket connection for sessionId:", sessionId);

    // Always use fresh socket to avoid confusion
    if (socket) {
      console.log("🔄 Disconnecting existing socket");
      socket.disconnect();
    }

    const newSocket = io("http://localhost:3000", {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("🔗 Socket connected to WhatsApp service");
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected from WhatsApp service");
    });

    console.log("📡 Joining session:", sessionId);
    newSocket.emit("join-session", sessionId);

    newSocket.on("ready", (data) => {
      console.log("🎉 WhatsApp authenticated successfully!", data);
      setStep("connected");
      setTimeout(() => {
        console.log("🚀 Calling onAuthSuccess with sessionId:", sessionId);
        onAuthSuccess(sessionId);
      }, 1000);
    });

    newSocket.on("qr", (data) => {
      console.log("📱 New QR code received for session:", sessionId);
      setQrCode(data.qr);
    });

    newSocket.on("auth_failure", (data) => {
      console.error("WhatsApp auth failure:", data.message);
      setError("Ошибка аутентификации WhatsApp. Попробуйте еще раз.");
    });

    newSocket.on("disconnected", (data) => {
      console.log("WhatsApp disconnected:", data.reason);
      setError("Соединение с WhatsApp потеряно. Попробуйте еще раз.");
    });

    setSocket(newSocket);
  };

  const handleRetry = () => {
    setError("");
    startQRLogin();
  };

  if (step === "checking") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-green-500" />
        </motion.div>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Проверяем сохраненную сессию WhatsApp...
        </p>
      </div>
    );
  }

  if (step === "connected") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          WhatsApp подключен!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 dark:text-gray-400 text-center"
        >
          Сессия сохранена для автоматического входа
        </motion.p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
          <MessageSquare className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Подключение к WhatsApp
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Отсканируйте QR код в приложении WhatsApp
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 dark:text-red-400 text-sm">
            {error}
          </span>
        </motion.div>
      )}

      <div className="flex flex-col items-center space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-12 w-12 text-green-500" />
            </motion.div>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Получение QR кода...
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="w-48 h-48 bg-white border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                {qrCode && qrCode !== "loading" ? (
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="h-24 w-24 text-gray-400" />
                )}
              </div>

              {/* Анимированные точки вокруг QR кода */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-green-400 border-dashed rounded-lg"
              />
            </div>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Smartphone className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Откройте WhatsApp на телефоне
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Настройки → Устройства → Подключить устройство
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
              className="px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
            >
              Обновить QR код
            </motion.button>

            {/* Кнопка для тестирования подключения */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConnectionSuccess}
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors border border-blue-300 dark:border-blue-600 rounded"
            >
              Тест подключения
            </motion.button>
          </>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Сессия будет сохранена для автоматического входа в следующий раз
        </p>
      </div>
    </div>
  );
};

export default WhatsAppAuth;

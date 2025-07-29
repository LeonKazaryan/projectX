import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { sessionService } from "../../services/sessionService";
import { API_BASE_URL } from "../../services/authService";

interface MTProtoAuthProps {
  onAuthSuccess: (sessionString: string) => void;
  onAuthError: (error: string) => void;
}

const MTProtoAuth: React.FC<MTProtoAuthProps> = ({
  onAuthSuccess,
  // onAuthError, // Unused parameter
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<
    "phone" | "code" | "password" | "loading" | "checking"
  >("checking");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Telegram API state
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [sessionId, setSessionId] = useState("");

  // Проверяем наличие сохраненной сессии при загрузке
  useEffect(() => {
    checkSavedSession();
  }, []);

  const checkSavedSession = async () => {
    try {
      setStep("checking");
      const sessionString = await sessionService.getSessionString("telegram");

      if (sessionString) {
        // Пытаемся использовать сохраненную сессию
        try {
          // Здесь должна быть логика проверки валидности сессии
          // Пока просто передаем сессию дальше
          onAuthSuccess(sessionString);
          return;
        } catch (sessionError) {
          console.log("Saved session is invalid, proceeding with login");
          // Если сессия невалидна, удаляем её и продолжаем с логином
          await sessionService.deleteSession("telegram");
        }
      }

      setStep("phone");
    } catch (error) {
      console.error("Error checking saved session:", error);
      setStep("phone");
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Введите номер телефона");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("📱 Sending Telegram code to:", phoneNumber);

      const response = await fetch(`${API_BASE_URL}/auth/send-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
        }),
      });

      const data = await response.json();
      console.log("📱 Telegram send-code response:", data);

      if (data.success) {
        setPhoneCodeHash(data.phone_code_hash);
        setSessionId(data.session_id);
        setStep("code");
        console.log("✅ Code sent successfully!");
      } else {
        throw new Error(data.detail || "Ошибка отправки кода");
      }
    } catch (error: any) {
      console.error("❌ Telegram send-code error:", error);
      setError(
        error.message || "Ошибка отправки кода. Проверьте номер телефона."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError("Введите код подтверждения");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("🔐 Verifying Telegram code:", verificationCode);

      const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          code: verificationCode.trim(),
          phone_code_hash: phoneCodeHash,
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      console.log("🔐 Telegram verify-code response:", data);

      if (data.success) {
        const sessionString = data.session_string;
        console.log("✅ Telegram authentication successful!");

        // Сохраняем сессию на сервере
        await sessionService.saveSession({
          platform: "telegram",
          session_string: sessionString,
        });

        onAuthSuccess(sessionString);
      } else if (data.need_password) {
        console.log("🔐 2FA password required, switching to password step");
        setStep("password");
      } else {
        throw new Error(data.detail || "Неверный код подтверждения");
      }
    } catch (error: any) {
      console.error("❌ Telegram verify-code error:", error);
      setError(
        error.message || "Неверный код подтверждения. Попробуйте еще раз."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Введите пароль двухфакторной аутентификации");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("🔐 Verifying 2FA password...");

      const response = await fetch(`${API_BASE_URL}/auth/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: password.trim(),
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      console.log("🔐 Telegram verify-password response:", data);

      if (data.success) {
        const sessionString = data.session_string;
        console.log("✅ Telegram 2FA authentication successful!");

        // Сохраняем сессию на сервере
        await sessionService.saveSession({
          platform: "telegram",
          session_string: sessionString,
        });

        onAuthSuccess(sessionString);
      } else {
        throw new Error(
          data.detail || "Неверный пароль двухфакторной аутентификации"
        );
      }
    } catch (error: any) {
      console.error("❌ Telegram verify-password error:", error);
      setError(error.message || "Неверный пароль. Попробуйте еще раз.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setVerificationCode("");
    setPassword("");
    setError("");
    setPhoneCodeHash("");
    setSessionId("");
  };

  const handleBackToCode = () => {
    setStep("code");
    setPassword("");
    setError("");
  };

  if (step === "checking") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-blue-500" />
        </motion.div>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Проверяем сохраненную сессию...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto">
          <MessageSquare className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Подключение к Telegram
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {step === "phone"
            ? "Введите номер телефона для получения кода подтверждения"
            : step === "code"
            ? "Введите код, отправленный в Telegram"
            : "Введите пароль двухфакторной аутентификации"}
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

      {step === "phone" ? (
        <motion.form
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handlePhoneSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Номер телефона
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                disabled={isLoading}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Отправка кода...</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" />
                <span>Отправить код</span>
              </>
            )}
          </motion.button>
        </motion.form>
      ) : step === "code" ? (
        <motion.form
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleCodeSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Код подтверждения
            </label>
            <input
              id="code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="12345"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-center text-lg tracking-widest"
              disabled={isLoading}
              maxLength={5}
            />
          </div>

          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleBackToPhone}
              disabled={isLoading}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !verificationCode.trim()}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Проверка...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Подтвердить</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.form>
      ) : (
        <motion.form
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handlePasswordSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Пароль двухфакторной аутентификации
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите ваш Cloud Password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isLoading}
            />
          </div>

          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleBackToCode}
              disabled={isLoading}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              К коду
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Проверка...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Войти</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.form>
      )}

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Сессия будет сохранена для автоматического входа в следующий раз
        </p>
      </div>
    </div>
  );
};

export default MTProtoAuth;

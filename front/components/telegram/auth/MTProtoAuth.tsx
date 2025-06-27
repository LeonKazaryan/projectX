import React, { useState } from "react";
import { Button } from "../../../src/components/ui/button";
import { Input } from "../../../src/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../src/components/ui/card";
import { Loader2, Phone, Lock, ArrowLeft } from "lucide-react";

interface MTProtoAuthProps {
  onAuthenticated: (sessionId: string, sessionString: string) => void;
  onError: (error: string) => void;
}

interface AuthStep {
  step: "phone" | "code" | "password";
  data?: any;
}

const MTProtoAuth: React.FC<MTProtoAuthProps> = ({
  onAuthenticated,
  onError,
}) => {
  const [authStep, setAuthStep] = useState<AuthStep>({ step: "phone" });
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const API_BASE = "http://localhost:8000/api";

  const sendCode = async () => {
    if (!phone.trim()) {
      onError("Введите номер телефона");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/send-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setAuthStep({
          step: "code",
          data: {
            phone_code_hash: data.phone_code_hash,
            session_id: data.session_id,
          },
        });
      } else {
        onError(data.error || "Ошибка отправки кода");
      }
    } catch (error) {
      onError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      onError("Введите код подтверждения");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
          phone_code_hash: authStep.data.phone_code_hash,
          session_id: authStep.data.session_id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onAuthenticated(data.session_id, data.session_string);
      } else if (data.need_password) {
        setAuthStep({
          step: "password",
          data: {
            session_id: authStep.data.session_id,
          },
        });
      } else {
        onError(data.error || "Неверный код");
      }
    } catch (error) {
      onError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!password.trim()) {
      onError("Введите пароль двухфакторной аутентификации");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: password.trim(),
          session_id: authStep.data.session_id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onAuthenticated(data.session_id, data.session_string);
      } else {
        onError(data.error || "Неверный пароль");
      }
    } catch (error) {
      onError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && !loading) {
      action();
    }
  };

  return (
    <div className="space-y-6">
      {authStep.step === "phone" && (
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle>Вход в Telegram</CardTitle>
            <CardDescription>
              Введите номер телефона для получения кода подтверждения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="tel"
              placeholder="+7 900 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, sendCode)}
              disabled={loading}
            />
            <Button
              onClick={sendCode}
              disabled={loading || !phone.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                "Получить код"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {authStep.step === "code" && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Введите код</CardTitle>
            <CardDescription>
              Мы отправили код подтверждения на номер {phone}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="12345"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, verifyCode)}
              disabled={loading}
              maxLength={5}
            />
            <div className="space-y-2">
              <Button
                onClick={verifyCode}
                disabled={loading || !code.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  "Подтвердить"
                )}
              </Button>
              <Button
                onClick={() => setAuthStep({ step: "phone" })}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {authStep.step === "password" && (
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <CardTitle>Двухфакторная аутентификация</CardTitle>
            <CardDescription>
              Введите пароль двухфакторной аутентификации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, verify2FA)}
              disabled={loading}
            />
            <div className="space-y-2">
              <Button
                onClick={verify2FA}
                disabled={loading || !password.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  "Войти"
                )}
              </Button>
              <Button
                onClick={() => setAuthStep({ step: "code" })}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MTProtoAuth;

import React, { useState } from "react";
import "./MTProtoAuth.css";

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
    <div className="mtproto-auth">
      {authStep.step === "phone" && (
        <div className="auth-step">
          <h3>Вход в Telegram</h3>
          <p>Введите номер телефона для получения кода подтверждения</p>
          <div className="input-group">
            <input
              type="tel"
              placeholder="+7 900 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, sendCode)}
              disabled={loading}
              className="phone-input"
            />
          </div>
          <button
            onClick={sendCode}
            disabled={loading || !phone.trim()}
            className="auth-button"
          >
            {loading ? "Отправка..." : "Получить код"}
          </button>
        </div>
      )}

      {authStep.step === "code" && (
        <div className="auth-step">
          <h3>Введите код</h3>
          <p>Мы отправили код подтверждения на номер {phone}</p>
          <div className="input-group">
            <input
              type="text"
              placeholder="12345"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, verifyCode)}
              disabled={loading}
              className="code-input"
              maxLength={5}
            />
          </div>
          <button
            onClick={verifyCode}
            disabled={loading || !code.trim()}
            className="auth-button"
          >
            {loading ? "Проверка..." : "Подтвердить"}
          </button>
          <button
            onClick={() => setAuthStep({ step: "phone" })}
            className="back-button"
            disabled={loading}
          >
            Назад
          </button>
        </div>
      )}

      {authStep.step === "password" && (
        <div className="auth-step">
          <h3>Двухфакторная аутентификация</h3>
          <p>Введите пароль для завершения входа</p>
          <div className="input-group">
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, verify2FA)}
              disabled={loading}
              className="password-input"
            />
          </div>
          <button
            onClick={verify2FA}
            disabled={loading || !password.trim()}
            className="auth-button"
          >
            {loading ? "Проверка..." : "Войти"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MTProtoAuth;

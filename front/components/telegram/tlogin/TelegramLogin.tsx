import React, { useEffect, useRef } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginProps {
  botName: string;
  buttonSize?: "large" | "medium" | "small";
  cornerRadius?: number;
  requestAccess?: boolean;
  usePic?: boolean;
  onAuth: (user: TelegramUser) => void;
  className?: string;
}

const TelegramLogin: React.FC<TelegramLoginProps> = ({
  botName,
  buttonSize = "large",
  cornerRadius,
  requestAccess = false,
  usePic = true,
  onAuth,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = "";

      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", botName);
      script.setAttribute("data-size", buttonSize);

      if (cornerRadius !== undefined) {
        script.setAttribute("data-radius", cornerRadius.toString());
      }

      if (requestAccess) {
        script.setAttribute("data-request-access", "write");
      }

      if (!usePic) {
        script.setAttribute("data-userpic", "false");
      }

      const callbackName = `telegramLoginCallback_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      (window as any)[callbackName] = (user: TelegramUser) => {
        onAuth(user);
      };
      script.setAttribute("data-onauth", callbackName);

      ref.current.appendChild(script);
    }
  }, [botName, buttonSize, cornerRadius, requestAccess, usePic, onAuth]);

  return <div ref={ref} className={className} />;
};

export default TelegramLogin;

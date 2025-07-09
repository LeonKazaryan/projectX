import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ru" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

interface Translations {
  [key: string]: {
    ru: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  "nav.security": { ru: "Безопасность", en: "Security" },
  "nav.startChatting": { ru: "Начать общение", en: "Start Chatting" },
  "nav.openHut": { ru: "Открыть Хижину", en: "Open Hut" },
  "nav.online": { ru: "В сети", en: "Online" },
  "nav.home": { ru: "Домой", en: "Home" },
  "nav.profile": { ru: "Профиль", en: "Profile" },
  "nav.settings": { ru: "Настройки", en: "Settings" },
  "nav.switchToTelegram": {
    ru: "Переключиться на Telegram",
    en: "Switch to Telegram",
  },
  "nav.switchToWhatsApp": {
    ru: "Переключиться на WhatsApp",
    en: "Switch to WhatsApp",
  },
  "nav.logout": { ru: "Выйти", en: "Logout" },

  // Home Page
  "home.title": { ru: "chathut", en: "chathut" },
  "home.tagline": {
    ru: "Ваш уютный дом сообщений",
    en: "Your cozy messaging home",
  },
  "home.sequence.conversations": {
    ru: "Все ваши разговоры в одном месте",
    en: "All your conversations in one place",
  },
  "home.sequence.smartAI": {
    ru: "Умные сообщения с ИИ",
    en: "Smart AI-powered messaging",
  },
  "home.sequence.platforms": {
    ru: "Подключите все любимые платформы",
    en: "Connect every platform you love",
  },
  "home.description": {
    ru: "Добро пожаловать в вашу личную чат-хижину! Подключайте все платформы сообщений, получайте умные предложения ИИ и управляйте разговорами как никогда раньше. Это ваш уютный уголок цифрового мира.",
    en: "Welcome to your personal chat hut! Connect all your messaging platforms, get smart AI suggestions, and manage conversations like never before. It's your cozy corner of the digital world.",
  },
  "home.buildHut": { ru: "Построить Хижину", en: "Build Your Hut" },
  "home.enterHut": { ru: "Войти в Хижину", en: "Enter Your Hut" },
  "home.joinCommunity": {
    ru: "Присоединиться к Сообществу",
    en: "Join Community",
  },
  "home.profile": { ru: "Профиль", en: "Profile" },
  "home.learnMore": { ru: "Узнать больше", en: "Learn More" },

  // Features
  "features.whyChoose": { ru: "Почему выбирают", en: "Why Choose" },
  "features.description": {
    ru: "Мы не просто ещё одно приложение для сообщений. Мы - ваш штаб цифрового общения, созданный для более умного, быстрого и приятного общения.",
    en: "We're not just another messaging app. We're your digital communication headquarters, designed to make chatting smarter, faster, and more enjoyable.",
  },
  "features.smartAI.title": { ru: "Умные ответы ИИ", en: "Smart AI Responses" },
  "features.smartAI.desc": {
    ru: "ИИ анализирует ваши разговоры и предлагает умные ответы",
    en: "AI analyzes your conversations and suggests smart replies",
  },
  "features.multiPlatform.title": {
    ru: "Поддержка многих платформ",
    en: "Multi-Platform Support",
  },
  "features.multiPlatform.desc": {
    ru: "Подключите Telegram, WhatsApp и другие в одном месте",
    en: "Connect Telegram, WhatsApp and more in one place",
  },
  "features.privacy.title": {
    ru: "Конфиденциальность прежде всего",
    en: "Privacy First",
  },
  "features.privacy.desc": {
    ru: "Ваши сообщения остаются в безопасности с end-to-end шифрованием",
    en: "Your messages stay secure with end-to-end encryption",
  },
  "features.lightning.title": {
    ru: "Молниеносная скорость",
    en: "Lightning Fast",
  },
  "features.lightning.desc": {
    ru: "Синхронизация в реальном времени на всех ваших устройствах",
    en: "Real-time synchronization across all your devices",
  },

  // Stats
  "stats.chatHut.label": { ru: "Ваша Чат-Хижина", en: "Your Chat Hut" },
  "stats.chatHut.text": {
    ru: "Все сообщения в одном уютном месте",
    en: "All messages in one cozy place",
  },
  "stats.aiAssistant.label": { ru: "ИИ Помощник", en: "AI Assistant" },
  "stats.aiAssistant.text": {
    ru: "Умные ответы и предложения",
    en: "Smart replies & suggestions",
  },
  "stats.multiPlatform.label": { ru: "Мульти-платформа", en: "Multi-Platform" },
  "stats.multiPlatform.text": {
    ru: "Telegram, WhatsApp и другие",
    en: "Telegram, WhatsApp & more",
  },
  "stats.secure.label": { ru: "Безопасность", en: "Secure" },
  "stats.secure.text": {
    ru: "End-to-end шифрование",
    en: "End-to-end encryption",
  },

  // CTA Section
  "cta.readyToBuild": {
    ru: "Готовы построить вашу",
    en: "Ready to Build Your",
  },
  "cta.chatHut": { ru: "Чат-Хижину", en: "Chat Hut" },
  "cta.description": {
    ru: "Присоединяйтесь к тысячам пользователей, которые сделали chathut своим домом сообщений. Просто, безопасно и умно спроектировано для вашего стиля общения.",
    en: "Join thousands of users who've made chathut their messaging home. Simple, secure, and smartly designed for the way you actually chat.",
  },
  "cta.startBuilding": { ru: "Начать строить", en: "Start Building" },

  // Security Page
  "security.title": {
    ru: "Безопасность и Прозрачность",
    en: "Security & Transparency",
  },
  "security.subtitle": { ru: "Как работает chathut", en: "How chathut Works" },
  "security.description": {
    ru: "Ваша конфиденциальность - наш приоритет. Узнайте, как мы защищаем ваши данные и обеспечиваем безопасность общения.",
    en: "Your privacy is our priority. Learn how we protect your data and ensure secure communication.",
  },

  // Platform labels
  "platform.telegram": { ru: "Telegram", en: "Telegram" },
  "platform.whatsapp": { ru: "WhatsApp", en: "WhatsApp" },
  "platform.ai": { ru: "ИИ", en: "AI" },

  // Profile Page
  "profile.loading": { ru: "Загрузка профиля...", en: "Loading profile..." },
  "profile.error.title": { ru: "Ошибка системы", en: "System Error" },
  "profile.error.returnHome": { ru: "Вернуться домой", en: "Return Home" },
  "profile.yourProfile": { ru: "Ваш профиль", en: "Your Profile" },
  "profile.connectedPlatforms": {
    ru: "Подключенные платформы",
    en: "Connected Platforms",
  },
  "profile.identity": { ru: "Имя пользователя", en: "Username" },
  "profile.email": { ru: "Электронная почта", en: "Email" },
  "profile.activeLinks": { ru: "Активные соединения", en: "Active Links" },
  "profile.security": { ru: "Безопасность", en: "Security" },
  "profile.encrypted": { ru: "Зашифровано", en: "Encrypted" },
  "profile.status.online": { ru: "В сети", en: "Online" },
  "profile.status.connected": { ru: "Подключено", en: "Connected" },
  "profile.status.offline": { ru: "Не в сети", en: "Offline" },
  "profile.action.connect": { ru: "Подключить", en: "Connect" },
  "profile.action.disconnect": { ru: "Отключить", en: "Disconnect" },
  "profile.system": { ru: "Система", en: "System" },
  "profile.action.home": { ru: "Домой", en: "Home" },
  "profile.action.settings": { ru: "Настройки", en: "Settings" },
  "profile.action.logout": { ru: "Выйти", en: "Logout" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("chathut-language");
    return (saved as Language) || "ru";
  });

  useEffect(() => {
    localStorage.setItem("chathut-language", language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

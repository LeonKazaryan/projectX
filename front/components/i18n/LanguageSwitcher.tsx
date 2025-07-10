import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";
import type { Language } from "./LanguageContext";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "nav" | "standalone";
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = "",
  variant = "nav",
}) => {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: "ru" as Language, label: "RU", flag: "🇷🇺" },
    { code: "en" as Language, label: "EN", flag: "🇺🇸" },
  ];

  const currentLang = languages.find((lang) => lang.code === language);

  const toggleLanguage = () => {
    const newLang = language === "ru" ? "en" : "ru";
    setLanguage(newLang);
  };

  if (variant === "nav") {
    return (
      <motion.button
        onClick={toggleLanguage}
        className={`flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Globe className="w-4 h-4 text-white/80" />
        <span className="text-white/90 text-sm font-medium">
          {currentLang?.flag} {currentLang?.label}
        </span>
      </motion.button>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Globe className="w-5 h-5 text-gray-400" />
      <div className="flex bg-gray-800/50 rounded-xl p-1 backdrop-blur-sm border border-gray-600/30">
        {languages.map((lang) => (
          <motion.button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              language === lang.code
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center space-x-1">
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;

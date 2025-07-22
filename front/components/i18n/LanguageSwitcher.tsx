import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";
import type { Language } from "./LanguageContext";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "nav" | "standalone";
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = "",
  variant = "nav",
}) => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang = language === "ru" ? "en" : "ru";
    setLanguage(newLang);
  };

  if (variant === "nav") {
    return (
      <motion.button
        onClick={toggleLanguage}
        className={`flex items-center px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span
          className={`text-sm font-bold transition-colors duration-200 ${
            language === "ru" ? "text-blue-400" : "text-white/70"
          }`}
        >
          RU
        </span>
        <span className="mx-1 text-white/40">/</span>
        <span
          className={`text-sm font-bold transition-colors duration-200 ${
            language === "en" ? "text-blue-400" : "text-white/70"
          }`}
        >
          EN
        </span>
      </motion.button>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex bg-gray-800/50 rounded-xl p-1 backdrop-blur-sm border border-gray-600/30">
        <motion.button
          onClick={() => setLanguage("ru")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
            language === "ru"
              ? "bg-blue-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-gray-700/50"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          RU
        </motion.button>
        <motion.button
          onClick={() => setLanguage("en")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
            language === "en"
              ? "bg-blue-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-gray-700/50"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          EN
        </motion.button>
      </div>
    </div>
  );
};

export default LanguageSwitcher;

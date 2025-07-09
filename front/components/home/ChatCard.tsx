import React from "react";
import { motion } from "framer-motion";

interface ChatCardProps {
  children: React.ReactNode;
  platform?: "telegram" | "whatsapp" | "ai" | "general";
  variant?: "bubble" | "card" | "notification";
  className?: string;
  onClick?: () => void;
}

const ChatCard: React.FC<ChatCardProps> = ({
  children,
  platform = "general",
  variant = "card",
  className = "",
  onClick,
}) => {
  const platformColors = {
    telegram: "#0088cc",
    whatsapp: "#25d366",
    ai: "#ff6b35",
    general: "#6366f1",
  };

  const color = platformColors[platform];

  const variants = {
    bubble: {
      base: `rounded-3xl backdrop-blur-md border shadow-lg`,
      style: {
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        boxShadow: `0 8px 32px ${color}20`,
      },
    },
    card: {
      base: `rounded-2xl backdrop-blur-sm border-2 shadow-xl`,
      style: {
        backgroundColor: `rgba(17, 24, 39, 0.8)`,
        borderColor: `${color}60`,
        boxShadow: `0 10px 40px ${color}25`,
      },
    },
    notification: {
      base: `rounded-xl backdrop-blur-sm border`,
      style: {
        backgroundColor: `${color}10`,
        borderColor: `${color}30`,
        boxShadow: `0 4px 20px ${color}15`,
      },
    },
  };

  const currentVariant = variants[variant];

  return (
    <motion.div
      className={`${currentVariant.base} ${className} transition-all duration-300 cursor-pointer`}
      style={currentVariant.style}
      whileHover={{
        scale: 1.02,
        boxShadow: `0 15px 50px ${color}35`,
        borderColor: `${color}80`,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default ChatCard;

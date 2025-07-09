import React from "react";
import { motion } from "framer-motion";

interface TypingIndicatorProps {
  platform?: "telegram" | "whatsapp" | "ai";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  platform = "ai",
  size = "md",
  className = "",
}) => {
  const platformColors = {
    telegram: "#0088cc",
    whatsapp: "#25d366",
    ai: "#ff6b35",
  };

  const sizes = {
    sm: { container: "w-8 h-6", dot: "w-1.5 h-1.5" },
    md: { container: "w-12 h-8", dot: "w-2 h-2" },
    lg: { container: "w-16 h-10", dot: "w-3 h-3" },
  };

  const color = platformColors[platform];
  const sizeConfig = sizes[size];

  const dotAnimation = {
    y: [-4, 0, -4],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  };

  return (
    <div className={`${className} flex items-center`}>
      <div
        className={`${sizeConfig.container} flex items-center justify-center space-x-1 px-3 py-2 rounded-2xl backdrop-blur-sm`}
        style={{
          backgroundColor: `${color}22`,
          border: `1px solid ${color}44`,
        }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${sizeConfig.dot} rounded-full`}
            style={{ backgroundColor: color }}
            initial={{ y: 0, opacity: 0.7 }}
            animate={dotAnimation}
            transition={{ delay: index * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
};

export default TypingIndicator;

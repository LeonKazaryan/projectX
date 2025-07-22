import React, { useRef, useEffect, useMemo, useState } from "react";

interface ChatBackgroundProps {
  platform: "telegram" | "whatsapp" | "ai";
  children: React.ReactNode;
}

const ChatBackground: React.FC<ChatBackgroundProps> = ({
  platform,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const getPlatformColors = () => {
    switch (platform) {
      case "telegram":
        return {
          primary: "#0088cc",
          secondary: "#6366f1",
          gradient: "from-blue-50/70 via-indigo-50/60 to-purple-100/50",
          darkGradient: "from-gray-900/80 via-blue-950/70 to-purple-950/60",
        };
      case "whatsapp":
        return {
          primary: "#25d366",
          secondary: "#128c7e",
          gradient: "from-green-50/60 via-white/80 to-emerald-100/60",
          darkGradient: "from-gray-900/80 via-gray-900/90 to-green-950/80",
        };
      case "ai":
        return {
          primary: "#ff6b35",
          secondary: "#f97316",
          gradient: "from-orange-50/60 via-white/80 to-red-100/60",
          darkGradient: "from-gray-900/80 via-gray-900/90 to-orange-950/80",
        };
    }
  };

  const colors = getPlatformColors();

  // Pre-calculate all background bubble positions once
  const floatingBubbles = useMemo(() => {
    const bubbleCount = platform === "telegram" ? 5 : 3; // More bubbles for Telegram
    return Array.from({ length: bubbleCount }, (_, i) => {
      const startX = (i * 25 + Math.random() * 15) % 100;
      const startY = (i * 30 + Math.random() * 20) % 100;
      const offset = i * 6; // Small vertical offset for each bubble

      return {
        id: i,
        startX,
        startY,
        offset,
      };
    });
  }, [platform]); // Include platform in dependencies

  // Mouse tracking for interactive background effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };

    if (platform === "telegram") {
      document.addEventListener("mousemove", handleMouseMove);
      return () => document.removeEventListener("mousemove", handleMouseMove);
    }
  }, [platform]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 relative overflow-hidden bg-gradient-to-br ${colors.gradient} dark:${colors.darkGradient} backdrop-blur-md transition-colors duration-500`}
    >
      {/* Floating message bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {floatingBubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute w-6 h-4 rounded-xl transform-gpu"
            style={{
              background: colors.primary,
              left: `${bubble.startX}%`,
              top: `${bubble.startY}%`,
              willChange: "transform, opacity",
              transform: `translateY(-${bubble.offset}px)`,
              opacity: platform === "telegram" ? 0.006 : 0.004,
            }}
          />
        ))}
      </div>

      {/* Platform-specific background patterns */}
      {platform === "telegram" && (
        <>
          {/* Subtle connection lines */}
          <div className="absolute inset-0 pointer-events-none">
            <svg
              className="w-full h-full opacity-5"
              style={{ filter: "blur(0.5px)" }}
            >
              <defs>
                <pattern
                  id="telegram-grid"
                  x="0"
                  y="0"
                  width="60"
                  height="60"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 60 0 L 0 0 0 60"
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#telegram-grid)" />
            </svg>
          </div>

          {/* Interactive radial gradients that follow mouse */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15 transition-all duration-1000 ease-out"
            style={{
              background: `radial-gradient(circle at ${mousePosition.x}% ${
                mousePosition.y
              }%, ${colors.primary}25 0%, transparent 40%),
                          radial-gradient(circle at ${100 - mousePosition.x}% ${
                100 - mousePosition.y
              }%, ${colors.secondary}20 0%, transparent 35%)`,
            }}
          />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export default ChatBackground;

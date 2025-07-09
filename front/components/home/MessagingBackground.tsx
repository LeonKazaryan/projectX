import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface MessagingBackgroundProps {
  color?: "telegram" | "whatsapp" | "ai" | "general";
  density?: number;
}

const MessagingBackground: React.FC<MessagingBackgroundProps> = ({
  color = "general",
  density = 20,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getColor = () => {
    switch (color) {
      case "telegram":
        return "#0088cc";
      case "whatsapp":
        return "#25d366";
      case "ai":
        return "#ff6b35";
      case "general":
      default:
        return "#6366f1";
    }
  };

  const createBubble = () => {
    if (!containerRef.current) return null;

    const bubble = document.createElement("div");
    bubble.className = "floating-message";

    // Randomly decide if it's a sent or received message
    const isSent = Math.random() > 0.5;
    bubble.classList.add(isSent ? "sent" : "received");

    // Set size (width and height)
    const size = 40 + Math.random() * 100;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size * 0.6}px`;

    // Set position
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    const posX = Math.random() * containerWidth;
    const posY = Math.random() * containerHeight;

    bubble.style.left = `${posX}px`;
    bubble.style.top = `${posY}px`;

    // Set opacity
    bubble.style.opacity = (0.1 + Math.random() * 0.2).toString();

    // Add to container
    containerRef.current.appendChild(bubble);

    // Animate with GSAP - smoother animation with easeInOut
    gsap.to(bubble, {
      y: -80 - Math.random() * 120, // Less extreme movement
      x: (Math.random() - 0.5) * 30, // More subtle horizontal drift
      opacity: 0,
      duration: 8 + Math.random() * 7, // Longer duration for smoother movement
      ease: "power1.inOut", // Smoother easing function
      onComplete: () => {
        if (bubble.parentNode) {
          bubble.parentNode.removeChild(bubble);
        }
      },
    });

    return bubble;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      createBubble();
    }, 1000 / (density / 10));

    return () => {
      clearInterval(interval);
    };
  }, [density]);

  const mainColor = getColor();

  return (
    <div
      ref={containerRef}
      className="messaging-background"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: 0,
        background: `radial-gradient(circle at center, ${mainColor}10 0%, rgba(10, 10, 30, 0.95) 100%)`,
      }}
    >
      <style>
        {`
          .messaging-background {
            pointer-events: none;
          }
          
          .floating-message {
            position: absolute;
            border-radius: 16px;
            background-color: ${mainColor}20;
            box-shadow: 0 0 10px ${mainColor}10;
            transform-origin: center;
            will-change: transform, opacity;
            transform: translateZ(0);
          }
          
          .floating-message.sent {
            border-bottom-right-radius: 4px;
          }
          
          .floating-message.received {
            border-bottom-left-radius: 4px;
          }
        `}
      </style>
    </div>
  );
};

export default MessagingBackground;

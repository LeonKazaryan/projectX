import React, { useEffect, useRef, useMemo } from "react";
import { gsap } from "gsap";

interface MessagingBackgroundProps {
  color?: "telegram" | "whatsapp" | "ai" | "general";
  density?: number;
}

const MessagingBackground: React.FC<MessagingBackgroundProps> = ({
  color = "general",
  density = 8,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-calculate bubble creation parameters to prevent recalculation
  const bubbleParams = useMemo(() => {
    return Array.from({ length: 20 }, () => ({
      size: 40 + Math.random() * 80,
      driftX: (Math.random() - 0.5) * 40,
      driftY: -80 - Math.random() * 100,
      duration: 10 + Math.random() * 8,
      opacity: 0.08 + Math.random() * 0.12,
    }));
  }, []);

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

    // Get pre-calculated parameters
    const params =
      bubbleParams[Math.floor(Math.random() * bubbleParams.length)];
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    const posX = Math.random() * containerWidth;
    const posY = Math.random() * containerHeight;

    bubble.style.width = `${params.size}px`;
    bubble.style.height = `${params.size * 0.6}px`;
    bubble.style.left = `${posX}px`;
    bubble.style.top = `${posY}px`;
    bubble.style.opacity = params.opacity.toString();

    // Add to container
    containerRef.current.appendChild(bubble);

    // Animate with GSAP - using pre-calculated values for smooth animation
    gsap.to(bubble, {
      y: params.driftY,
      x: params.driftX,
      opacity: 0,
      duration: params.duration,
      ease: "power2.out", // Smoother easing function
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
    }, 3000 / (density / 3));

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
            backface-visibility: hidden;
            perspective: 1000px;
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

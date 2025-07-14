import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";

const HolographicCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = () => {
      // Simple glow effect instead of rotation
      gsap.to(card, {
        duration: 0.3,
        scale: 1.02,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        duration: 0.3,
        scale: 1,
        ease: "power2.out",
      });
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div ref={cardRef} className={className}>
      {children}
    </div>
  );
};

export default HolographicCard;

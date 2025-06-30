import React from "react";

const Hexagon = ({
  size = 100,
  className = "",
  children,
}: {
  size?: number;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        height: size * 0.866,
        clipPath:
          "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      }}
    >
      {children}
    </div>
  );
};

export default Hexagon;

import { useState, useEffect } from "react";

const GlitchText = ({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) => {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`transition-all duration-200 ${
          isGlitching
            ? "animate-pulse text-shadow-neon filter blur-[1px] skew-x-1"
            : ""
        }`}
        style={{
          textShadow: isGlitching
            ? "0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff, 0 0 20px #00ffff"
            : "0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff",
        }}
      >
        {children}
      </div>
      {isGlitching && (
        <>
          <div
            className="absolute top-0 left-0 opacity-70 text-red-500"
            style={{ transform: "translate(-2px, 0)" }}
          >
            {children}
          </div>
          <div
            className="absolute top-0 left-0 opacity-70 text-cyan-500"
            style={{ transform: "translate(2px, 0)" }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};

export default GlitchText;

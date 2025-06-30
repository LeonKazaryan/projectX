// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../src/components/ui/button";
import { Input } from "../../src/components/ui/input";
import { Label } from "../../src/components/ui/label";
import { Card, CardContent } from "../../src/components/ui/card";
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Terminal,
  Cpu,
  Shield,
  Zap,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import "./AuthModal.css";
import GlitchText from "../cyberpunk/GlitchText";
import HolographicCard from "../cyberpunk/HolographicCard";

// Validation schemas
const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be less than 50 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    email: z.string().email("Invalid email address"),
    displayName: z
      .string()
      .min(1, "Display name is required")
      .max(100, "Display name too long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    languagePreference: z.string().default("en"),
    themePreference: z.string().default("cyberpunk"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: LoginForm) => Promise<void>;
  onRegister: (data: RegisterForm) => Promise<void>;
  initialMode?: "login" | "register";
}

const CyberpunkInput = ({
  icon: Icon,
  type = "text",
  className = "",
  error = false,
  ...props
}: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="relative">
      <div
        className={`relative flex items-center transition-all duration-300 ${
          isFocused || props.value
            ? "neon-border-active"
            : error
            ? "border-red-500"
            : "border-gray-600"
        }`}
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          border: "1px solid",
          borderRadius: "8px",
          boxShadow: isFocused
            ? "0 0 15px rgba(0, 255, 255, 0.3)"
            : error
            ? "0 0 15px rgba(255, 0, 0, 0.3)"
            : "none",
        }}
      >
        <Icon className="w-5 h-5 ml-3 text-cyan-400" />
        <Input
          type={inputType}
          className={`bg-transparent border-0 text-white placeholder-gray-400 focus:ring-0 focus:outline-none ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="mr-3 text-gray-400 hover:text-cyan-400 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <div className="flex items-center mt-1 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  initialMode = "login",
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
      rememberMe: false,
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      password: "",
      confirmPassword: "",
      languagePreference: "en",
      themePreference: "cyberpunk",
    },
  });

  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.8, y: 50 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );
    }
  }, [isOpen, mode]);

  const handleSubmit = async (data: LoginForm | RegisterForm) => {
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await onLogin(data as LoginForm);
      } else {
        const {
          displayName,
          confirmPassword,
          languagePreference,
          themePreference,
          ...rest
        } = data as RegisterForm;
        await onRegister({
          ...rest,
          display_name: displayName,
          confirm_password: confirmPassword,
          language_preference: languagePreference,
          theme_preference: themePreference,
        });
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let displayError = "An unexpected error occurred. Please try again.";
      const errorDetail = err.response?.data?.detail;

      if (typeof errorDetail === "string") {
        displayError = errorDetail;
      } else if (typeof errorDetail === "object" && errorDetail !== null) {
        if (Array.isArray(errorDetail)) {
          // Handle FastAPI validation errors
          displayError = errorDetail
            .map((e) => `${e.loc.join(".")} - ${e.msg}`)
            .join("; ");
        } else if (errorDetail.message) {
          // Handle custom error objects
          displayError = errorDetail.message;
          if (errorDetail.errors && Array.isArray(errorDetail.errors)) {
            displayError += `: ${errorDetail.errors.join(", ")}`;
          }
        }
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    loginForm.reset();
    registerForm.reset();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="w-full max-w-md"
        >
          <HolographicCard className="relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <CardContent className="p-8 relative">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(145deg, #00ffff20, #ff00ff20)",
                      border: "1px solid #00ffff60",
                    }}
                  >
                    <Terminal className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>
                <GlitchText className="text-2xl font-bold font-orbitron text-cyan-300">
                  {mode === "login" ? "Neural Link" : "Initialize User"}
                </GlitchText>
                <p className="text-gray-400 mt-2 font-rajdhani">
                  {mode === "login"
                    ? "Connect to the ChartHut matrix"
                    : "Create your cyberpunk identity"}
                </p>
              </div>

              {/* Server Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg mb-6 flex items-center"
                >
                  <AlertCircle className="w-5 h-5 mr-3" />
                  <span className="font-rajdhani">{error}</span>
                </motion.div>
              )}

              {/* Forms */}
              <form
                onSubmit={
                  mode === "login"
                    ? loginForm.handleSubmit(handleSubmit)
                    : registerForm.handleSubmit(handleSubmit)
                }
                className="space-y-6"
              >
                {mode === "login" ? (
                  <>
                    <div>
                      <Label className="text-cyan-300 font-rajdhani">
                        Email or Username
                      </Label>
                      <CyberpunkInput
                        icon={User}
                        placeholder="Enter your credentials..."
                        {...loginForm.register("emailOrUsername")}
                        error={
                          loginForm.formState.errors.emailOrUsername?.message
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-cyan-300 font-rajdhani">
                        Password
                      </Label>
                      <CyberpunkInput
                        icon={Lock}
                        type="password"
                        placeholder="Neural access key..."
                        {...loginForm.register("password")}
                        error={loginForm.formState.errors.password?.message}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        className="cyberpunk-checkbox"
                        {...loginForm.register("rememberMe")}
                      />
                      <Label
                        htmlFor="rememberMe"
                        className="text-gray-300 font-rajdhani"
                      >
                        Remember neural link
                      </Label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-cyan-300 font-rajdhani">
                          Username
                        </Label>
                        <CyberpunkInput
                          icon={User}
                          placeholder="cyber_user"
                          {...registerForm.register("username")}
                          error={
                            registerForm.formState.errors.username?.message
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-cyan-300 font-rajdhani">
                          Display Name
                        </Label>
                        <CyberpunkInput
                          icon={Terminal}
                          placeholder="Neo Anderson"
                          {...registerForm.register("displayName")}
                          error={
                            registerForm.formState.errors.displayName?.message
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-cyan-300 font-rajdhani">
                        Email
                      </Label>
                      <CyberpunkInput
                        icon={Mail}
                        type="email"
                        placeholder="agent@matrix.net"
                        {...registerForm.register("email")}
                        error={registerForm.formState.errors.email?.message}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-cyan-300 font-rajdhani">
                          Password
                        </Label>
                        <CyberpunkInput
                          icon={Lock}
                          type="password"
                          placeholder="Neural key..."
                          {...registerForm.register("password")}
                          error={
                            registerForm.formState.errors.password?.message
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-cyan-300 font-rajdhani">
                          Confirm
                        </Label>
                        <CyberpunkInput
                          icon={Shield}
                          type="password"
                          placeholder="Verify key..."
                          {...registerForm.register("confirmPassword")}
                          error={
                            registerForm.formState.errors.confirmPassword
                              ?.message
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-3 cyberpunk-btn font-rajdhani"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Cpu className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        {mode === "login"
                          ? "Connect to Matrix"
                          : "Initialize Neural Link"}
                      </>
                    )}
                  </Button>
                </motion.div>

                {/* Switch Mode */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors font-rajdhani"
                  >
                    {mode === "login" ? (
                      <>
                        Need neural initialization?{" "}
                        <span className="underline">Register</span>
                      </>
                    ) : (
                      <>
                        Already connected?{" "}
                        <span className="underline">Login</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </CardContent>
          </HolographicCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;

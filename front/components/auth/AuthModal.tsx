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
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import MessagingBackground from "../home/MessagingBackground";
import TypingIndicator from "../home/TypingIndicator";

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
    password: z.string().min(6, "Password must be at least 6 characters"),
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
  const { t, language } = useLanguage();

  const tr = (key: string) => t(key);

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative w-full max-w-md">
          <MessagingBackground color="general" density={16} />
          <Card className="relative z-10 shadow-2xl rounded-3xl bg-white/80 dark:bg-zinc-900/80 border-0 backdrop-blur-xl">
            <CardContent className="p-10 md:p-12">
              <div className="flex justify-between items-center mb-8">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent select-none">
                  chathut
                </span>
                <button
                  onClick={onClose}
                  className="ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-extrabold text-zinc-800 dark:text-white mb-2 tracking-tight">
                  {mode === "login" ? tr("loginTitle") : tr("registerTitle")}
                </h2>
                <p className="text-lg text-zinc-500 dark:text-zinc-300">
                  {mode === "login"
                    ? tr("loginSubtitle")
                    : tr("registerSubtitle")}
                </p>
              </div>
              {error && (
                <div className="bg-red-100 border border-red-300 text-red-600 rounded-lg px-4 py-2 mb-6 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <form
                onSubmit={
                  mode === "login"
                    ? loginForm.handleSubmit(handleSubmit)
                    : registerForm.handleSubmit(handleSubmit)
                }
                className="space-y-7"
              >
                {mode === "login" ? (
                  <>
                    <div className="space-y-2">
                      <Label>{tr("emailOrUsername")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
                        <Input
                          type="text"
                          placeholder={tr("emailOrUsernamePlaceholder")}
                          {...loginForm.register("emailOrUsername")}
                          aria-invalid={
                            !!loginForm.formState.errors.emailOrUsername
                          }
                          className="pl-10 bg-white/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 placeholder:text-zinc-400 text-base h-12"
                        />
                      </div>
                      {loginForm.formState.errors.emailOrUsername && (
                        <div className="text-xs text-red-500 mt-1">
                          {loginForm.formState.errors.emailOrUsername.message}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>{tr("password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
                        <Input
                          type="password"
                          placeholder={tr("passwordPlaceholder")}
                          {...loginForm.register("password")}
                          aria-invalid={!!loginForm.formState.errors.password}
                          className="pl-10 bg-white/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200 placeholder:text-zinc-400 text-base h-12"
                        />
                      </div>
                      {loginForm.formState.errors.password && (
                        <div className="text-xs text-red-500 mt-1">
                          {loginForm.formState.errors.password.message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        {...loginForm.register("rememberMe")}
                      />
                      <Label htmlFor="rememberMe" className="text-sm">
                        {tr("rememberMe")}
                      </Label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>{tr("username")}</Label>
                        <Input
                          type="text"
                          placeholder={tr("usernamePlaceholder")}
                          {...registerForm.register("username")}
                          aria-invalid={
                            !!registerForm.formState.errors.username
                          }
                          className="bg-white/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 placeholder:text-zinc-400 text-base h-12"
                        />
                        {registerForm.formState.errors.username && (
                          <div className="text-xs text-red-500 mt-1">
                            {registerForm.formState.errors.username.message}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{tr("displayName")}</Label>
                        <Input
                          type="text"
                          placeholder={tr("displayNamePlaceholder")}
                          {...registerForm.register("displayName")}
                          aria-invalid={
                            !!registerForm.formState.errors.displayName
                          }
                          className="bg-white/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200 placeholder:text-zinc-400 text-base h-12"
                        />
                        {registerForm.formState.errors.displayName && (
                          <div className="text-xs text-red-500 mt-1">
                            {registerForm.formState.errors.displayName.message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{tr("email")}</Label>
                      <Input
                        type="email"
                        placeholder={tr("emailPlaceholder")}
                        {...registerForm.register("email")}
                        aria-invalid={!!registerForm.formState.errors.email}
                        className="bg-white/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 placeholder:text-zinc-400 text-base h-12"
                      />
                      {registerForm.formState.errors.email && (
                        <div className="text-xs text-red-500 mt-1">
                          {registerForm.formState.errors.email.message}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>{tr("password")}</Label>
                        <Input
                          type="password"
                          placeholder={tr("passwordPlaceholder")}
                          {...registerForm.register("password")}
                          aria-invalid={
                            !!registerForm.formState.errors.password
                          }
                          className="bg-white/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200 placeholder:text-zinc-400 text-base h-12"
                        />
                        {registerForm.formState.errors.password && (
                          <div className="text-xs text-red-500 mt-1">
                            {registerForm.formState.errors.password.message}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{tr("confirmPassword")}</Label>
                        <Input
                          type="password"
                          placeholder={tr("confirmPasswordPlaceholder")}
                          {...registerForm.register("confirmPassword")}
                          aria-invalid={
                            !!registerForm.formState.errors.confirmPassword
                          }
                          className="bg-white/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200 placeholder:text-zinc-400 text-base h-12"
                        />
                        {registerForm.formState.errors.confirmPassword && (
                          <div className="text-xs text-red-500 mt-1">
                            {
                              registerForm.formState.errors.confirmPassword
                                .message
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="mt-8">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-2xl shadow-lg transform-gpu transition-all duration-200 focus:ring-4 focus:ring-blue-300/40 focus:outline-none hover:scale-105 hover:shadow-2xl"
                  >
                    {isLoading ? (
                      <TypingIndicator
                        size="sm"
                        platform="ai"
                        className="mx-auto"
                      />
                    ) : (
                      <>
                        {mode === "login" ? tr("loginBtn") : tr("registerBtn")}
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() =>
                      setMode(mode === "login" ? "register" : "login")
                    }
                    className="text-blue-500 hover:underline text-base font-medium"
                  >
                    {mode === "login" ? tr("needAccount") : tr("haveAccount")}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;

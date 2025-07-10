import React, { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  MessageCircle,
  Brain,
  Database,
  Lock,
  Server,
  Zap,
  Eye,
  ArrowRight,
  CheckCircle,
  Cpu,
  Network,
  Key,
  Home,
  Send,
} from "lucide-react";
import { Button } from "../../src/components/ui/button";
import { authService } from "../services/authService";
import "./Security.css";
import MessagingBackground from "../home/MessagingBackground";
import ChatCard from "../home/ChatCard";
import TypingIndicator from "../home/TypingIndicator";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

interface ProcessStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  platform: "telegram" | "whatsapp" | "ai" | "general";
}

const Security: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const stepsInView = useInView(stepsRef, { once: true, margin: "-100px" });
  const securityInView = useInView(securityRef, {
    once: true,
    margin: "-100px",
  });

  const isAuthenticated = authService.isAuthenticated();

  const handleNavigateToApp = () => {
    if (isAuthenticated) {
      navigate("/profile");
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        {
          y: 50,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
        }
      );
    }
  }, []);

  const processSteps: ProcessStep[] = [
    {
      id: 1,
      title: "Message Reception",
      description: "Your messages are securely received through Telegram's API",
      icon: <MessageCircle className="h-8 w-8" />,
      details: [
        "Direct connection to Telegram MTProto protocol",
        "End-to-end encryption maintained",
        "No message content stored permanently",
        "Real-time WebSocket communication",
      ],
      platform: "telegram",
    },
    {
      id: 2,
      title: "Context Analysis",
      description: "AI analyzes conversation context using advanced NLP",
      icon: <Brain className="h-8 w-8" />,
      details: [
        "Local processing for privacy",
        "Context-aware understanding",
        "Sentiment and intent recognition",
        "Multi-language support",
      ],
      platform: "ai",
    },
    {
      id: 3,
      title: "Knowledge Retrieval",
      description:
        "RAG system searches relevant information from your chat history",
      icon: <Database className="h-8 w-8" />,
      details: [
        "Vector-based semantic search",
        "Personalized knowledge base",
        "Encrypted data storage",
        "Privacy-first architecture",
      ],
      platform: "general",
    },
    {
      id: 4,
      title: "AI Response Generation",
      description: "Smart AI generates contextual suggestions for your replies",
      icon: <Cpu className="h-8 w-8" />,
      details: [
        "GPT-powered suggestion engine",
        "Context-aware responses",
        "Tone and style matching",
        "Real-time generation",
      ],
      platform: "whatsapp",
    },
  ];

  const securityFeatures = [
    {
      icon: <Lock className="h-6 w-6" />,
      title: "End-to-End Encryption",
      description:
        "All communications use Telegram's proven encryption protocols",
      platform: "telegram" as const,
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "No Data Mining",
      description: "We don't sell, share, or monetize your personal data",
      platform: "general" as const,
    },
    {
      icon: <Server className="h-6 w-6" />,
      title: "Local Processing",
      description: "Most AI processing happens locally on your device",
      platform: "ai" as const,
    },
    {
      icon: <Key className="h-6 w-6" />,
      title: "Your Keys, Your Data",
      description:
        "You control your Telegram session and can revoke access anytime",
      platform: "whatsapp" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      <MessagingBackground />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        className="fixed top-0 left-0 right-0 z-50 p-6 bg-black/20 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              chathut
            </span>
          </motion.div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher variant="nav" />

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => navigate("/")}
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/10 px-4 py-2"
              >
                <Home className="w-4 h-4 mr-2" />
                {t("nav.security")}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleNavigateToApp}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-medium px-6 py-2 rounded-xl shadow-lg"
              >
                <Send className="w-4 h-4 mr-2" />
                {isAuthenticated ? t("nav.openHut") : t("nav.startChatting")}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative z-10 pt-32 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Shield className="h-20 w-20 text-blue-400" />
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(59, 130, 246, 0.5)",
                      "0 0 40px rgba(59, 130, 246, 0.7)",
                      "0 0 20px rgba(59, 130, 246, 0.5)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 bg-clip-text text-transparent">
              {t("security.title")}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t("security.subtitle")}
            </p>
            <div className="flex justify-center mt-6">
              <TypingIndicator platform="telegram" size="lg" className="mx-2" />
              <TypingIndicator platform="ai" size="lg" className="mx-2" />
              <TypingIndicator platform="whatsapp" size="lg" className="mx-2" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <ChatCard platform="general" className="p-6 max-w-2xl mx-auto">
              <p className="text-gray-300 leading-relaxed">
                {t("security.description")}
              </p>
            </ChatCard>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={stepsRef} className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={stepsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              HOW IT WORKS
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Every step of our process is designed with your privacy and
              security in mind
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 50 }}
                animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="relative"
              >
                <ChatCard
                  platform={step.platform}
                  className="h-full p-6 transform-gpu"
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-400/30 mb-4">
                      {step.icon}
                    </div>
                    <div className="text-sm font-medium text-gray-400 mb-2">
                      STEP {step.id}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {step.details.map((detail, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-gray-400"
                      >
                        <CheckCircle className="h-3 w-3 mt-0.5 text-green-400 flex-shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Connection Arrow */}
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                      <ArrowRight className="h-8 w-8 text-blue-400" />
                    </div>
                  )}
                </ChatCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Flow Visualization */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DATA FLOW
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Watch how your data flows through our secure pipeline
            </p>
          </motion.div>

          <ChatCard platform="general" className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <motion.div
                whileInView={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center"
              >
                <ChatCard platform="telegram" className="p-4 mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-blue-500/20 border border-blue-500/40">
                    <MessageCircle className="h-10 w-10 text-blue-400" />
                  </div>
                </ChatCard>
                <h3 className="text-lg font-bold text-blue-400 mb-2">
                  YOUR MESSAGE
                </h3>
                <p className="text-sm text-gray-400">Encrypted at source</p>
              </motion.div>

              <motion.div className="text-center">
                <ChatCard platform="ai" className="p-4 mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-orange-500/20 border border-orange-500/40">
                    <Network className="h-10 w-10 text-orange-400" />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          "0 0 10px rgba(255, 107, 53, 0.3)",
                          "0 0 20px rgba(255, 107, 53, 0.5)",
                          "0 0 10px rgba(255, 107, 53, 0.3)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                </ChatCard>
                <h3 className="text-lg font-bold text-orange-400 mb-2">
                  AI PROCESSING
                </h3>
                <p className="text-sm text-gray-400">Local & secure</p>
              </motion.div>

              <motion.div
                whileInView={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="text-center"
              >
                <ChatCard platform="whatsapp" className="p-4 mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-green-500/20 border border-green-500/40">
                    <Zap className="h-10 w-10 text-green-400" />
                  </div>
                </ChatCard>
                <h3 className="text-lg font-bold text-green-400 mb-2">
                  SMART RESPONSE
                </h3>
                <p className="text-sm text-gray-400">Generated for you</p>
              </motion.div>
            </div>

            {/* Animated flow lines */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full">
                <motion.path
                  d="M 120 60 Q 300 30 480 60"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.path
                  d="M 520 60 Q 700 30 880 60"
                  stroke="url(#gradient2)"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                <defs>
                  <linearGradient
                    id="gradient1"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      style={{ stopColor: "#0088cc", stopOpacity: 0 }}
                    />
                    <stop
                      offset="50%"
                      style={{ stopColor: "#ff6b35", stopOpacity: 1 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: "#ff6b35", stopOpacity: 0 }}
                    />
                  </linearGradient>
                  <linearGradient
                    id="gradient2"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      style={{ stopColor: "#ff6b35", stopOpacity: 0 }}
                    />
                    <stop
                      offset="50%"
                      style={{ stopColor: "#25d366", stopOpacity: 1 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: "#25d366", stopOpacity: 0 }}
                    />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </ChatCard>
        </div>
      </section>

      {/* Security Features */}
      <section ref={securityRef} className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={securityInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              SECURITY FIRST
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Your privacy and security are our top priorities
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={securityInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              >
                <ChatCard platform={feature.platform} className="h-full">
                  <div className="flex items-start gap-4 p-6">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </ChatCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ChatCard platform="ai" className="p-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="flex justify-center space-x-4 mb-6">
                <div className="flex items-center space-x-2 bg-blue-500/20 px-4 py-2 rounded-full border border-blue-400/30">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">
                    {t("platform.telegram")}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-400/30">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    {t("platform.whatsapp")}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-orange-500/20 px-4 py-2 rounded-full border border-orange-400/30">
                  <Brain className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-400">
                    {t("platform.ai")}
                  </span>
                </div>
              </div>

              <h2 className="text-4xl md:text-6xl font-bold">
                {t("cta.readyToBuild")}{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {t("cta.chatHut")}
                </span>
                ?
              </h2>
              <p className="text-xl text-gray-300">{t("cta.description")}</p>

              <div className="flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleNavigateToApp}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold px-12 py-6 text-xl rounded-2xl shadow-2xl"
                  >
                    <ArrowRight className="w-6 h-6 mr-3" />
                    {isAuthenticated
                      ? t("home.enterHut")
                      : t("cta.startBuilding")}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </ChatCard>
        </div>
      </section>
    </div>
  );
};

export default Security;

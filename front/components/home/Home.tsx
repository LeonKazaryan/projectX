// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { TypeAnimation } from "react-type-animation";
import { Button } from "../../src/components/ui/button";
import AuthModal from "../auth/AuthModal";
import {
  authService,
  LoginRequest,
  RegisterRequest,
} from "../services/authService";
import "./Home.css";
import {
  MessageSquare,
  Users,
  Bot,
  ArrowRight,
  Shield,
  Zap,
  Heart,
  Home as HomeIcon,
  Smartphone,
  Send,
  MessageCircle,
  BrainCircuit,
  Sparkles,
  Globe,
  Lock,
} from "lucide-react";
import MessagingBackground from "./MessagingBackground";
import TypingIndicator from "./TypingIndicator";
import ChatCard from "./ChatCard";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  );
  const { t } = useLanguage();

  useEffect(() => {
    setIsLoaded(true);

    // GSAP animations for hero section
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.5, ease: "power3.out" }
      );
    }
  }, []);

  const handleNavigateToApp = () => {
    if (isAuthenticated) {
      navigate("/profile");
    } else {
      setAuthMode("login");
      setIsAuthModalOpen(true);
    }
  };

  const handleLogin = async (data: LoginRequest) => {
    try {
      await authService.login(data);
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      navigate("/profile");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const handleRegister = async (data: RegisterRequest) => {
    try {
      await authService.register(data);
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      navigate("/profile");
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const openAuthModal = (mode: "login" | "register") => {
    if (isAuthenticated) {
      navigate("/profile");
    } else {
      setAuthMode(mode);
      setIsAuthModalOpen(true);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const features = [
    {
      icon: BrainCircuit,
      title: t("features.smartAI.title"),
      description: t("features.smartAI.desc"),
      platform: "ai" as const,
    },
    {
      icon: MessageCircle,
      title: t("features.multiPlatform.title"),
      description: t("features.multiPlatform.desc"),
      platform: "telegram" as const,
    },
    {
      icon: Lock,
      title: t("features.privacy.title"),
      description: t("features.privacy.desc"),
      platform: "general" as const,
    },
    {
      icon: Zap,
      title: t("features.lightning.title"),
      description: t("features.lightning.desc"),
      platform: "whatsapp" as const,
    },
  ];

  const stats = [
    {
      number: "🏠",
      label: t("stats.chatHut.label"),
      subtext: t("stats.chatHut.text"),
    },
    {
      number: "🤖",
      label: t("stats.aiAssistant.label"),
      subtext: t("stats.aiAssistant.text"),
    },
    {
      number: "📱",
      label: t("stats.multiPlatform.label"),
      subtext: t("stats.multiPlatform.text"),
    },
    {
      number: "🔒",
      label: t("stats.secure.label"),
      subtext: t("stats.secure.text"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden relative">
      <MessagingBackground />

      <div className="relative z-10">
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
              <img
                src="/chahut.ico"
                alt="chathut logo"
                className="w-10 h-10"
                style={{ borderRadius: "12px" }}
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                chathut
              </span>
            </motion.div>

            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => navigate("/security")}
                  variant="ghost"
                  className="text-gray-300 hover:text-white hover:bg-white/10 px-4 py-2"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {t("nav.security")}
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleNavigateToApp}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-medium px-6 py-2 rounded-xl shadow-lg"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isAuthenticated ? t("nav.openHut") : t("nav.startChatting")}
                </Button>
              </motion.div>

              <LanguageSwitcher variant="nav" />
            </div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              ref={heroRef}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex justify-center items-center space-x-4 mb-8">
                  <TypingIndicator platform="telegram" size="lg" />
                  <TypingIndicator platform="ai" size="lg" />
                  <TypingIndicator platform="whatsapp" size="lg" />
                </div>

                <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 bg-clip-text text-transparent">
                  {t("home.title")}
                </h1>

                <div className="flex justify-center">
                  <ChatCard
                    variant="bubble"
                    platform="general"
                    className="px-6 py-3 inline-block"
                  >
                    <div className="flex items-center space-x-2">
                      <HomeIcon className="w-5 h-5 text-blue-400" />
                      <span className="text-lg font-medium">
                        {t("home.tagline")}
                      </span>
                    </div>
                  </ChatCard>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
                <h2 className="text-2xl md:text-4xl mb-6 text-gray-300">
                  <TypeAnimation
                    sequence={[
                      t("home.sequence.conversations"),
                      2000,
                      t("home.sequence.smartAI"),
                      2000,
                      t("home.sequence.platforms"),
                      2000,
                    ]}
                    wrapper="span"
                    speed={50}
                    repeat={Infinity}
                  />
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed">
                  {t("home.description")}
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex justify-center space-x-6 flex-wrap gap-y-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleNavigateToApp}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold px-8 py-4 text-lg rounded-2xl shadow-xl"
                  >
                    <HomeIcon className="w-5 h-5 mr-2" />
                    {isAuthenticated ? t("home.enterHut") : t("home.buildHut")}
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => openAuthModal("register")}
                    variant="outline"
                    size="lg"
                    className="border-2 border-blue-400/40 text-blue-400 hover:bg-blue-400/10 px-8 py-4 text-lg rounded-2xl backdrop-blur-sm"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    {isAuthenticated
                      ? t("home.profile")
                      : t("home.joinCommunity")}
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => navigate("/security")}
                    variant="outline"
                    size="lg"
                    className="border-2 border-green-400/40 text-green-400 hover:bg-green-400/10 px-8 py-4 text-lg rounded-2xl backdrop-blur-sm"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    {t("home.learnMore")}
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {stats.map((stat, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <ChatCard
                    platform="general"
                    className="p-6 text-center h-full"
                  >
                    <div className="text-4xl mb-3">{stat.number}</div>
                    <div className="text-lg font-semibold text-white mb-2">
                      {stat.label}
                    </div>
                    <div className="text-sm text-gray-400">{stat.subtext}</div>
                  </ChatCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                {t("features.whyChoose")}{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  chathut
                </span>
                ?
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                {t("features.description")}
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {features.map((feature, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <ChatCard platform={feature.platform} className="p-8 h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-400/30">
                        <feature.icon className="w-8 h-8 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-4 text-white">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </ChatCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <ChatCard platform="ai" className="p-12">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div className="flex justify-center space-x-4 mb-6">
                  <div className="flex items-center space-x-2 bg-blue-500/20 px-4 py-2 rounded-full border border-blue-400/30">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
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
                    <Bot className="w-4 h-4 text-orange-400" />
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onSwitchMode={setAuthMode}
      />
    </div>
  );
};

export default Home;

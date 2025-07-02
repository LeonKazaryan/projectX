// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { TypeAnimation } from "react-type-animation";
import { Button } from "../../src/components/ui/button";
import { Card, CardContent } from "../../src/components/ui/card";
import AuthModal from "../auth/AuthModal";
import {
  authService,
  LoginRequest,
  RegisterRequest,
} from "../services/authService";
import "./Home.css";
import {
  Bot,
  MessageSquare,
  ShieldCheck,
  Zap,
  BarChart,
  Users,
  Star,
  CheckCircle,
  ArrowRight,
  Play,
  Sparkles,
  Brain,
  Cpu,
  Network,
  Shield,
  Rocket,
  Eye,
  Wifi,
  Terminal,
} from "lucide-react";
import ParticleBackground from "../cyberpunk/ParticleBackground";
import GlitchText from "../cyberpunk/GlitchText";
import Hexagon from "../cyberpunk/Hexagon";
import HolographicCard from "../cyberpunk/HolographicCard";

const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  );

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
      icon: Brain,
      title: "AI-Powered Intelligence",
      description:
        "Advanced neural networks analyze and enhance your communications",
      color: "#00ffff",
    },
    {
      icon: Shield,
      title: "Quantum Security",
      description:
        "Military-grade encryption protects your digital conversations",
      color: "#ff00ff",
    },
    {
      icon: Network,
      title: "Neural Networks",
      description:
        "Connect across multiple platforms with seamless integration",
      color: "#ffff00",
    },
    {
      icon: Rocket,
      title: "Hyperspeed Processing",
      description:
        "Real-time message analysis and instant intelligent responses",
      color: "#00ff00",
    },
  ];

  const stats = [
    { number: "99.9%", label: "Uptime", icon: Cpu },
    { number: "1M+", label: "Messages Processed", icon: MessageSquare },
    { number: "256-bit", label: "Encryption", icon: ShieldCheck },
    { number: "< 50ms", label: "Response Time", icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative font-rajdhani">
      <ParticleBackground />

      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-[1] cyberpunk-grid" />

      <div className="relative z-10">
        {/* Navigation */}
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1 }}
          className="fixed top-0 left-0 right-0 z-50 p-6"
        >
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex items-center space-x-2"
            >
              <Hexagon
                size={40}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center"
              >
                <Terminal className="w-6 h-6 text-white" />
              </Hexagon>
              <GlitchText className="text-2xl font-bold font-orbitron">
                chathut
              </GlitchText>
            </motion.div>

            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => navigate("/security")}
                  variant="ghost"
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-4 py-2 font-rajdhani"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  How It Works
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleNavigateToApp}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-bold px-6 py-2 border-0"
                  style={{
                    boxShadow: "0 0 20px rgba(0,255,255,0.5)",
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Launch App
                </Button>
              </motion.div>
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
              <motion.div variants={itemVariants}>
                <GlitchText className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-orbitron">
                  chathut
                </GlitchText>
              </motion.div>

              <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
                <h2 className="text-2xl md:text-4xl mb-6 text-cyan-300">
                  <TypeAnimation
                    sequence={[
                      "The Future of Intelligent Messaging",
                      2000,
                      "Neural-Enhanced Communication Hub",
                      2000,
                      "AI-Powered Telegram Experience",
                      2000,
                    ]}
                    wrapper="span"
                    speed={50}
                    repeat={Infinity}
                  />
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Experience the next evolution of digital communication with
                  our cybernetic AI assistant. Seamlessly integrated with
                  Telegram, enhanced with quantum-level intelligence.
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex justify-center space-x-6 flex-wrap gap-y-4"
              >
                <motion.div
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 30px rgba(0,255,255,0.8)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleNavigateToApp}
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-8 py-4 text-lg border-0 cyberpunk-btn font-rajdhani"
                  >
                    <Rocket className="w-5 h-5 mr-2" />
                    {isAuthenticated
                      ? "Enter Neural Matrix"
                      : "Initialize Neural Link"}
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 30px rgba(255,0,255,0.8)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => openAuthModal("register")}
                    variant="outline"
                    size="lg"
                    className="border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10 px-8 py-4 text-lg cyberpunk-btn font-rajdhani neon-border"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    {isAuthenticated ? "Neural Settings" : "Register"}
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 30px rgba(255,255,0,0.8)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => navigate("/security")}
                    variant="outline"
                    size="lg"
                    className="border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 px-8 py-4 text-lg cyberpunk-btn font-rajdhani neon-border"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Security & Transparency
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
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                >
                  <HolographicCard className="p-6 rounded-lg text-center">
                    <stat.icon className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
                    <div className="text-3xl font-bold text-white mb-2">
                      {stat.number}
                    </div>
                    <div className="text-gray-400">{stat.label}</div>
                  </HolographicCard>
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
              <h2 className="text-4xl md:text-6xl font-bold mb-6 font-orbitron">
                <GlitchText>Neural Architecture</GlitchText>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Powered by advanced quantum algorithms and neural networks, our
                platform redefines intelligent communication.
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
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: `0 0 30px ${feature.color}80`,
                  }}
                  className="group"
                >
                  <HolographicCard className="p-8 rounded-lg h-full">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                        style={{
                          background: `linear-gradient(145deg, ${feature.color}20, ${feature.color}40)`,
                          border: `1px solid ${feature.color}60`,
                        }}
                      >
                        <feature.icon
                          className="w-8 h-8"
                          style={{ color: feature.color }}
                        />
                      </div>
                      <h3 className="text-xl font-bold mb-4 text-white">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </HolographicCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-6xl font-bold">
                <GlitchText>Ready to Evolve?</GlitchText>
              </h2>
              <p className="text-xl text-gray-300">
                Join the neural revolution and experience communication beyond
                human limitations.
              </p>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleNavigateToApp}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 text-white font-bold px-12 py-6 text-xl border-0 cyberpunk-btn font-rajdhani"
                  style={{
                    boxShadow: "0 0 40px rgba(255,0,255,0.6)",
                  }}
                >
                  <Wifi className="w-6 h-6 mr-3" />
                  Connect to the Matrix
                  <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-cyan-500/20">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center justify-center space-x-2 mb-4"
            >
              <Hexagon
                size={30}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center"
              >
                <Terminal className="w-4 h-4 text-white" />
              </Hexagon>
              <span className="text-lg font-bold text-cyan-300 font-orbitron">
                chathut
              </span>
            </motion.div>
            <p className="text-gray-400">
              © 2024 chathut. Neural architecture designed for the future.
            </p>
          </div>
        </footer>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        initialMode={authMode}
      />
    </div>
  );
};

export default Home;

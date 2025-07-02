import React, { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "gsap";
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
  AlertTriangle,
  Cpu,
  Network,
  Key,
} from "lucide-react";
import { Button } from "../../src/components/ui/button";
import { Card } from "../../src/components/ui/card";
import ParticleBackground from "../cyberpunk/ParticleBackground";
import GlitchText from "../cyberpunk/GlitchText";
import HolographicCard from "../cyberpunk/HolographicCard";
import "./Security.css";

interface ProcessStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  color: string;
}

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
    color: "#00ffff",
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
    color: "#ff00ff",
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
    color: "#ffff00",
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
    color: "#00ff00",
  },
];

const securityFeatures = [
  {
    icon: <Lock className="h-6 w-6" />,
    title: "End-to-End Encryption",
    description:
      "All communications use Telegram's proven encryption protocols",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "No Data Mining",
    description: "We don't sell, share, or monetize your personal data",
  },
  {
    icon: <Server className="h-6 w-6" />,
    title: "Local Processing",
    description: "Most AI processing happens locally on your device",
  },
  {
    icon: <Key className="h-6 w-6" />,
    title: "Your Keys, Your Data",
    description:
      "You control your Telegram session and can revoke access anytime",
  },
];

const Security: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);

  const stepsInView = useInView(stepsRef, { once: true, margin: "-100px" });
  const securityInView = useInView(securityRef, {
    once: true,
    margin: "-100px",
  });

  useEffect(() => {
    if (heroRef.current) {
      gsap.from(heroRef.current.children, {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-rajdhani">
      <ParticleBackground />

      {/* Cyber Grid Background */}
      <div className="cyber-grid-overlay" />

      {/* Hero Section */}
      <section ref={heroRef} className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <Shield className="h-20 w-20 mx-auto mb-6 text-cyan-400 neon-glow" />
            <h1 className="text-5xl md:text-7xl font-orbitron font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              <GlitchText text="TRANSPARENCY" />
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Discover how{" "}
              <span className="text-cyan-400 font-bold">chathut</span> works
              under the hood. Complete transparency, zero bullshit, maximum
              security.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Button className="cyberpunk-btn bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold px-8 py-3 text-lg">
              <Zap className="mr-2 h-5 w-5" />
              See It In Action
            </Button>
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
            <h2 className="text-4xl md:text-5xl font-orbitron font-bold mb-6 text-cyan-400">
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
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={stepsInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="relative"
              >
                <HolographicCard className="h-full p-6 transform-gpu">
                  <div
                    className="flex items-center justify-center w-16 h-16 rounded-full mb-4 mx-auto neon-glow"
                    style={{ backgroundColor: step.color, color: "#000" }}
                  >
                    {step.icon}
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-sm font-bold text-gray-400 mb-2">
                      STEP {step.id}
                    </div>
                    <h3 className="text-xl font-orbitron font-bold text-white mb-3">
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
                      <ArrowRight className="h-8 w-8 text-cyan-400 neon-pulse" />
                    </div>
                  )}
                </HolographicCard>
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
            <h2 className="text-4xl md:text-5xl font-orbitron font-bold mb-6 text-purple-400">
              DATA FLOW
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Watch how your data flows through our secure pipeline
            </p>
          </motion.div>

          <div className="relative bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-2xl p-8 border border-purple-500/30 neon-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <motion.div
                whileInView={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mb-4 neon-glow">
                  <MessageCircle className="h-10 w-10 text-black" />
                </div>
                <h3 className="text-lg font-orbitron font-bold text-cyan-400 mb-2">
                  YOUR MESSAGE
                </h3>
                <p className="text-sm text-gray-400">Encrypted at source</p>
              </motion.div>

              <motion.div
                whileInView={{ rotateY: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 neon-glow">
                  <Network className="h-10 w-10 text-black" />
                </div>
                <h3 className="text-lg font-orbitron font-bold text-purple-400 mb-2">
                  AI PROCESSING
                </h3>
                <p className="text-sm text-gray-400">Local & secure</p>
              </motion.div>

              <motion.div
                whileInView={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-yellow-500 rounded-full flex items-center justify-center mb-4 neon-glow">
                  <Zap className="h-10 w-10 text-black" />
                </div>
                <h3 className="text-lg font-orbitron font-bold text-green-400 mb-2">
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
                      style={{ stopColor: "#00ffff", stopOpacity: 0 }}
                    />
                    <stop
                      offset="50%"
                      style={{ stopColor: "#ff00ff", stopOpacity: 1 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: "#ff00ff", stopOpacity: 0 }}
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
                      style={{ stopColor: "#ff00ff", stopOpacity: 0 }}
                    />
                    <stop
                      offset="50%"
                      style={{ stopColor: "#00ff00", stopOpacity: 1 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: "#00ff00", stopOpacity: 0 }}
                    />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
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
            <h2 className="text-4xl md:text-5xl font-orbitron font-bold mb-6 text-red-400">
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
                <Card className="p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-black">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-orbitron font-bold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Statement */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-2xl p-8 border border-purple-500/30 neon-border"
          >
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-yellow-400 neon-glow" />
            <h2 className="text-3xl md:text-4xl font-orbitron font-bold mb-6 text-yellow-400">
              OUR COMMITMENT
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              We're not here to mine your data, sell your information, or
              compromise your privacy.
              <span className="text-cyan-400 font-bold"> chathut </span>
              is built by developers who care about user rights and digital
              freedom.
            </p>
            <p className="text-base text-gray-400 leading-relaxed">
              Our code is open to inspection, our methods are transparent, and
              our commitment to your privacy is absolute. If you have any
              questions about how we handle your data, we're here to answer
              them.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Security;

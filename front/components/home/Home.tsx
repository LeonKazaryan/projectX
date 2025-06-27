import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { Button } from "../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import {
  MessageCircle,
  Zap,
  Bot,
  ArrowRight,
  Brain,
  Shield,
  Sparkles,
  MessageSquare,
  Users,
  Lightbulb,
  ChevronDown,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleTelegramClick = () => {
    navigate("/telegram");
  };

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>

        {/* Dynamic gradient overlay that follows mouse */}
        <div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl transition-all duration-1000 ease-out"
          style={{
            background:
              "radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, rgba(79, 70, 229, 0.3) 50%, transparent 70%)",
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-20">
          {/* Navigation hint */}
          <div
            className={`text-center mb-8 transform transition-all duration-1000 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
              Революционный AI-мессенджер готов к запуску
            </div>
          </div>

          {/* Main Hero Content */}
          <div
            className={`text-center mb-16 transform transition-all duration-1000 delay-300 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            {/* Logo with glowing effect */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-xl opacity-60 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl">
                  <Bot className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Dynamic title with gradient text */}
            <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                AI Smart
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Messenger
              </span>
            </h1>

            {/* Subtitle with typewriter effect */}
            <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed font-light">
              Революционная платформа для{" "}
              <span className="text-purple-300 font-semibold">
                интеллектуального общения
              </span>{" "}
              с
              <span className="text-blue-300 font-semibold">
                {" "}
                AI-поддержкой
              </span>{" "}
              и продвинутой аналитикой переписки
            </p>
          </div>

          {/* CTA Button */}
          <div
            className={`text-center mb-12 transform transition-all duration-1000 delay-500 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <Button
              onClick={handleTelegramClick}
              className="group relative px-8 py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 border-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative flex items-center">
                <MessageCircle className="mr-3 h-6 w-6" />
                Начать с Telegram
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </div>
            </Button>
            <p className="text-white/60 text-sm mt-4">
              <Shield className="inline w-4 h-4 mr-1" />
              Безопасная авторизация через официальный API
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="text-center">
            <button
              onClick={scrollToFeatures}
              className="text-white/60 hover:text-white/80 transition-colors animate-bounce"
            >
              <ChevronDown className="w-8 h-8 mx-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Возможности будущего
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Каждая функция создана для максимального удобства и эффективности
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Feature 1 */}
            <div className="group cursor-pointer">
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-500 hover:transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Умные предложения
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    AI анализирует контекст беседы и предлагает
                    персонализированные ответы, адаптируясь под ваш стиль
                    общения
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group cursor-pointer">
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-blue-400/30 transition-all duration-500 hover:transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Мгновенный доступ
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    Прямое подключение через MTProto API обеспечивает
                    максимальную скорость и полный доступ ко всем функциям
                    Telegram
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group cursor-pointer">
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-green-400/30 transition-all duration-500 hover:transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <Lightbulb className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Аналитика чатов
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    Глубокий анализ переписки, определение тональности и
                    интеллектуальные инсайты для лучшего понимания общения
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <Card className="max-w-4xl mx-auto bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-4">
                Готовы к революции в общении?
              </CardTitle>
              <CardDescription className="text-xl text-white/70">
                Присоединяйтесь к новой эре интеллектуальных мессенджеров
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <Button
                  onClick={handleTelegramClick}
                  size="lg"
                  className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg py-6 px-8 rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <MessageSquare className="mr-3 h-6 w-6" />
                  Войти в Telegram
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="flex items-center text-white/60 text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  Уже используют 10,000+ пользователей
                </div>
              </div>

              {/* Feature badges */}
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {[
                  "🔒 Полная безопасность",
                  "⚡ Мгновенные ответы",
                  "🤖 AI-ассистент",
                  "📊 Аналитика",
                ].map((badge, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-sm border border-white/20"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

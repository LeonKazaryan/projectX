// @ts-nocheck
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import {
  Bot,
  MessageSquare,
  ShieldCheck,
  Zap,
  BarChart,
  Settings,
  Users,
  Star,
  CheckCircle,
  ArrowRight,
  Play,
  Sparkles,
  Brain,
  Heart,
  Trophy,
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const handleNavigateToApp = () => {
    navigate("/telegram");
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
      },
    },
  };

  const floatingVariants = {
    initial: { y: 0 },
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // SVG Illustrations
  const HeroIllustration = () => (
    <svg
      width="400"
      height="300"
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-md"
    >
      {/* Chat bubbles */}
      <circle cx="100" cy="80" r="40" fill="#3B82F6" opacity="0.2" />
      <circle cx="300" cy="120" r="35" fill="#10B981" opacity="0.2" />
      <circle cx="200" cy="200" r="45" fill="#8B5CF6" opacity="0.2" />

      {/* Chat bubble 1 */}
      <rect x="60" y="60" width="80" height="40" rx="20" fill="#3B82F6" />
      <circle cx="75" cy="75" r="3" fill="white" />
      <circle cx="87" cy="75" r="3" fill="white" />
      <circle cx="99" cy="75" r="3" fill="white" />

      {/* Chat bubble 2 */}
      <rect x="260" y="100" width="80" height="40" rx="20" fill="#10B981" />
      <rect x="270" y="110" width="20" height="3" rx="1" fill="white" />
      <rect x="270" y="117" width="30" height="3" rx="1" fill="white" />
      <rect x="270" y="124" width="15" height="3" rx="1" fill="white" />

      {/* AI Brain */}
      <circle cx="200" cy="150" r="50" fill="url(#brainGradient)" />
      <path
        d="M175 140 Q200 120 225 140 Q220 160 200 165 Q180 160 175 140"
        fill="white"
        opacity="0.3"
      />

      {/* Sparkles */}
      <g>
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
        >
          <path
            d="M120 40 L125 50 L135 45 L130 55 L140 60 L130 65 L125 75 L120 65 L110 60 L120 55 L115 45 Z"
            fill="#F59E0B"
          />
        </motion.g>
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >
          <path
            d="M320 200 L323 207 L330 204 L327 211 L334 216 L327 221 L323 228 L320 221 L313 216 L320 211 L317 204 Z"
            fill="#EC4899"
          />
        </motion.g>
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        >
          <path
            d="M80 220 L82 225 L87 223 L85 228 L90 231 L85 234 L82 239 L80 234 L75 231 L80 228 L78 223 Z"
            fill="#8B5CF6"
          />
        </motion.g>
      </g>

      <defs>
        <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );

  const FeatureIllustration = ({ type }: { type: string }) => {
    const illustrations: { [key: string]: JSX.Element } = {
      bot: (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" fill="url(#botGradient)" />
          <circle cx="45" cy="50" r="8" fill="white" />
          <circle cx="75" cy="50" r="8" fill="white" />
          <circle cx="45" cy="50" r="4" fill="#3B82F6" />
          <circle cx="75" cy="50" r="4" fill="#3B82F6" />
          <rect x="50" y="70" width="20" height="8" rx="4" fill="white" />
          <defs>
            <linearGradient
              id="botGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
        </svg>
      ),
      message: (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <rect
            x="20"
            y="40"
            width="80"
            height="60"
            rx="15"
            fill="url(#messageGradient)"
          />
          <rect x="30" y="50" width="40" height="4" rx="2" fill="white" />
          <rect x="30" y="60" width="60" height="4" rx="2" fill="white" />
          <rect x="30" y="70" width="30" height="4" rx="2" fill="white" />
          <circle cx="85" cy="85" r="15" fill="#10B981" />
          <path
            d="M80 85 L84 89 L90 80"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          <defs>
            <linearGradient
              id="messageGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>
      ),
      zap: (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" fill="url(#zapGradient)" />
          <path d="M70 30 L45 65 L55 65 L50 90 L75 55 L65 55 Z" fill="white" />
          <defs>
            <linearGradient
              id="zapGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      ),
      shield: (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <path
            d="M60 20 L40 30 L40 70 Q40 90 60 100 Q80 90 80 70 L80 30 Z"
            fill="url(#shieldGradient)"
          />
          <path
            d="M50 60 L57 67 L75 45"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
          <defs>
            <linearGradient
              id="shieldGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
          </defs>
        </svg>
      ),
    };

    return illustrations[type] || illustrations.bot;
  };

  const features = [
    {
      icon: <FeatureIllustration type="bot" />,
      title: "Реалистичность",
      description:
        "ИИ подстраивается под твой стиль — короткие, саркастичные или формальные ответы.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: <FeatureIllustration type="message" />,
      title: "Мультимессенджер",
      description:
        "Работает с Telegram, WhatsApp, Discord и другими популярными платформами.",
      color: "from-green-500 to-green-600",
    },
    {
      icon: <FeatureIllustration type="zap" />,
      title: "Контекстный анализ",
      description:
        "Учитывает историю чатов для точных и релевантных предложений.",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: <FeatureIllustration type="shield" />,
      title: "Конфиденциальность",
      description:
        "Твои данные защищены. Мы работаем только с твоего согласия.",
      color: "from-red-500 to-red-600",
    },
  ];

  const howItWorksSteps = [
    {
      icon: <Users className="w-12 h-12 text-white" />,
      title: "Подключи мессенджер",
      description: "Быстрая и безопасная авторизация в один клик.",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: <Brain className="w-12 h-12 text-white" />,
      title: "ИИ изучает твой стиль",
      description: "Анализ происходит локально, уважая твою приватность.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: <Sparkles className="w-12 h-12 text-white" />,
      title: "Получай предложения",
      description: "Принимай, редактируй или игнорируй предложенные ответы.",
      color: "from-green-500 to-green-600",
    },
  ];

  const testimonials = [
    {
      quote: "Это как мой клон в чате! Экономит мне кучу времени. 😎",
      name: "Дима, 25",
      handle: "Продакт-менеджер",
      avatar: "🚀",
      rating: 5,
    },
    {
      quote:
        "Наконец-то AI, который не звучит как робот. Маст-хэв для интровертов.",
      name: "Анна, 29",
      handle: "Разработчик",
      avatar: "💻",
      rating: 5,
    },
    {
      quote:
        "Я использую его для рабочих чатов. Мои ответы стали более четкими и профессиональными.",
      name: "Сергей, 34",
      handle: "Тимлид",
      avatar: "👨‍💼",
      rating: 5,
    },
  ];

  const stats = [
    {
      number: "10K+",
      label: "Активных пользователей",
      icon: <Users className="w-8 h-8" />,
    },
    {
      number: "1M+",
      label: "Сообщений обработано",
      icon: <MessageSquare className="w-8 h-8" />,
    },
    {
      number: "95%",
      label: "Точность предложений",
      icon: <Trophy className="w-8 h-8" />,
    },
    { number: "24/7", label: "Поддержка", icon: <Heart className="w-8 h-8" /> },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 text-slate-800 font-sans overflow-hidden">
      {/* Hero Section */}
      <motion.section
        className="min-h-screen flex items-center justify-center relative px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400 to-blue-500 rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
              variants={itemVariants}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Новая эра общения с ИИ
            </motion.div>

            <motion.h1
              className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-tight"
              variants={itemVariants}
            >
              Чат, как ты. <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                ИИ, который звучит по-человечески.
              </span>
            </motion.h1>

            <motion.p
              className="mt-6 text-xl text-slate-600 max-w-2xl"
              variants={itemVariants}
            >
              Наш ИИ-ассистент анализирует твои чаты и предлагает ответы в твоем
              стиле — для Telegram, WhatsApp и не только. Общайся естественно,
              экономя время.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={handleNavigateToApp}
              >
                <Play className="w-5 h-5 mr-2" />
                Попробовать бесплатно
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 text-lg px-8 py-6 rounded-full"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Посмотреть демо
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex items-center justify-center lg:justify-start space-x-4 text-sm text-slate-500"
            >
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                Бесплатный тариф
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                Без подписки
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                Защита данных
              </div>
            </motion.div>
          </div>

          <motion.div
            className="flex justify-center lg:justify-end"
            variants={floatingVariants}
            initial="initial"
            animate="animate"
          >
            <HeroIllustration />
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        className="py-16 bg-white/50 backdrop-blur-sm"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {stat.number}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-20 sm:py-32 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Почему выбирают нас?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Мы создали самый продвинутый ИИ-ассистент для общения, который
              понимает контекст и подстраивается под твой уникальный стиль.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 h-full group hover:-translate-y-2">
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        className="py-20 sm:py-32 px-4 bg-gradient-to-br from-slate-100 to-blue-100"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Как это работает?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Всего три простых шага, чтобы начать общаться с ИИ, который
              понимает тебя лучше всех.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="relative"
              >
                <div className="text-center">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${step.color} rounded-full mb-6 shadow-lg`}
                  >
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full">
                    <ArrowRight className="w-8 h-8 text-slate-400 mx-auto" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section
        className="py-20 sm:py-32 px-4 bg-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Что говорят пользователи
            </h2>
            <p className="text-xl text-slate-600">
              Тысячи людей уже используют наш ИИ-ассистент каждый день
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-xl h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>
                    <blockquote className="text-lg text-slate-700 mb-6 italic">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl mr-4">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {testimonial.name}
                        </div>
                        <div className="text-slate-600 text-sm">
                          {testimonial.handle}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Готов к будущему общения?
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-xl mb-10 opacity-90"
          >
            Присоединяйся к тысячам пользователей, которые уже экономят время с
            нашим ИИ-ассистентом
          </motion.p>
          <motion.div variants={itemVariants}>
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              onClick={handleNavigateToApp}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Начать бесплатно
            </Button>
          </motion.div>
          <motion.p variants={itemVariants} className="mt-6 text-sm opacity-75">
            Никаких обязательств • Отмена в любое время • Поддержка 24/7
          </motion.p>
        </div>
      </motion.section>
    </div>
  );
};

export default LandingPage;

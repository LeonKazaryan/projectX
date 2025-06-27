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
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const handleNavigateToApp = () => {
    navigate("/telegram");
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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  const features = [
    {
      icon: <Bot className="w-8 h-8 text-blue-500" />,
      title: "Реалистичность",
      description:
        "ИИ подстраивается под твой стиль — короткие, саркастичные или формальные ответы.",
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-blue-500" />,
      title: "Мультимессенджер",
      description:
        "Работает с Telegram, WhatsApp, Discord и другими популярными платформами.",
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      title: "Контекстный анализ",
      description:
        "Учитывает историю чатов для точных и релевантных предложений.",
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-blue-500" />,
      title: "Конфиденциальность",
      description:
        "Твои данные защищены. Мы работаем только с твоего согласия.",
    },
  ];

  const howItWorksSteps = [
    {
      icon: <Users className="w-10 h-10 text-blue-500" />,
      title: "Подключи мессенджер",
      description: "Быстрая и безопасная авторизация в один клик.",
    },
    {
      icon: <BarChart className="w-10 h-10 text-blue-500" />,
      title: "ИИ изучает твой стиль",
      description: "Анализ происходит локально, уважая твою приватность.",
    },
    {
      icon: <Settings className="w-10 h-10 text-blue-500" />,
      title: "Получай предложения",
      description: "Принимай, редактируй или игнорируй предложенные ответы.",
    },
  ];

  const testimonials = [
    {
      quote: "Это как мой клон в чате! Экономит мне кучу времени. 😎",
      name: "Дима, 25",
      handle: "Продакт-менеджер",
    },
    {
      quote:
        "Наконец-то AI, который не звучит как робот. Маст-хэв для интровертов.",
      name: "Анна, 29",
      handle: "Разработчик",
    },
    {
      quote:
        "Я использую его для рабочих чатов. Мои ответы стали более четкими и профессиональными.",
      name: "Сергей, 34",
      handle: "Тимлид",
    },
  ];

  return (
    <div className="bg-zinc-100 text-zinc-800 font-sans">
      {/* Hero Section */}
      <motion.section
        className="min-h-screen flex items-center justify-center text-center px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-3xl">
          <motion.h1
            className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900"
            variants={itemVariants}
          >
            Чат, как ты. <br />
            <span className="text-blue-600">
              ИИ, который звучит по-человечески.
            </span>
          </motion.h1>
          <motion.p
            className="mt-6 text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto"
            variants={itemVariants}
          >
            Наш ИИ-ассистент анализирует твои чаты и предлагает ответы в твоем
            стиле — для Telegram, WhatsApp и не только.
          </motion.p>
          <motion.div variants={itemVariants} className="mt-10">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-zinc-50 text-lg px-8 py-6 rounded-full"
              onClick={handleNavigateToApp}
            >
              Попробовать бесплатно
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-20 sm:py-32 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="bg-zinc-50 border-zinc-300 hover:bg-white hover:shadow-xl transition-all duration-300 h-full">
                  <CardHeader>
                    {feature.icon}
                    <CardTitle className="mt-4 text-xl font-semibold text-zinc-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        className="py-20 sm:py-32 px-4 bg-zinc-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold text-zinc-900"
          >
            Как это работает?
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-4 text-lg text-zinc-600"
          >
            Всего три простых шага, чтобы начать.
          </motion.p>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex flex-col items-center"
              >
                <div className="bg-white p-6 rounded-full shadow-lg">
                  {step.icon}
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-zinc-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-zinc-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section
        className="py-20 sm:py-32 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold text-zinc-900"
          >
            Что говорят наши пользователи
          </motion.h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="bg-zinc-50 border-zinc-300 h-full flex flex-col justify-between p-6">
                  <CardContent className="p-0">
                    <p className="text-lg text-zinc-800 italic">
                      "{testimonial.quote}"
                    </p>
                  </CardContent>
                  <div className="mt-4 text-right">
                    <p className="font-bold text-zinc-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {testimonial.handle}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-20 sm:py-32 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
      >
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-10 rounded-2xl shadow-lg">
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold text-zinc-900"
          >
            Готов общаться как профи?
          </motion.h2>
          <motion.div variants={itemVariants} className="mt-8">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-zinc-50 text-lg px-8 py-6 rounded-full shadow-lg"
              onClick={handleNavigateToApp}
            >
              Начать сейчас
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-100 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <p>
            &copy; {new Date().getFullYear()} AI Messenger. Все права защищены.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-blue-500 transition-colors">
              О нас
            </a>
            <a href="#" className="hover:text-blue-500 transition-colors">
              Политика конфиденциальности
            </a>
            <a href="#" className="hover:text-blue-500 transition-colors">
              Контакты
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

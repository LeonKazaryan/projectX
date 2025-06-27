import { useNavigate } from "react-router-dom";
import { Button } from "../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import { MessageCircle, Zap, Bot, ArrowRight } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const handleTelegramClick = () => {
    navigate("/telegram");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            AI Smart Messenger
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Современный AI-клиент для мессенджеров с умными предложениями
            ответов и интеллектуальной поддержкой переписки
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center border-2 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle>Умные ответы</CardTitle>
              <CardDescription>
                AI анализирует контекст и предлагает релевантные ответы
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-2 hover:border-green-300 dark:hover:border-green-600 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle>Быстрый доступ</CardTitle>
              <CardDescription>
                Полный доступ к чатам через MTProto API
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-2 hover:border-purple-300 dark:hover:border-purple-600 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <CardTitle>AI-ассистент</CardTitle>
              <CardDescription>
                Настраиваемый AI для анализа переписки
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="max-w-2xl mx-auto text-center shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Готовы начать?</CardTitle>
            <CardDescription className="text-lg">
              Подключитесь к Telegram и испытайте возможности AI-ассистента
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleTelegramClick}
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Войти в Telegram
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Безопасная авторизация через официальный Telegram API
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

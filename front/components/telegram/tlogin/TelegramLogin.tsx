import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

interface TelegramLoginProps {
  onAuth: (user: any) => void;
}

const TelegramLogin: React.FC<TelegramLoginProps> = ({ onAuth }) => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = useCallback(async () => {
    if (!phone) {
      setError("Пожалуйста, введите номер телефона.");
      return;
    }
    setLoading(true);
    setError("");

    // This is a mock login flow.
    // In a real application, you would make a request to your backend here
    // to send a confirmation code to the user's Telegram account.
    console.log(`Initiating login for phone: ${phone}`);

    setTimeout(() => {
      const mockUser = {
        id: 12345,
        first_name: "Demo",
        last_name: "User",
        username: "demouser",
      };
      onAuth(mockUser);
      setLoading(false);
    }, 2000);
  }, [phone, onAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Вход в Telegram</CardTitle>
          <CardDescription>
            Введите ваш номер телефона для авторизации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="+7 (999) 999-99-99"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPhone(e.target.value)
              }
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-destructive-foreground bg-destructive p-2 rounded-md">
                {error}
              </p>
            )}
            <Button onClick={handleLogin} className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Отправка..." : "Получить код"}
            </Button>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            <span>Ваши данные надежно защищены</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramLogin;

import React, { useState } from "react";
import { Button } from "../../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../src/components/ui/card";
import { MessageCircle } from "lucide-react";

interface WhatsAppAuthProps {
  onConnect: () => void;
  onError: (error: string) => void;
}

const WhatsAppAuth: React.FC<WhatsAppAuthProps> = ({ onConnect, onError }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } catch (error) {
      onError(error as string);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-xl">Подключение к WhatsApp</CardTitle>
        <CardDescription>
          Подключитесь к WhatsApp Web для использования мессенджера
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Для подключения к WhatsApp Web:</p>
            <ol className="mt-2 space-y-1 text-left">
              <li>1. Откройте WhatsApp на телефоне</li>
              <li>2. Перейдите в Настройки → Устройства</li>
              <li>3. Нажмите "Подключить устройство"</li>
              <li>4. Отсканируйте QR-код, который появится</li>
            </ol>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Подключение...
              </>
            ) : (
              "Подключиться к WhatsApp"
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            После подключения вы сможете отправлять и получать сообщения
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppAuth;

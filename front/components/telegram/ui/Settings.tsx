import React, { useState } from "react";
import AISettingsModal from "./AISettingsModal";
import { Button } from "../../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../src/components/ui/card";
import { Separator } from "../../../src/components/ui/separator";
import { Switch } from "../../../src/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../src/components/ui/dialog";
import {
  Settings as SettingsIcon,
  FolderArchive,
  MessageSquare,
  Users,
  Bot,
  Info,
  Database,
  Download,
} from "lucide-react";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  includeArchived: boolean;
  includeReadonly: boolean;
  includeGroups: boolean;
  onToggleArchived: () => void;
  onToggleReadonly: () => void;
  onToggleGroups: () => void;
  sessionId?: string;
  onAISettingsChange?: () => void;
  onSync?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  includeArchived,
  includeReadonly,
  includeGroups,
  onToggleArchived,
  onToggleReadonly,
  onToggleGroups,
  sessionId,
  onAISettingsChange,
  onSync,
}) => {
  const [showAISettings, setShowAISettings] = useState(false);
  const [ragSyncLoading, setRagSyncLoading] = useState(false);
  const [ragStats, setRagStats] = useState<any>(null);

  const API_BASE = "http://localhost:8000";

  // Load RAG stats when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      loadRagStats();
    }
  }, [isOpen]);

  const loadRagStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rag/stats`);
      const data = await response.json();
      if (data.success) {
        setRagStats(data);
      }
    } catch (error) {
      console.error("Error loading RAG stats:", error);
    }
  };

  const syncAllChatHistory = async () => {
    if (!sessionId) return;

    try {
      setRagSyncLoading(true);
      const response = await fetch(
        `${API_BASE}/api/rag/sync-telegram-history`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            message_limit: 1000,
            force_resync: false,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        alert(
          "🚀 Начата синхронизация истории чатов с RAG системой! Это может занять несколько минут."
        );

        // Reload stats after starting sync
        setTimeout(() => {
          loadRagStats();
          if (onSync) {
            onSync();
          }
        }, 5000);
      } else {
        alert(`Ошибка синхронизации: ${data.error || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Error syncing chat history:", error);
      alert("Ошибка соединения с сервером");
    } finally {
      setRagSyncLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Настройки
          </DialogTitle>
          <DialogDescription>
            Настройте фильтрацию чатов и AI-помощника
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderArchive className="h-5 w-5" />
                Фильтрация чатов
              </CardTitle>
              <CardDescription>
                Настройте, какие чаты отображаются в списке
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Показывать архивные чаты
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Включить архивированные чаты в список
                  </div>
                </div>
                <Switch
                  checked={includeArchived}
                  onCheckedChange={onToggleArchived}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Показывать каналы только для чтения
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Включить каналы, где нельзя отправлять сообщения
                  </div>
                </div>
                <Switch
                  checked={includeReadonly}
                  onCheckedChange={onToggleReadonly}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Показывать групповые чаты
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Включить групповые чаты в список
                  </div>
                </div>
                <Switch
                  checked={includeGroups}
                  onCheckedChange={onToggleGroups}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5" />
                AI-помощник
              </CardTitle>
              <CardDescription>
                Настройте умного помощника для ответов на сообщения
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Конфигурация AI</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Настроить предложения умных ответов
                  </div>
                </div>
                <Button
                  onClick={() => setShowAISettings(true)}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  <Bot className="mr-2 h-4 w-4" />
                  Настроить AI
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                RAG Система
              </CardTitle>
              <CardDescription>
                Управление базой знаний для улучшения AI предложений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ragStats && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Статистика базы данных:
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <div className="font-medium">Сообщения</div>
                      <div className="text-green-600 dark:text-green-400">
                        {ragStats.collections?.secure_telegram_messages
                          ?.points_count || 0}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <div className="font-medium">Беседы</div>
                      <div className="text-blue-600 dark:text-blue-400">
                        {ragStats.collections?.conversation_messages
                          ?.points_count || 0}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    OpenAI:{" "}
                    {ragStats.openai_available
                      ? "✅ Подключен"
                      : "❌ Недоступен"}
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Синхронизировать всю историю
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Загрузить до 1000 сообщений из каждого чата в RAG
                  </div>
                </div>
                <Button
                  onClick={syncAllChatHistory}
                  disabled={!sessionId || ragSyncLoading}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {ragSyncLoading ? "Синхронизация..." : "Синхронизировать"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5" />
                Информация
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Настройки автоматически сохраняются и применяются к списку
                чатов. Изменения вступают в силу немедленно.
              </p>
            </CardContent>
          </Card>
        </div>

        {sessionId && (
          <AISettingsModal
            isOpen={showAISettings}
            onClose={() => {
              setShowAISettings(false);
              // Notify parent that AI settings have changed
              if (onAISettingsChange) {
                onAISettingsChange();
              }
            }}
            sessionId={sessionId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Settings;

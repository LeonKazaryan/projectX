import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../src/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../src/components/ui/tabs";
import { Button } from "../../../src/components/ui/button";
import { Switch } from "../../../src/components/ui/switch";
import { Label } from "../../../src/components/ui/label";
import { Separator } from "../../../src/components/ui/separator";
import { Slider } from "../../../src/components/ui/slider";
import {
  Settings as SettingsIcon,
  Bot,
  FolderArchive,
  Database,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../services/authService";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// A simple hook to manage a specific setting
const useSetting = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  // We can fetch these from backend if they become more complex
  const [includeArchived, setIncludeArchived] = useSetting(
    "telegram_include_archived",
    false
  );
  const [includeReadonly, setIncludeReadonly] = useSetting(
    "telegram_include_readonly",
    false
  );
  const [includeGroups, setIncludeGroups] = useSetting(
    "telegram_include_groups",
    true
  );

  // AI Settings would be fetched from the backend
  const [aiEnabled, setAiEnabled] = useState(true);
  const [suggestionDelay, setSuggestionDelay] = useState([1.0]);

  // RAG State
  const [ragStats, setRagStats] = useState<any>(null);
  const [ragSyncLoading, setRagSyncLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  const loadRagStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rag/stats`);
      const data = await response.json();
      if (data.success) setRagStats(data);
      else setRagError(data.error || "Failed to load RAG stats.");
    } catch (error) {
      setRagError("Server connection error while loading RAG stats.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRagStats();
    }
  }, [isOpen]);

  const handleSync = async () => {
    setRagSyncLoading(true);
    setRagError(null);
    try {
      // Sync logic...
    } catch (error) {
      setRagError("Server connection error during sync.");
    } finally {
      setRagSyncLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Настройки
          </DialogTitle>
          <DialogDescription>
            Управляйте вашим приложением, фильтрами и AI-помощником.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="filters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filters">
              <FolderArchive className="h-4 w-4 mr-2" />
              Фильтры
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Bot className="h-4 w-4 mr-2" />
              AI-помощник
            </TabsTrigger>
            <TabsTrigger value="rag">
              <Database className="h-4 w-4 mr-2" />
              База знаний
            </TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="mt-4">
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="archive-filter" className="cursor-pointer">
                  Показывать архивные чаты
                </Label>
                <Switch
                  id="archive-filter"
                  checked={includeArchived}
                  onCheckedChange={setIncludeArchived}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="readonly-filter" className="cursor-pointer">
                  Показывать каналы (только чтение)
                </Label>
                <Switch
                  id="readonly-filter"
                  checked={includeReadonly}
                  onCheckedChange={setIncludeReadonly}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="groups-filter" className="cursor-pointer">
                  Показывать групповые чаты
                </Label>
                <Switch
                  id="groups-filter"
                  checked={includeGroups}
                  onCheckedChange={setIncludeGroups}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-enabled">Включить AI-помощника</Label>
                <Switch
                  id="ai-enabled"
                  checked={aiEnabled}
                  onCheckedChange={setAiEnabled}
                />
              </div>
              <Separator />
              <div className="space-y-3">
                <Label htmlFor="ai-delay">
                  Задержка ответа AI ({suggestionDelay[0].toFixed(1)} сек)
                </Label>
                <Slider
                  id="ai-delay"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={suggestionDelay}
                  onValueChange={setSuggestionDelay}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rag" className="mt-4">
            <div className="space-y-4 p-2">
              {ragError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <p>{ragError}</p>
                </div>
              )}
              {ragStats ? (
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>
                    <strong>Всего документов:</strong>{" "}
                    {ragStats.total_documents}
                  </p>
                  <p>
                    <strong>Векторов в базе:</strong> {ragStats.total_vectors}
                  </p>
                  <p>
                    <strong>Последняя синхронизация:</strong>{" "}
                    {ragStats.last_sync_time || "N/A"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Загрузка статистики...
                </p>
              )}
              <Button
                onClick={handleSync}
                disabled={ragSyncLoading}
                className="w-full"
              >
                {ragSyncLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {ragSyncLoading
                  ? "Синхронизация..."
                  : "Синхронизировать историю чатов"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

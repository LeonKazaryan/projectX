import React, { useState, useEffect } from "react";
import { Button } from "../../../src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../src/components/ui/dialog";
import { Switch } from "../../../src/components/ui/switch";
import { Slider } from "../../../src/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../src/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../src/components/ui/card";
import { Badge } from "../../../src/components/ui/badge";
import { Separator } from "../../../src/components/ui/separator";
import { Loader2, Bot, Brain, Clock, Shield, Info, Save } from "lucide-react";
import { API_BASE_URL } from "../../services/authService";

interface AISettings {
  enabled: boolean;
  memory_limit: number;
  suggestion_delay: number;
  continuous_suggestions: boolean;
  proactive_suggestions: boolean;
  auto_suggest_on_incoming: boolean;
}

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

const MEMORY_OPTIONS = [
  { value: 5, label: "5 messages", description: "Fast & Cheap" },
  { value: 10, label: "10 messages", description: "Balanced" },
  { value: 20, label: "20 messages", description: "Good Context" },
  { value: 30, label: "30 messages", description: "Best Context" },
];

const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  sessionId,
}) => {
  const [settings, setSettings] = useState<AISettings>({
    enabled: true,
    memory_limit: 20,
    suggestion_delay: 1.0,
    continuous_suggestions: true,
    proactive_suggestions: true,
    auto_suggest_on_incoming: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && sessionId) {
      loadSettings();
    }
  }, [isOpen, sessionId]);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/ai/settings?session_id=${sessionId}`
      );
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
      } else {
        setError(data.error || "Failed to load AI settings");
      }
    } catch (error) {
      setError("Failed to connect to AI service");
      console.error("Load settings error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/ai/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          settings: settings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onClose(); // Close modal on successful save
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (error) {
      setError("Failed to save AI settings");
      console.error("Save settings error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEnabledChange = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      enabled: enabled,
    }));
  };

  const handleMemoryLimitChange = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      memory_limit: parseInt(value),
    }));
  };

  const handleDelayChange = (value: number[]) => {
    setSettings((prev) => ({
      ...prev,
      suggestion_delay: value[0],
    }));
  };

  const handleContinuousChange = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      continuous_suggestions: enabled,
    }));
  };

  const handleProactiveChange = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      proactive_suggestions: enabled,
    }));
  };

  const handleAutoSuggestChange = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      auto_suggest_on_incoming: enabled,
    }));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI assistant for smart message suggestions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Loading AI settings...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Main AI Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5" />
                  AI Suggestions
                </CardTitle>
                <CardDescription>
                  Enable smart message suggestions powered by AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">
                      {settings.enabled ? "AI Enabled" : "AI Disabled"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {settings.enabled
                        ? "AI will suggest responses based on your conversation"
                        : "AI suggestions are turned off"}
                    </div>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={handleEnabledChange}
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Mode Settings - only show when AI is enabled */}
            {settings.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5" />
                    AI Suggestion Mode
                  </CardTitle>
                  <CardDescription>
                    Choose how AI provides suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Automatic suggestions on incoming messages */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        Automatic Suggestions
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Auto-suggest responses when you receive messages
                      </div>
                    </div>
                    <Switch
                      checked={settings.auto_suggest_on_incoming}
                      onCheckedChange={handleAutoSuggestChange}
                    />
                  </div>

                  <Separator />

                  {/* Continuous Suggestions */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        Manual Mode Fallback
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Allow manual suggestions even when automatic is off
                      </div>
                    </div>
                    <Switch
                      checked={settings.continuous_suggestions}
                      onCheckedChange={handleContinuousChange}
                    />
                  </div>

                  <Separator />

                  {/* Proactive Suggestions */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        Proactive Suggestions
                      </div>
                      <div className="text-sm text-muted-foreground">
                        AI suggests conversation starters and follow-ups
                      </div>
                    </div>
                    <Switch
                      checked={settings.proactive_suggestions}
                      onCheckedChange={handleProactiveChange}
                    />
                  </div>

                  {/* Info about how these work */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          AI Suggestion Modes
                        </p>
                        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                          <li>
                            • <strong>Automatic:</strong> AI suggests responses
                            when you receive messages
                          </li>
                          <li>
                            • <strong>Manual Only:</strong> Use the robot button
                            (🤖) to request suggestions
                          </li>
                          <li>
                            • <strong>AI Disabled:</strong> No AI features -
                            just normal chat
                          </li>
                          <li>
                            • <strong>Your Choice:</strong> Switch between modes
                            anytime
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Memory Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5" />
                  Context Memory
                </CardTitle>
                <CardDescription>
                  How many messages AI remembers for context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Select
                    value={settings.memory_limit.toString()}
                    onValueChange={handleMemoryLimitChange}
                    disabled={!settings.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select memory limit" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMORY_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{option.label}</span>
                            <Badge variant="outline" className="ml-2">
                              {option.description}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  More messages = better context but slower responses
                </div>
              </CardContent>
            </Card>

            {/* Response Speed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Response Speed
                </CardTitle>
                <CardDescription>
                  Delay before showing suggestions: {settings.suggestion_delay}s
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Slider
                    value={[settings.suggestion_delay]}
                    onValueChange={handleDelayChange}
                    max={5}
                    min={0}
                    step={0.5}
                    disabled={!settings.enabled}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Fast (0s)</span>
                    <span>Balanced (2.5s)</span>
                    <span>Slow (5s)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How it Works */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" />
                  How AI Suggestions Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">🧠</span>
                    <span>
                      Analyzes your writing style from previous messages
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">💬</span>
                    <span>
                      Suggests responses that match your communication patterns
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">📚</span>
                    <span>
                      Uses conversation context for relevant suggestions
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">⌨️</span>
                    <span>Click suggestions to use them in your message</span>
                  </li>
                </ul>

                <Separator />

                <div className="flex items-start gap-2 text-sm">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-700 dark:text-blue-300">
                      Privacy
                    </div>
                    <div className="text-blue-600 dark:text-blue-400">
                      Messages are processed by OpenAI's API for generating
                      suggestions. No messages are permanently stored by the AI
                      service.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AISettingsModal;

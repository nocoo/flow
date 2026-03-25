import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/hooks/use-settings";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, Settings } from "lucide-react";
import { fetchModels, type Settings as SettingsType } from "@/lib/api";

/** Dropdown that fetches available models from the provider */
function ModelSelect({
  provider,
  value,
  onChange,
  baseURL,
}: {
  provider: "local" | "cloud";
  value: string;
  onChange: (v: string) => void;
  baseURL: string;
}) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    if (!baseURL) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchModels(provider);
      setModels(list);
      if (list.length === 0) setError("No models found");
    } catch {
      setError("Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [provider, baseURL]);

  // Auto-load models on mount and when baseURL changes
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <select
          value={models.includes(value) ? value : "__custom__"}
          onChange={(e) => {
            if (e.target.value !== "__custom__") {
              onChange(e.target.value);
            }
          }}
          disabled={loading || models.length === 0}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {models.length === 0 && !loading && (
            <option value="__custom__">
              {error || "Enter model ID manually"}
            </option>
          )}
          {models.length > 0 && !models.includes(value) && (
            <option value="__custom__">{value || "Select a model..."}</option>
          )}
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 size-9"
          onClick={loadModels}
          disabled={loading}
          title="Refresh models"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </Button>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or type model ID..."
        className="font-mono text-xs"
      />
    </div>
  );
}

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { settings, loading, save } = useSettings();
  const [form, setForm] = useState<SettingsType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLocalKey, setShowLocalKey] = useState(false);
  const [showCloudKey, setShowCloudKey] = useState(false);

  // Sync form state when settings load or sheet opens
  useEffect(() => {
    if (settings && open) {
      setForm(structuredClone(settings));
      setShowLocalKey(false);
      setShowCloudKey(false);
    }
  }, [settings, open]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await save(form);
      onOpenChange(false);
    } catch {
      // error handled by context
    } finally {
      setSaving(false);
    }
  };

  const updateLocal = (field: string, value: string) => {
    setForm((prev) =>
      prev ? { ...prev, local: { ...prev.local, [field]: value } } : prev,
    );
  };

  const updateCloud = (field: string, value: string) => {
    setForm((prev) =>
      prev ? { ...prev, cloud: { ...prev.cloud, [field]: value } } : prev,
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Configure model provider and API settings.
          </SheetDescription>
        </SheetHeader>

        {loading || !form ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Provider Toggle */}
            <div className="space-y-2">
              <Label>Active Provider</Label>
              <div className="flex gap-2">
                <Button
                  variant={form.activeProvider === "local" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setForm({ ...form, activeProvider: "local" })}
                >
                  Local
                </Button>
                <Button
                  variant={form.activeProvider === "cloud" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setForm({ ...form, activeProvider: "cloud" })}
                >
                  Cloud
                </Button>
              </div>
            </div>

            <Separator />

            {/* Local Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Local Configuration</h3>
              <div className="space-y-2">
                <Label htmlFor="local-url">Base URL</Label>
                <Input
                  id="local-url"
                  value={form.local.baseURL}
                  onChange={(e) => updateLocal("baseURL", e.target.value)}
                  placeholder="http://localhost:8000/v1"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="local-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="local-key"
                    type={showLocalKey ? "text" : "password"}
                    value={form.local.apiKey}
                    onChange={(e) => updateLocal("apiKey", e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLocalKey(!showLocalKey)}
                    className="shrink-0 text-xs"
                  >
                    {showLocalKey ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Model ID</Label>
                <ModelSelect
                  provider="local"
                  value={form.local.modelId}
                  onChange={(v) => updateLocal("modelId", v)}
                  baseURL={form.local.baseURL}
                />
              </div>
            </div>

            <Separator />

            {/* Cloud Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Cloud Configuration</h3>
              <div className="space-y-2">
                <Label htmlFor="cloud-url">Base URL</Label>
                <Input
                  id="cloud-url"
                  value={form.cloud.baseURL}
                  onChange={(e) => updateCloud("baseURL", e.target.value)}
                  placeholder="https://aihubmix.com/v1"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cloud-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="cloud-key"
                    type={showCloudKey ? "text" : "password"}
                    value={form.cloud.apiKey}
                    onChange={(e) => updateCloud("apiKey", e.target.value)}
                    placeholder="sk-..."
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCloudKey(!showCloudKey)}
                    className="shrink-0 text-xs"
                  >
                    {showCloudKey ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Model ID</Label>
                <ModelSelect
                  provider="cloud"
                  value={form.cloud.modelId}
                  onChange={(v) => updateCloud("modelId", v)}
                  baseURL={form.cloud.baseURL}
                />
              </div>
            </div>

            <Separator />

            {/* Save */}
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

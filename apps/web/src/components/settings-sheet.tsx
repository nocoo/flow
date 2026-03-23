import { useState, useEffect } from "react";
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
import { Loader2, Settings } from "lucide-react";
import type { Settings as SettingsType } from "@/lib/api";

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
                <Label htmlFor="local-model">Model ID</Label>
                <Input
                  id="local-model"
                  value={form.local.modelId}
                  onChange={(e) => updateLocal("modelId", e.target.value)}
                  placeholder="Qwen3.5-2B-6bit"
                  className="font-mono text-xs"
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
                <Label htmlFor="cloud-model">Model ID</Label>
                <Input
                  id="cloud-model"
                  value={form.cloud.modelId}
                  onChange={(e) => updateCloud("modelId", e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="font-mono text-xs"
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

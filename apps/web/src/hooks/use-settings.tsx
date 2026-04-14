import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { fetchSettings, saveSettings, type Settings, type DeepPartial } from "@/lib/api";

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  save: (data: DeepPartial<Settings>) => Promise<void>;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (data: DeepPartial<Settings>) => {
    try {
      setError(null);
      const updated = await saveSettings(data);
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      throw err;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, save, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

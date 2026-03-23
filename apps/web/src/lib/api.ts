export interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  modelId: string;
}

export interface Settings {
  activeProvider: "local" | "cloud";
  local: ProviderConfig;
  cloud: ProviderConfig;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const API_BASE = "https://flow-api.dev.hexly.ai";

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
  return res.json();
}

export async function saveSettings(data: DeepPartial<Settings>): Promise<Settings> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save settings: ${res.status}`);
  return res.json();
}

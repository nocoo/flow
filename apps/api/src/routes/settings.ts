import { Hono } from "hono";
import { getSettings, updateSettings, maskSettings } from "../db";
import type { DeepPartial, Settings } from "../types";

export const settingsRouter = new Hono();

settingsRouter.get("/api/settings", (c) => {
  const settings = getSettings();
  return c.json(maskSettings(settings));
});

settingsRouter.put("/api/settings", async (c) => {
  const body = (await c.req.json()) as DeepPartial<Settings>;
  const updated = updateSettings(body);
  return c.json(maskSettings(updated));
});

/** Proxy /v1/models from the specified (or active) provider */
settingsRouter.get("/api/models", async (c) => {
  const settings = getSettings();
  const providerKey = (c.req.query("provider") as "local" | "cloud") || settings.activeProvider;
  const config = settings[providerKey];

  if (!config?.baseURL) {
    return c.json({ models: [], error: "No base URL configured" }, 400);
  }

  try {
    const url = `${config.baseURL.replace(/\/$/, "")}/models`;
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      return c.json(
        { models: [], error: `Provider returned ${res.status}` },
        502,
      );
    }

    const body = (await res.json()) as { data?: { id: string }[] };
    const models = (body.data || []).map((m) => m.id).sort();
    return c.json({ models });
  } catch (err) {
    return c.json(
      { models: [], error: err instanceof Error ? err.message : "Unknown error" },
      502,
    );
  }
});

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

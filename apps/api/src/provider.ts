import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getSettings } from "./db";

export function getActiveProvider() {
  const settings = getSettings();
  const config = settings[settings.activeProvider];

  const provider = createOpenAICompatible({
    name: settings.activeProvider,
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  return {
    model: provider(config.modelId),
    modelId: config.modelId,
    providerName: settings.activeProvider,
  };
}

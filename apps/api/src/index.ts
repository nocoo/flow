import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { segmentPinyin } from "./pinyin-segmenter";

const MODEL_ID = "Qwen3.5-2B-6bit";

const omlx = createOpenAICompatible({
  name: "omlx",
  baseURL: "http://localhost:8000/v1",
  apiKey: process.env.OMLX_API_KEY ?? "",
});

const PINYIN_SYSTEM_PROMPT = `Convert pinyin syllables to Chinese characters. Output ONLY the Chinese characters.`;

const app = new Hono();

app.use("/api/*", cors());

app.get("/", (c) => c.json({ status: "ok", name: "flow-api" }));

app.post("/api/chat", async (c) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json();

  const result = streamText({
    model: omlx(MODEL_ID),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
});

app.post("/api/pinyin", async (c) => {
  const { text }: { text: string } = await c.req.json();

  if (!text?.trim()) {
    return c.json({ result: "" });
  }

  const segmented = segmentPinyin(text);

  const result = streamText({
    model: omlx(MODEL_ID),
    system: PINYIN_SYSTEM_PROMPT,
    prompt: segmented,
    maxTokens: 200,
    temperature: 0,
  });

  return result.toTextStreamResponse();
});

export default {
  port: 7045,
  fetch: app.fetch,
};

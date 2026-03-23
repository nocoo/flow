import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const MODEL_ID = "Qwen3.5-2B-6bit";

const omlx = createOpenAICompatible({
  name: "omlx",
  baseURL: "http://localhost:8000/v1",
  apiKey: process.env.OMLX_API_KEY ?? "",
});

const PINYIN_SYSTEM_PROMPT = `You are a Chinese pinyin input method. Convert continuous pinyin (no spaces, no tones) into Chinese characters.

RULES:
1. Segment the continuous pinyin into valid syllables, then convert each syllable to one Chinese character.
2. Output ONLY the Chinese characters. No explanations, no quotes, no extra text.
3. Convert exactly what the pinyin represents. Do NOT add associated words beyond the input.
4. Fix minor typos: adjacent QWERTY keys or similar sounds (zh/z, sh/s, ch/c, ang/an, ing/in).
5. When multiple segmentations are possible, prefer the most natural Chinese phrase.
6. Keep any English words, numbers, or punctuation as-is.`;

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

  const result = streamText({
    model: omlx(MODEL_ID),
    system: PINYIN_SYSTEM_PROMPT,
    prompt: text,
    maxTokens: 200,
    temperature: 0.1,
  });

  return result.toTextStreamResponse();
});

export default {
  port: 7045,
  fetch: app.fetch,
};

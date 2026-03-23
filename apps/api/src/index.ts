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

Step 1: Segment the input into valid pinyin syllables separated by hyphens.
Step 2: Convert each syllable to the most appropriate Chinese character.
Step 3: Output ONLY the final Chinese characters, nothing else.

For example, if given "woaibeijingtiananmen":
Step 1: wo-ai-bei-jing-tian-an-men
Step 2: 我-爱-北-京-天-安-门
Step 3: 我爱北京天安门

RULES:
- Output ONLY step 3 (the final Chinese characters). Do NOT show steps 1 or 2.
- Convert exactly what the pinyin represents. Do NOT add extra words.
- Fix minor typos: adjacent QWERTY keys or similar sounds (zh/z, sh/s, ch/c).
- Keep any English words, numbers, or punctuation as-is.`;

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
  console.log("[pinyin] received:", JSON.stringify(text));

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

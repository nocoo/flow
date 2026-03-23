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

const PINYIN_SYSTEM_PROMPT = `You are a strict Chinese pinyin-to-hanzi converter. Convert the input pinyin into Chinese characters.

CRITICAL RULES:
1. STRICTLY follow the pinyin sequence. Each syllable in the input maps to exactly one Chinese character in the output. Do NOT add, remove, or reorder characters.
2. The number of output characters must match the number of pinyin syllables. For example: "tiananmenshangtaiyangsheng" has syllables tian-an-men-shang-tai-yang-sheng = 7 syllables → output exactly 7 characters: 天安门上太阳升
3. Do NOT associate or infer extra words. If the input is "tiananmen", output "天安门" — do NOT add "北京", "广场", or any other associated words.
4. Only fix minor typos: adjacent QWERTY keys (e.g., s↔d, i↔o) or similar sounds (zh/z, sh/s, ch/c, ang/an, ing/in). Do NOT hallucinate completely different words.
5. If a syllable is incomplete (e.g., trailing "sh" without a vowel), output the most likely partial match or omit it.
6. English words, numbers, and punctuation in the input must be kept as-is in the output.
7. Output ONLY the Chinese characters. No explanations, no quotes, no formatting.`;

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

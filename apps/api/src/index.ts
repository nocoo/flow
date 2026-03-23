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

const PINYIN_SYSTEM_PROMPT = `You are a Chinese pinyin input method engine. Your ONLY job is to convert the user's keystroke input into the most likely Chinese text.

Rules:
- The input is typed on a QWERTY keyboard representing pinyin syllables
- Output ONLY the Chinese characters — no explanations, no punctuation unless the input contains punctuation, no extra text
- Handle common pinyin ambiguities: zh/z, sh/s, ch/c, ang/an, ing/in, eng/en, ong/on
- Handle typos from adjacent keys on QWERTY (e.g., "nuhai" → "女孩" because u is next to i)
- Handle abbreviated pinyin (e.g., "nhao" → "你好", "bjdx" → "北京大学")
- If the input contains English words or numbers mixed in, keep them as-is in the output
- If the input is ambiguous, prefer the most common/natural Chinese phrase
- If context from previous inputs is provided, use it to choose more natural continuations
- NEVER output anything other than the converted Chinese text
- Do NOT wrap the output in quotes or any other formatting`;

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
  const { text, context }: { text: string; context?: string[] } =
    await c.req.json();

  if (!text?.trim()) {
    return c.json({ result: "" });
  }

  const contextHint =
    context && context.length > 0
      ? `\nPrevious context: ${context.join("")}\nContinue naturally from this context.`
      : "";

  const result = streamText({
    model: omlx(MODEL_ID),
    system: PINYIN_SYSTEM_PROMPT + contextHint,
    prompt: text,
    maxTokens: 100,
    temperature: 0.1,
  });

  return result.toTextStreamResponse();
});

export default {
  port: 7045,
  fetch: app.fetch,
};

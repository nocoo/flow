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

const PINYIN_SYSTEM_PROMPT = `You are a Chinese pinyin-to-hanzi converter. The user types pinyin WITHOUT spaces or tone marks as a continuous string. Your job is to segment the pinyin into syllables and convert each syllable to the correct Chinese character.

RULES:
1. First, segment the continuous pinyin string into valid pinyin syllables. Then convert each syllable to one Chinese character.
2. The output must contain ONLY Chinese characters (and any English/numbers from the input kept as-is). No explanations, no quotes.
3. Fix minor typos from adjacent QWERTY keys or similar sounds (zh/z, sh/s, ch/c, ang/an, ing/in).
4. Do NOT add words that are not in the pinyin. Convert only what is given.
5. Choose the most natural/common phrase when multiple segmentations are possible.

EXAMPLES:
- "woaibeijingtiananmen" → 我爱北京天安门
- "jintiandianqizhenhao" → 今天天气真好
- "woaini" → 我爱你
- "zhonghuarenmingongheguo" → 中华人民共和国
- "tiananmenshangtaiyangsheng" → 天安门上太阳升
- "nihaoshijie" → 你好世界
- "womenshipengyou" → 我们是朋友`;

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

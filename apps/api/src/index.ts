import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { segmentPinyin } from "./pinyin-segmenter";
import { getActiveProvider } from "./provider";
import { settingsRouter } from "./routes/settings";

const PINYIN_SYSTEM_PROMPT = `你是一个中文输入法引擎（IME）的解码器。

任务：
- 将用户输入的连续拼音还原成最自然的中文文本。
- 你会同时看到原始连续字符串 raw 和一个机器分词结果 segmented。
- segmented 可能有错，你必须以 raw 为准进行修正，不要盲从 segmented。
- 用户可能混输英文品牌名、产品名、技术词；如果 raw 中某段更像英文词，应保留英文原样或恢复为合理英文大小写形式（如 claude → Claude）。
- 用户可能有轻微拼音错误、漏字母、近音输入；如果能根据上下文和固定搭配推断，应优先输出最自然的表达。
- 对成语、俗语、固定搭配、常见口语，优先选择语义完整、搭配自然的写法。
- 若多个同音结果都成立，优先固定搭配、成语、俗语、口语中最常见者。
- 允许对用户输入中的轻微拼音误差进行纠正，但只在能显著提升整句自然度时才这样做。
- 输出必须只包含最终候选文本，不要解释，不要加引号，不要输出拼音。

规则优先级：
1. 语义通顺
2. 固定搭配/成语优先
3. 保留英文专有名词
4. 再参考 segmented`;

const app = new Hono();

app.use("/api/*", cors());

app.get("/", (c) => c.json({ status: "ok", name: "flow-api" }));

app.route("/", settingsRouter);

app.post("/api/chat", async (c) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json();
  const { model } = getActiveProvider();

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
});

app.post("/api/pinyin", async (c) => {
  const { text, context }: { text: string; context?: string[] } = await c.req.json();

  if (!text?.trim()) {
    return c.json({ result: "" });
  }

  const { model } = getActiveProvider();
  const segmented = segmentPinyin(text);

  // Build structured prompt: raw is evidence, segmented is suggestion
  let userPrompt = `raw: ${text}\nsegmented: ${segmented}`;

  if (context && context.length > 0) {
    // Last 3 entries max to keep token cost low
    const recent = context.slice(-3).join("\n");
    userPrompt += `\n上文: ${recent}`;
  }

  const result = streamText({
    model,
    system: PINYIN_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxTokens: 200,
    temperature: 0,
  });

  return result.toTextStreamResponse();
});

export default {
  port: 7045,
  fetch: app.fetch,
};

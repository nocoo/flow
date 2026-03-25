import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { segmentPinyinWithSpans } from "./pinyin-segmenter";
import { getActiveProvider } from "./provider";
import { settingsRouter } from "./routes/settings";

const PINYIN_SYSTEM_PROMPT = `你是一个中文输入法引擎（IME）的解码器。

严格规则（违反任何一条即为失败）：
- 输出必须且只能包含最终中文文本，禁止输出任何思考过程、分析步骤、解释、标注、引号、拼音
- 禁止输出 "Thinking Process"、"分析" 等元描述文字
- 直接输出答案，不要任何前缀或后缀

任务：
- 将用户输入的连续拼音还原成最自然的中文文本
- 你会同时看到原始连续字符串 raw 和一个机器分词结果 segmented
- segmented 可能有错，你必须以 raw 为准进行修正，不要盲从 segmented
- 用户可能混输英文品牌名、产品名、技术词；如果 raw 中某段更像英文词，应保留英文原样或恢复为合理英文大小写形式（如 claude → Claude）
- 用户可能有轻微拼音错误、漏字母、近音输入；如果能根据上下文和固定搭配推断，应优先输出最自然的表达
- 对成语、俗语、固定搭配、常见口语，优先选择语义完整、搭配自然的写法
- 若多个同音结果都成立，优先固定搭配、成语、俗语、口语中最常见者

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
  const {
    messages,
    reasoning = true,
  }: { messages: UIMessage[]; reasoning?: boolean } = await c.req.json();
  const { model } = getActiveProvider();

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ sendReasoning: reasoning });
});

app.post("/api/pinyin", async (c) => {
  const { text, context }: { text: string; context?: string[] } = await c.req.json();

  if (!text?.trim()) {
    return c.json({ result: "" });
  }

  const { model } = getActiveProvider();
  const { segmented } = segmentPinyinWithSpans(text);

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

  // Thinking models may put the entire answer into reasoning_content with
  // empty text content in streaming mode. Stream text deltas first; if text
  // ends up empty, fall back to reasoning output.
  const encoder = new TextEncoder();
  const textChunks: string[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      for await (const delta of result.textStream) {
        textChunks.push(delta);
        controller.enqueue(encoder.encode(delta));
      }

      if (textChunks.join("").trim() === "") {
        const reasoningParts = await result.reasoning;
        const full = reasoningParts.map((r) => r.text).join("").trim();
        if (full) controller.enqueue(encoder.encode(full));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
});

export default {
  port: 7045,
  idleTimeout: 120,
  fetch: app.fetch,
};

import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { segmentPinyin } from "./pinyin-segmenter";
import { getActiveProvider } from "./provider";
import { settingsRouter } from "./routes/settings";

const PINYIN_SYSTEM_PROMPT = `将拼音转换为中文。只输出中文汉字。`;

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
  const { text }: { text: string } = await c.req.json();

  if (!text?.trim()) {
    return c.json({ result: "" });
  }

  const { model } = getActiveProvider();
  const segmented = segmentPinyin(text);

  const result = streamText({
    model,
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

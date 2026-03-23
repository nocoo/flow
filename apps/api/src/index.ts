import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const omlx = createOpenAICompatible({
  name: "omlx",
  baseURL: "http://localhost:8000/v1",
  apiKey: "not-needed", // local model, no auth required
});

const app = new Hono();

app.use("/api/*", cors());

app.get("/", (c) => c.json({ status: "ok", name: "flow-api" }));

app.post("/api/chat", async (c) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json();

  const result = streamText({
    model: omlx("mlx-community/Qwen3-8B-4bit"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
});

export default {
  port: 7045,
  fetch: app.fetch,
};

import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
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

const POLISH_SYSTEM_PROMPT = `你是一个中文文本润色与格式化引擎。

严格规则（违反任何一条即为失败）：
- 输出必须且只能包含润色后的文本，禁止输出任何思考过程、分析步骤、解释、标注
- 禁止输出 "修改说明"、"分析" 等元描述文字
- 直接输出答案，不要任何前缀或后缀

任务：
1. 修正用户输入中的错别字、语法错误、标点符号问题
2. 应用"盘古之白"排版规则：在中文与半角英文/数字/符号之间插入一个空格
   - 例："我使用Chrome浏览器" → "我使用 Chrome 浏览器"
   - 例："共有100个" → "共有 100 个"
   - 例："使用HTML5标准" → "使用 HTML5 标准"
   - 中文标点符号（，。！？等）前后不加空格
3. 保持原文语义和风格不变，仅做最小限度修正
4. 如果输入已经完全正确，原样输出`;

// ---------------------------------------------------------------------------
// Shared NDJSON streaming helper
// Protocol: {"t":"r","v":"..."} reasoning | {"t":"t","v":"..."} text | {"t":"d"} done
// ---------------------------------------------------------------------------

function streamNdjsonResponse(result: ReturnType<typeof streamText>): Response {
	const encoder = new TextEncoder();
	const textChunks: string[] = [];

	const stream = new ReadableStream({
		async start(controller) {
			const send = (obj: Record<string, string>) =>
				controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));

			for await (const chunk of result.fullStream) {
				if (chunk.type === "reasoning-delta") {
					send({ t: "r", v: chunk.text });
				} else if (chunk.type === "text-delta") {
					textChunks.push(chunk.text);
					send({ t: "t", v: chunk.text });
				}
			}

			// Thinking models may put the entire answer into reasoning with
			// empty text. Fall back to the accumulated reasoning text.
			if (textChunks.join("").trim() === "") {
				const reasoningParts = await result.reasoning;
				const full = reasoningParts
					.map((r) => r.text)
					.join("")
					.trim();
				if (full) send({ t: "t", v: full });
			}

			send({ t: "d" });
			controller.close();
		},
	});

	return new Response(stream, {
		headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
	});
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

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
	const { text, context }: { text: string; context?: string[] } =
		await c.req.json();

	if (!text?.trim()) {
		return c.json({ result: "" });
	}

	const { model } = getActiveProvider();
	const { segmented } = segmentPinyinWithSpans(text);

	let userPrompt = `raw: ${text}\nsegmented: ${segmented}`;

	if (context && context.length > 0) {
		const recent = context.slice(-3).join("\n");
		userPrompt += `\n上文: ${recent}`;
	}

	const result = streamText({
		model,
		system: PINYIN_SYSTEM_PROMPT,
		prompt: userPrompt,
		maxOutputTokens: 200,
		temperature: 0,
	});

	return streamNdjsonResponse(result);
});

app.post("/api/polish", async (c) => {
	const { text, context }: { text: string; context?: string[] } =
		await c.req.json();

	if (!text?.trim()) {
		return c.json({ result: "" });
	}

	const { model } = getActiveProvider();

	let userPrompt = text;
	if (context && context.length > 0) {
		const recent = context.slice(-3).join("\n");
		userPrompt = `上文:\n${recent}\n\n需要润色的文本:\n${text}`;
	}

	const result = streamText({
		model,
		system: POLISH_SYSTEM_PROMPT,
		prompt: userPrompt,
		maxOutputTokens: 500,
		temperature: 0,
	});

	return streamNdjsonResponse(result);
});

export default {
	port: 7030,
	idleTimeout: 120,
	fetch: app.fetch,
};

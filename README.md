<p align="center">
  <img src="assets/brand/icon-rounded.png" width="128" height="128" alt="Flow logo" />
</p>
<h1 align="center">Flow</h1>
<p align="center">在浏览器中试验由语言模型驱动的拼音输入、中文润色和对话。</p>
<p align="center">
  <a href="docs/README.en.md">English</a>
</p>

## 这是什么

Flow 是一个中文输入实验项目，以网页形式运行。拼音分词器提供音节线索，语言模型结合原始输入与最近上下文生成中文候选；同一页面还提供中文润色和聊天面板。

项目适合观察不同模型处理连续拼音、中英混输和文本修正的表现。它需要自行接入 OpenAI 兼容的模型服务，目前没有系统输入法集成。结果质量与响应速度取决于所选模型和服务。

## 功能

- **拼音候选**：动态规划切分拼音，结合原始字符串和最近已确认的文本生成结果，支持流式显示。
- **中文润色**：通过 Prompt 要求模型修正错字、语法和标点，并调整中英文、数字之间的间距。
- **连续输入**：拼音面板使用空格或 Enter 确认候选，润色面板使用 Enter；已确认内容会作为后续上下文。
- **多轮对话**：流式聊天，支持停止生成和显示模型返回的推理内容。
- **模型设置**：保存 Local、Cloud 两份 OpenAI 兼容服务配置，选择当前使用的服务，并在服务支持时读取模型列表。

配置保存在 `apps/api/data/settings.db`。API Key 在设置响应中脱敏，数据库中的配置未加密。输入、最近上下文或对话消息会发给当前选择的模型服务；页面输入历史与聊天记录只保存在前端状态中，刷新后不恢复。当前 API 没有用户认证，适合单人本地或受控网络实验。

## 使用

完成下方开发启动后，打开 `http://localhost:7029`：

1. 在设置面板填写 Base URL、API Key 和 Model ID，选择 Local 或 Cloud，点击 **Save Settings**。
2. 在 **Pinyin Input** 输入连续拼音，等待候选后按空格或 Enter 确认。
3. 在 **Polish** 输入中文文本并按 Enter 确认润色结果，或使用 **Flow Chat** 进行对话。

Local 默认指向 `http://localhost:8000/v1`，需要自行启动兼容服务并设置实际可用的模型 ID。两份配置都可以更换服务地址；仓库不包含模型权重或推理服务。

## 开发

需要 Bun 和 Node.js 22.12+，以及至少一个可用的 OpenAI 兼容模型服务。

```bash
git clone https://github.com/nocoo/flow.git
cd flow
bun install --frozen-lockfile
```

当前前端在 [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts) 中固定使用维护者的开发域名。本机开发前，将该文件中的 `API_BASE` 改为：

```typescript
export const API_BASE = "http://localhost:7030";
```

然后启动：

```bash
bun run dev
```

Web 默认端口为 7029，API 为 7030。API 首次启动会创建本地设置数据库。

| 命令 | 用途 |
| --- | --- |
| `bun run dev:api` | 单独启动 Bun / Hono API |
| `bun run dev:web` | 单独启动 Vite 前端 |
| `bun run --cwd apps/web build` | 类型检查并构建静态前端 |
| `bun run typecheck` | 检查前后端类型 |
| `bun run lint` | 运行前后端静态检查 |

前端构建产物仍需配合独立 API 服务，构建时应确认 `API_BASE` 指向实际 API 地址。

## 测试

```bash
bun run test
bun run --cwd apps/api test
bun run --cwd apps/web test
```

第一条运行全部单元测试，后两条分别运行拼音分词器和前端工具函数测试。当前仓库没有独立的 HTTP 或浏览器端到端测试入口；真实模型输出需要连接所配置的服务后在页面中检查。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| TypeScript / Bun | 工作区脚本与 API 运行时 |
| Hono | 聊天、拼音、润色和设置接口 |
| AI SDK / OpenAI Compatible | 模型调用与流式响应 |
| React / Vite | 浏览器界面与前端构建 |
| Tailwind CSS / Radix UI | 页面样式和组件 |
| bun:sqlite | 本地服务配置 |
| Vitest | 分词器与前端工具函数测试 |

## 文档

- [API 路由与 Prompt](apps/api/src/index.ts)
- [拼音分词器](apps/api/src/pinyin-segmenter.ts)
- [配置结构与默认值](apps/api/src/types.ts)
- [品牌资源使用](docs/01-logo-usage.md)

## 许可证

[MIT](LICENSE)

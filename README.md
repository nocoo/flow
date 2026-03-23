<h1 align="center">Flow</h1>

<p align="center"><strong>LLM 驱动的中文拼音输入法引擎</strong><br>实时流式预测 · 中英混输 · 多模型对比</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun"/>
  <img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License"/>
</p>

---

## 这是什么

Flow 是一个用大语言模型做中文拼音输入法解码器的实验项目。用户输入连续拼音字符串，系统通过 DP 分词 + LLM 语义解码，实时流式输出最自然的中文文本。

核心思路：**分词器只提供音节线索，不做最终决策。LLM 同时看到原始输入和分词建议，负责纠错、消歧、英文识别和上下文理解。**

```
┌──────────┐    ┌─────────────────┐    ┌──────────────┐    ┌─────────┐
│  用户输入 │───▶│ DP 分词 + Span  │───▶│ 结构化 Prompt │───▶│   LLM   │
│ raw pinyin│    │  标注          │    │ raw+seg+ctx  │    │  解码器  │
└──────────┘    └─────────────────┘    └──────────────┘    └─────────┘
```

## 功能

### 拼音输入引擎

- **DP 音节分词** — 基于完整拼音音节表的动态规划分词，最大化覆盖率，自动处理 lv/nv 等特殊音节
- **Span 类型标注** — 自动检测分词歧义段（uncertain）和疑似英文段（english_like），辅助 LLM 决策
- **IME 解码器 Prompt** — 专为输入法场景设计的系统提示词，支持纠错、成语优先、英文保留
- **上下文传递** — 已上屏内容作为上文传给模型，提升连续输入的消歧能力
- **流式输出** — 实时 streaming 显示预测结果，200ms debounce 平衡响应速度和请求频率

### Chat 面板

- **AI 对话** — 基于 AI SDK 的流式聊天界面，支持多轮对话

### 设置系统

- **双 Provider 切换** — Local（OMLX 本地模型）和 Cloud（AI Hub Mix 云端模型）一键切换
- **SQLite 持久化** — 配置存储在本地 SQLite 数据库，API Key 脱敏展示
- **动态 Provider** — 每次请求读取最新配置，无需重启服务

## 项目结构

```
flow/
├── apps/
│   ├── api/                         # 后端 API 服务
│   │   └── src/
│   │       ├── index.ts             # Hono 路由入口
│   │       ├── pinyin-segmenter.ts  # DP 分词引擎
│   │       ├── provider.ts          # 动态 LLM Provider
│   │       ├── db.ts                # SQLite 配置层
│   │       ├── types.ts             # 类型定义
│   │       └── routes/
│   │           └── settings.ts      # 设置 API
│   └── web/                         # 前端 React 应用
│       └── src/
│           ├── components/
│           │   ├── chat.tsx          # Chat 面板
│           │   ├── pinyin-input.tsx  # 拼音输入面板
│           │   └── settings-sheet.tsx
│           ├── hooks/
│           │   ├── use-pinyin.ts     # 流式预测 Hook
│           │   └── use-settings.tsx  # 设置 Context
│           └── lib/
│               └── api.ts           # API 客户端
├── package.json
└── LICENSE
```

## 技术栈

| 层 | 技术 |
|---|------|
| 运行时 | [Bun](https://bun.sh) |
| 后端框架 | [Hono](https://hono.dev) |
| AI 推理 | [Vercel AI SDK](https://sdk.vercel.ai) + [OpenAI Compatible](https://www.npmjs.com/package/@ai-sdk/openai-compatible) |
| 前端框架 | [React](https://react.dev) 19 + [Vite](https://vite.dev) 8 |
| UI 组件 | [shadcn/ui](https://ui.shadcn.com) + [Radix](https://www.radix-ui.com) + [Tailwind CSS](https://tailwindcss.com) 4 |
| 数据库 | [bun:sqlite](https://bun.sh/docs/api/sqlite) (WAL mode) |
| 测试 | [bun:test](https://bun.sh/docs/cli/test) |

## 开发

### 环境要求

- [Bun](https://bun.sh) >= 1.3
- 本地模型服务（可选）：[OMLX](https://github.com/nicuhk/omlx) 或任何 OpenAI 兼容 API
- 云端模型服务（可选）：[AI Hub Mix](https://aihubmix.com) API Key

### 快速开始

```bash
git clone https://github.com/nocoo/flow.git
cd flow
bun install
bun run dev        # 同时启动 API (7045) 和 Web (7044)
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `bun run dev` | 同时启动 API 和 Web 开发服务器 |
| `bun run dev:api` | 仅启动 API 服务器 (端口 7045) |
| `bun run dev:web` | 仅启动 Web 开发服务器 (端口 7044) |
| `bun test` | 运行测试 |

## 测试

| 层 | 内容 | 命令 |
|---|------|------|
| L1 - 单元测试 | 拼音分词器：音节切分、span 标注、边界情况 | `bun test` |

```bash
bun test apps/api/src/pinyin-segmenter.test.ts
```

[MIT](LICENSE) © 2026
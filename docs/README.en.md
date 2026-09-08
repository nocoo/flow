<p align="center">
  <img src="../assets/brand/icon-rounded.png" width="128" height="128" alt="Flow logo" />
</p>
<h1 align="center">Flow</h1>
<p align="center">Experiment with language-model pinyin input, Chinese text polishing, and chat in the browser.</p>
<p align="center">
  <a href="../README.md">简体中文</a>
</p>

## What it does

Flow is a Chinese input experiment that runs as a web application. A pinyin segmenter provides syllable hints, and a language model combines the raw input with recent context to produce Chinese candidates. The same page also includes text polishing and chat panels.

It helps explore how models handle continuous pinyin, mixed Chinese and English input, and text corrections. You need an OpenAI-compatible model service. System input method integration is not implemented; output quality and response time depend on the selected model and service.

## Features

- **Pinyin candidates**: Segment pinyin with dynamic programming, combine it with the raw string and recently committed text, and stream the result.
- **Chinese text polishing**: Prompt the model to correct typos, grammar, and punctuation, and adjust spacing around English text and numbers.
- **Continuous input**: Commit pinyin candidates with Space or Enter and polished text with Enter. Committed text becomes context for subsequent input.
- **Multi-turn chat**: Stream replies, stop generation, and display reasoning content returned by the model.
- **Model settings**: Store Local and Cloud OpenAI-compatible service profiles, select the active profile, and retrieve a model list when the service supports it.

Configuration is stored in `apps/api/data/settings.db`. API keys are masked in settings responses, but the database configuration is not encrypted. Input, recent context, or chat messages are sent to the selected model service. Input history and chat messages live only in frontend state and are lost on refresh. The API has no user authentication and is intended for individual local or controlled-network experiments.

## Usage

After completing the development setup below, open `http://localhost:7029`:

1. Enter a Base URL, API Key, and Model ID in the settings panel, select Local or Cloud, and click **Save Settings**.
2. Type continuous pinyin into **Pinyin Input**, wait for a candidate, and press Space or Enter to commit it.
3. Type Chinese text into **Polish** and press Enter to commit the result, or use **Flow Chat** for conversation.

Local defaults to `http://localhost:8000/v1`. Start a compatible service yourself and choose a model ID it actually provides. Both profiles accept a different service URL; the repository includes neither model weights nor an inference server.

## Development

Requires Bun, Node.js 22.12+, and at least one working OpenAI-compatible model service.

```bash
git clone https://github.com/nocoo/flow.git
cd flow
bun install --frozen-lockfile
```

The frontend currently uses the maintainer's development domain in [apps/web/src/lib/api.ts](../apps/web/src/lib/api.ts). For local development, change `API_BASE` in that file to:

```typescript
export const API_BASE = "http://localhost:7030";
```

Then start the application:

```bash
bun run dev
```

The Web app defaults to port 7029 and the API to 7030. The API creates its local settings database on the first run.

| Command | Purpose |
| --- | --- |
| `bun run dev:api` | Start only the Bun / Hono API |
| `bun run dev:web` | Start only the Vite frontend |
| `bun run --cwd apps/web build` | Typecheck and build the static frontend |
| `bun run typecheck` | Check frontend and API types |
| `bun run lint` | Run frontend and API static checks |

The frontend build still needs a separately running API. Confirm that `API_BASE` points to the intended API address when building it.

## Tests

```bash
bun run test
bun run --cwd apps/api test
bun run --cwd apps/web test
```

The first command runs all unit tests. The others run the pinyin segmenter tests and frontend utility tests separately. There is currently no separate HTTP or browser end-to-end test entry point. Check actual model output in the page after connecting the configured service.

## Stack

| Technology | Role |
| --- | --- |
| TypeScript / Bun | Workspace scripts and API runtime |
| Hono | Chat, pinyin, polishing, and settings endpoints |
| AI SDK / OpenAI Compatible | Model calls and streaming responses |
| React / Vite | Browser UI and frontend builds |
| Tailwind CSS / Radix UI | Styling and UI components |
| bun:sqlite | Local service configuration |
| Vitest | Segmenter and frontend utility tests |

## Documentation

- [API routes and prompts](../apps/api/src/index.ts)
- [Pinyin segmenter](../apps/api/src/pinyin-segmenter.ts)
- [Configuration schema and defaults](../apps/api/src/types.ts)
- [Brand asset usage](01-logo-usage.md)

## License

[MIT](../LICENSE)

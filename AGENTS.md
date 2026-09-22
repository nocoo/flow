# Flow

Browser experiment for LLM-driven pinyin input, Chinese polishing, and chat.
Profile: ts-worker-web
Direction: [README.md](README.md). Frameworks must not rewrite this file.

## Scope and instruction sources

- This file is the only project handbook; nested files do not compete with it. Do not create a `CLAUDE.md` alias or copy.
- This file is the contract; `.husky/pre-commit`, `.husky/pre-push`, `.github/workflows/ci.yml` and `vitest.config.ts` are enforcement. If they disagree, that is a failure — raise enforcement to match this file; never lower the contract to a weaker hook.
- Human docs: [README.md](README.md) and `docs/*.md`. No root version (workspace); do not invent a package version. No tracked env files; model keys live in local SQLite (unencrypted). Global machine rules live in the machine `AGENTS.md` and `rules/git-commit.md`.
- Accidents: [Retrospective.md](Retrospective.md).

## Project invariants

- No user auth. Treat as a single-operator local/controlled-network tool.
- Settings (including API keys) persist in `apps/api/data/settings.db`. Keys are redacted in API responses; the database is not encrypted.
- Chat/pinyin history is frontend state only; refresh drops it. Inputs are sent to the configured OpenAI-compatible provider.
- `apps/web/src/lib/api.ts` currently hard-codes a maintainer `API_BASE`. Local work must point it at `http://localhost:7030` before `bun run dev`.
- API uses Bun SQLite. Do not introduce Cloudflare D1 or remote `-test` resources.

## Setup and commands

TypeScript on a Bun workspace `apps/*`; Vite web :7029 plus Bun/Hono API :7030; ESLint (web, `--max-warnings=0`) and Biome (api `--error-on-warnings`); Vitest L1 at 95% on extracted logic with API routes excluded from coverage; bun:sqlite `apps/api/data/settings.db`. Layout: `apps/web/src`, `apps/api/src`, `vitest.config.ts`, `docs/`. MVVM: viewmodels have no View/DOM imports; routes stay thin.

```bash
bun install --frozen-lockfile
bun run dev                 # filter '*' — web :7029, api :7030
bun run typecheck
bun run lint
bun run --cwd apps/web build
bun run test:coverage       # vitest --coverage (root config, 95% four metrics)
bun run test                # vitest run, no coverage
```

## Testing and quality contract

6DQ keeps its name with unified L1, L2/L3, G2 and D1; the owner merged former G1 into L1 on 2026-09-21.
Required L1 bar: statements/branches/functions/lines each ≥95%; no skipped or focused tests; strict types and check-only lint/format with zero errors/warnings, installed hooks and failure rejection.
Statuses: `enforced` | `planned` | `manual` | `N/A`.

| Dimension | Required proof | Status | Evidence |
|---|---|---|---|
| L1 pre-commit quality | Four coverage metrics ≥ 95% across runtime logic, no skipped/focused tests, strict types and check-only lint with zero errors/warnings | planned | CI enforces 95% within selected Vitest source, but excludes API provider/database/routes and client hooks without equivalent coverage. Pre-commit runs `bun run lint` + `typecheck` (working tree, static subchecks only; no tests, no index snapshot) |
| L2 API | Real HTTP 100% Hono routes | planned | coverage **excludes** `apps/api/src/routes/**`, `db.ts`, `index.ts`; no real-HTTP L2 runner |
| L3 UI path | Playwright | planned | no Playwright config or script |
| G2 security | osv-scanner + gitleaks | enforced | CI quality.yml `security` default + `osv-config: osv-scanner.toml`. pre-push does not run G2 |
| D1 isolation | Per-run local SQLite, not daily `settings.db` | planned | no per-run persist dir or `_test_marker`; tests must not write the dev DB |
| Build | web `tsc -b && vite build` | planned | no root build; not in hooks |
| Docs | update README if API_BASE/ports change | manual | human review |
| Release | none | N/A | unpublished local experiment |

| Hook | Verifies | Budget | Runs |
|---|---|---|---|
| pre-commit | working-tree `bun run lint` + `typecheck` (not index snapshot) | target <30s (unmeasured) | static subchecks of unified L1 (no tests/coverage) |
| pre-push | working-tree `bun run test` + `typecheck` (not stdin refs) | target <3min (unmeasured) | unit without coverage; not L2/G2 |

Target: index-snapshot unified L1; stdin-ref L2+G2. Check-only; `--no-verify` forbidden.

## Resources and isolation

| Purpose | Port / resource | Isolation |
|---|---|---|
| Dev web | 7029 | Vite; host `flow.dev.hexly.ai` allowed |
| Dev API | 7030 | Bun.serve; SQLite `apps/api/data/settings.db` |
| Model | `http://localhost:8000/v1` default local | operator-provided; not this repo |

E2E never touches prod data stores. Do not use the daily settings DB as a test fixture.

## Operations / release

Omit published release. No wrangler deploy.

## Retrospective

| Kind | Where |
|---|---|
| Accident narrative | [Retrospective.md](Retrospective.md) |
| Project-specific rule that will recur | one line here (cap ~10) |
| Cross-project lesson | nmem / global `AGENTS.md` / `rules/` |
| Deterministically checkable rule | hook or test, not prose |

- Point `API_BASE` at localhost:7030 for local runs; do not commit a personal tunnel URL as the default without review.

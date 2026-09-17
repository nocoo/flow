# Flow

Browser experiment for LLM-driven pinyin input, Chinese polishing, and chat.
Profile: ts-worker-web
Direction: [README.md](README.md). Frameworks must not rewrite this file.

## Sources of Truth

This file is the **contract**. Hooks, CI, and config are **enforcement**. If they disagree, that is a failure — raise enforcement to match this file; never lower the contract to a weaker hook.

| Fact | Where |
|---|---|
| Agent handbook | this file |
| Human docs | README.md, `docs/*.md` |
| Version | none at root (workspace); do not invent a package version |
| Enforcement | `.husky/pre-commit`, `.husky/pre-push`, `.github/workflows/ci.yml`, `vitest.config.ts` |
| Machine rules | global `AGENTS.md`, `rules/git-commit.md` |
| Accidents | [Retrospective.md](Retrospective.md) |
| Env files | none tracked; model keys live in local SQLite (unencrypted) |

## Project Invariants

- No user auth. Treat as a single-operator local/controlled-network tool.
- Settings (including API keys) persist in `apps/api/data/settings.db`. Keys are redacted in API responses; the database is not encrypted.
- Chat/pinyin history is frontend state only; refresh drops it. Inputs are sent to the configured OpenAI-compatible provider.
- `apps/web/src/lib/api.ts` currently hard-codes a maintainer `API_BASE`. Local work must point it at `http://localhost:7030` before `bun run dev`.
- API uses Bun SQLite. Do not introduce Cloudflare D1 or remote `-test` resources.

## Stack / Layout

| Component | Choice |
|---|---|
| Language | TypeScript |
| Package manager | Bun (workspace `apps/*`) |
| Runtime | Vite web :7029 + Bun/Hono API :7030 |
| Lint | ESLint (web, `--max-warnings=0`) + Biome (api `--error-on-warnings`) |
| Tests | Vitest L1 95% on extracted logic; API routes excluded from coverage |
| Data | bun:sqlite `apps/api/data/settings.db` |

```
apps/web/src  apps/api/src
vitest.config.ts  docs/
```

MVVM: viewmodels have no View/DOM imports; routes stay thin.

## Commands

```bash
bun install --frozen-lockfile
bun run dev                 # filter '*' — web :7029, api :7030
bun run typecheck
bun run lint
bun run --cwd apps/web build
bun run test:coverage       # vitest --coverage (root config, 95% four metrics)
bun run test                # vitest run, no coverage
```

## Verification

Status: `enforced` | `planned` | `manual` | `N/A`.
6DQ = L1/L2/L3 + G1/G2 + D1. Required L1 bar is statements/branches/functions/lines each ≥95%; no skipped or focused tests.

| Change | Proof | Status | Evidence |
|---|---|---|---|
| Logic | L1 statements/branches/functions/lines each ≥95% across runtime logic | planned | CI enforces 95% within selected Vitest source, but excludes API provider/database/routes and client hooks without equivalent coverage. Pre-commit does **not** run tests |
| API / schema | L2 real HTTP 100% Hono routes | planned | coverage **excludes** `apps/api/src/routes/**`, `db.ts`, `index.ts`; no real-HTTP L2 runner |
| UI path | L3 Playwright | planned | no Playwright config or script |
| Types / lint | G1 0 error, 0 warning | enforced | pre-commit `bun run lint` + `typecheck`; CI quality.yml |
| Deps / secrets | G2 osv-scanner + gitleaks | enforced | CI quality.yml `security` default + `osv-config: osv-scanner.toml`. pre-push does not run G2 |
| Test isolation | D1 per-run local SQLite, not daily `settings.db` | planned | no per-run persist dir or `_test_marker`; tests must not write the dev DB |
| Bundler output | web `tsc -b && vite build` | planned | no root build; not in hooks |
| Docs | update README if API_BASE/ports change | manual | human review |
| Release | none | N/A | unpublished local experiment |

| Hook | Verifies | Budget | Runs |
|---|---|---|---|
| pre-commit | working-tree `bun run lint` + `typecheck` (not index snapshot) | target <30s (unmeasured) | G1 only (not L1) |
| pre-push | working-tree `bun run test` + `typecheck` (not stdin refs) | target <3min (unmeasured) | unit without coverage; not L2/G2 |

Target: index-snapshot G1+L1; stdin-ref L2+G2. Check-only; `--no-verify` forbidden.

## Resources / Isolation

| Purpose | Port / resource | Isolation |
|---|---|---|
| Dev web | 7029 | Vite; host `flow.dev.hexly.ai` allowed |
| Dev API | 7030 | Bun.serve; SQLite `apps/api/data/settings.db` |
| Model | `http://localhost:8000/v1` default local | operator-provided; not this repo |

E2E never touches prod data stores. Do not use the daily settings DB as a test fixture.

## Operations / Release

Omit published release. No wrangler deploy.

## Retrospective

| Kind | Where |
|---|---|
| Accident narrative | [Retrospective.md](Retrospective.md) |
| Project-specific rule that will recur | one line here (cap ~10) |
| Cross-project lesson | nmem / global `AGENTS.md` / `rules/` |
| Deterministically checkable rule | hook or test, not prose |

- Point `API_BASE` at localhost:7030 for local runs; do not commit a personal tunnel URL as the default without review.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Per-package projects keep their own configs (web needs jsdom + the React
    // plugin from apps/web's deps; api runs under node). The shared coverage
    // config below aggregates results across both.
    projects: ["apps/web", "apps/api"],
    coverage: {
      provider: "v8",
      // Vitest v4 enables AST-aware remapping by default; v3 needed the
      // experimentalAstAwareRemapping flag. Pinned to v4 in package.json.
      reporter: ["text", "html"],
      include: [
        "apps/*/src/**/*.ts",
        "apps/*/src/**/*.tsx",
        "packages/*/src/**/*.ts",
        "packages/*/src/**/*.tsx",
      ],
      exclude: [
        // Test files and per-package test setup — not production code.
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/test-setup.ts",
        // Type declarations and pure type/constant modules — no runtime branches.
        "**/*.d.ts",
        "apps/api/src/types.ts",
        // App entry points: framework bootstrap with no extractable logic.
        // Covered by E2E / smoke tests rather than unit tests.
        "apps/web/src/main.tsx",
        "apps/web/src/App.tsx",
        // React UI components — JSX layout / shadcn primitives. Business logic
        // is extracted into lib/*.ts modules; visual behavior belongs in E2E.
        "apps/*/src/components/**",
        // Client-side data-fetching / state hooks ("use client" style). Wrap
        // fetch + React state with no extractable logic; belong in E2E tests.
        "apps/*/src/hooks/**",
        // Browser fetch wrapper — thin client over the API. Covered by API
        // integration / E2E tests, not worth mocking fetch in unit tests.
        "apps/web/src/lib/api.ts",
        // Bun-runtime modules — depend on bun:sqlite, Bun.serve, and
        // import.meta.dir. Cannot execute under vitest's Node/jsdom runtime.
        // Logic is exercised through the running Bun server in dev/E2E.
        "apps/api/src/db.ts",
        "apps/api/src/index.ts",
        "apps/api/src/provider.ts",
        "apps/api/src/routes/**",
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});

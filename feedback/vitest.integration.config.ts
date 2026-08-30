import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * A separate Vitest project for tests that need a real database
 * (unlike `vitest.config.ts`'s `tests/unit/**`, which runs with zero
 * environment variables — see D2-001). Node environment, no jsdom.
 * Requires `DATABASE_URL`; run against local Postgres in dev or the
 * CI `postgres:16` service container (Tier 3 — the only tier with a
 * database), never as part of Tier 2's zero-env-var unit run.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
      // `lib/db`, `lib/feedback` import the `server-only` marker
      // package, whose default export unconditionally throws outside
      // Next.js's own "react-server" build condition — this suite
      // *is* server-only code, just not run through Next's bundler,
      // so the marker's job (catching an accidental client import) is
      // moot here; resolve it to its own no-op `empty.js`, the same
      // file Next.js's build resolves it to.
      "server-only": path.resolve(
        dirname,
        "node_modules/server-only/empty.js",
      ),
    },
  },
});

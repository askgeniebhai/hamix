import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { getEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

/**
 * Drizzle + standard node-postgres (`pg`) driver. Neon is fully
 * reachable over the standard Postgres wire protocol via `DATABASE_URL`
 * (`sslmode=require` in the connection string enables TLS automatically),
 * so this one client works unmodified against local Postgres, a CI
 * `postgres:` service container, and real Neon in production.
 *
 * (`@neondatabase/serverless`'s HTTP/WebSocket driver was tried first
 * per docs/TECH_STACK.md, but it can only reach actual Neon/Vercel/
 * Supabase endpoints — not local/CI Postgres — which made it
 * impossible to test real auth/tenant flows locally or in CI. See
 * DECISIONS.md D3-001.)
 *
 * Lazily constructed so importing this module (e.g. transitively, from
 * lib/auth) never requires DATABASE_URL unless a query actually runs;
 * the pool itself doesn't open a connection until first use.
 */
let cached: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (!cached) {
    const env = getEnv();
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    cached = drizzle({ client: pool, schema });
  }
  return cached;
}

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { getEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

/**
 * Drizzle + Neon HTTP driver foundation. neon-http is stateless (one
 * HTTP request per query, no persistent connection), so constructing
 * this client never opens a connection — nothing happens until a
 * query actually runs. Lazily built so importing this module (e.g.
 * transitively, from lib/auth) never requires DATABASE_URL to be set
 * unless a query is actually made.
 */
let cached: NeonHttpDatabase<typeof schema> | undefined;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!cached) {
    const env = getEnv();
    const client = neon(env.DATABASE_URL);
    cached = drizzle({ client, schema });
  }
  return cached;
}

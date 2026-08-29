import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

/**
 * getAuth() (and the env/db validation behind it) must not run until a
 * request actually arrives here — Next.js executes a route module's
 * top-level code during build-time page-data collection, so a bare
 * `toNextJsHandler(getAuth())` export would require DATABASE_URL /
 * BETTER_AUTH_SECRET to exist at build time, which M2's foundation-only
 * scope (no live database yet) must not require.
 */
export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}

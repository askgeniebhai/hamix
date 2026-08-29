import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

/**
 * Better Auth foundation — configured with the `organization()` plugin
 * per docs/M1_ARCHITECTURE_DECISION.md's multi-tenancy model, but not
 * wired into any UI yet (no sign-in/sign-up pages, no session usage).
 * Lazily constructed for the same reason as lib/db and lib/env: importing
 * this module must never require live secrets unless something actually
 * calls getAuth().
 */
type Auth = ReturnType<typeof betterAuth>;

let cached: Auth | undefined;

export function getAuth(): Auth {
  if (!cached) {
    const env = getEnv();
    const options: BetterAuthOptions = {
      database: drizzleAdapter(getDb(), { provider: "pg" }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      emailAndPassword: {
        enabled: true,
      },
      plugins: [organization()],
    };
    cached = betterAuth(options);
  }
  return cached;
}

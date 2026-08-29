import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

import { getDb } from "@/lib/db";
import { board } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";

/**
 * Better Auth foundation — configured with the `organization()` plugin
 * per docs/M1_ARCHITECTURE_DECISION.md's multi-tenancy model. Wired
 * into real signup/login/workspace UI as of M3.
 *
 * `createAuth()` passes its config straight into `betterAuth(...)` as
 * an inline object literal (no intermediate `: BetterAuthOptions`
 * annotation) so TypeScript infers the precise type — including the
 * `organization()` plugin's session/schema extensions (e.g.
 * `session.activeOrganizationId`). Annotating the options object with
 * the general `BetterAuthOptions` interface would widen it and erase
 * those plugin-specific fields from every caller's inferred types.
 *
 * Lazily constructed for the same reason as lib/db and lib/env:
 * importing this module must never require live secrets unless
 * something actually calls getAuth().
 */
function createAuth() {
  const env = getEnv();
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg" }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization({
        organizationHooks: {
          // Every organization gets exactly one feedback board,
          // created atomically alongside it — see
          // docs/M1_ARCHITECTURE_DECISION.md's Board entity and
          // DECISIONS.md D4-001. Reuses the organization's own
          // (already globally unique) slug so the public portal URL
          // is simply /b/[organization-slug], with no separate board
          // slug for the user to name.
          afterCreateOrganization: async ({ organization: org }) => {
            await getDb().insert(board).values({
              organizationId: org.id,
              slug: org.slug,
              name: org.name,
            });
          },
        },
      }),
    ],
    // Better Auth enables rate limiting by default only in production
    // — which is exactly what `next build && next start` is, including
    // when that's the E2E test suite's own webServer. Real users never
    // send the volume of signups/logins a test suite does in seconds,
    // so leaving the default on there throttles the tests, not abuse.
    // Disabled only when CI=true (this repo's E2E pipeline); a real
    // production deployment (CI unset) keeps Better Auth's default
    // protection.
    ...(process.env.CI ? { rateLimit: { enabled: false } } : {}),
  });
}

type Auth = ReturnType<typeof createAuth>;

let cached: Auth | undefined;

export function getAuth(): Auth {
  if (!cached) {
    cached = createAuth();
  }
  return cached;
}

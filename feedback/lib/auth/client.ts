import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * Better Auth React client foundation. Not imported by any page yet —
 * account/workspace UI is out of scope for M2 — but present so the
 * client-side half of the auth foundation exists alongside the server
 * half (lib/auth/index.ts).
 */
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

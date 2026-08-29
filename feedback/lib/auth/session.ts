import "server-only";

import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";

export type Session = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>
>;

/**
 * The authenticated session, or null. Never redirects. Wrapped in
 * React's `cache()` so a layout and its page can each call this (or
 * requireSession/requireActiveOrganization) without issuing duplicate
 * session lookups within the same request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // `headers()` must be called (and its dynamic-usage signal registered)
  // before `getAuth()` constructs the lazy auth/env singleton — reversing
  // this order lets `next build`'s static-generation pass reach `getEnv()`
  // before Next has any reason to treat the route as dynamic, so a page
  // with no env vars set at build time fails instead of correctly
  // deferring to request time.
  const headers = await nextHeaders();
  const session = await getAuth().api.getSession({ headers });
  return session ?? null;
});

/** The authenticated session, redirecting to /login if there isn't one. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

/**
 * The tenant-aware data-access entry point: the caller's active
 * organization, re-verified against the `member` table rather than
 * trusted from the session cookie alone — the single place that
 * decides "which organization does this request act on," so every
 * future tenant-scoped query goes through this, not a client-supplied
 * organization id (docs/M1_ARCHITECTURE_DECISION.md's multi-tenancy
 * model). Redirects to /login (no session) or /onboarding (session,
 * but no active/valid organization membership).
 *
 * A freshly created session (e.g. right after logging back in) has no
 * `activeOrganizationId` even if the user already belongs to a
 * workspace from a previous session — Better Auth doesn't carry it
 * forward automatically. So a missing active org isn't immediately
 * treated as "no workspace": this looks up the user's most recent
 * membership and, if one exists, activates it via Better Auth's own
 * `setActiveOrganization` API before proceeding, so "workspace
 * persists across logout/login" holds without a visible detour
 * through /onboarding.
 */
export const requireActiveOrganization = cache(async (): Promise<{
  session: Session;
  organization: ActiveOrganization;
}> => {
  const session = await requireSession();
  let activeOrganizationId = session.session.activeOrganizationId;

  if (!activeOrganizationId) {
    const [mostRecent] = await getDb()
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, session.user.id))
      .orderBy(desc(member.createdAt))
      .limit(1);

    if (!mostRecent) {
      redirect("/onboarding");
    }

    const headers = await nextHeaders();
    await getAuth().api.setActiveOrganization({
      headers,
      body: { organizationId: mostRecent.organizationId },
    });
    activeOrganizationId = mostRecent.organizationId;
  }

  const [row] = await getDb()
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, activeOrganizationId),
      ),
    )
    .limit(1);

  if (!row) {
    // The session claims an active org this user isn't (or is no
    // longer) a member of — never trust it. Treat as "no workspace".
    redirect("/onboarding");
  }

  return { session, organization: row };
});

/** All organizations the given user is a member of, for a workspace switcher. */
export const listUserOrganizations = cache(async (
  userId: string,
): Promise<ActiveOrganization[]> => {
  return getDb()
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId));
});

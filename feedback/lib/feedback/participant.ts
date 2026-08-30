import "server-only";

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { participant } from "@/lib/db/schema";

const COOKIE_PREFIX = "fb_participant_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function cookieName(organizationId: string) {
  return `${COOKIE_PREFIX}${organizationId}`;
}

export interface Participant {
  id: string;
  organizationId: string;
  email: string;
  name: string;
}

/**
 * The external feedback participant identified on this device for
 * this organization's board, from a per-organization cookie — or
 * `null` if this browser hasn't identified itself yet. Never trusts a
 * client-supplied participant/organization id: the cookie only ever
 * carries an opaque token, resolved here against the database and
 * cross-checked against `organizationId`, so a participant from one
 * organization can never resolve as a participant of another.
 */
export async function getParticipant(
  organizationId: string,
): Promise<Participant | null> {
  const store = await cookies();
  const token = store.get(cookieName(organizationId))?.value;
  if (!token) {
    return null;
  }

  const [row] = await getDb()
    .select({
      id: participant.id,
      organizationId: participant.organizationId,
      email: participant.email,
      name: participant.name,
    })
    .from(participant)
    .where(
      and(
        eq(participant.publicToken, token),
        eq(participant.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Finds or creates the participant identity for (organizationId,
 * email) — the minimum identity needed to safely attribute a
 * submission or vote — and sets the per-organization identifying
 * cookie so a returning visitor on the same device doesn't have to
 * re-enter their email. Email is lowercased/trimmed so the same
 * person can't accidentally create two identities by casing alone.
 */
export async function identifyParticipant(
  organizationId: string,
  input: { name: string; email: string },
): Promise<Participant> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const token = crypto.randomUUID();

  const [row] = await getDb()
    .insert(participant)
    .values({ organizationId, email, name, publicToken: token })
    .onConflictDoUpdate({
      target: [participant.organizationId, participant.email],
      set: { name },
    })
    .returning({
      id: participant.id,
      organizationId: participant.organizationId,
      email: participant.email,
      name: participant.name,
      publicToken: participant.publicToken,
    });

  const store = await cookies();
  store.set(cookieName(organizationId), row.publicToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return row;
}

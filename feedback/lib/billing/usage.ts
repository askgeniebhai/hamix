import "server-only";

import { and, eq, exists, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { comment, participant, post, vote } from "@/lib/db/schema";
import { getOrganizationBilling } from "@/lib/billing/data";
import { resolveEffectivePlan, trackedParticipantLimitFor, type BillingPlan } from "@/lib/billing/plans";

/**
 * The tracked-participant metric (M9 Part E) — the *only* place this
 * number is computed. "Tracked" means an external participant who has
 * generated real product demand: submitted a request, cast a vote, or
 * posted a customer comment. A participant who has only followed a
 * request for updates, or who was created but never actually did
 * anything (both real, reachable states — see
 * `lib/feedback/participant.ts`'s identify flow), is not tracked and
 * does not count. An internal workspace member's reply
 * (`comment.authorUserId`, never `comment.participantId`) is never
 * counted either way — it isn't a participant row at all.
 *
 * Built with the query builder's own `exists()`/`eq()`/`or()`, not a
 * raw `sql` template with an interpolated bare `Column` — the
 * standing rule `DECISIONS.md` D8-006 established after two
 * independent regressions of the same unqualified-identifier bug.
 */
function qualifyingActivityCondition() {
  return or(
    exists(
      getDb()
        .select({ one: sql`1` })
        .from(post)
        .where(eq(post.participantId, participant.id)),
    ),
    exists(
      getDb()
        .select({ one: sql`1` })
        .from(vote)
        .where(eq(vote.participantId, participant.id)),
    ),
    exists(
      getDb()
        .select({ one: sql`1` })
        .from(comment)
        .where(eq(comment.participantId, participant.id)),
    ),
  );
}

/** The canonical tracked-participant count for one organization. */
export async function countTrackedParticipants(organizationId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(participant)
    .where(
      and(
        eq(participant.organizationId, organizationId),
        qualifyingActivityCondition(),
      ),
    );
  return row?.count ?? 0;
}

/** Whether a specific participant already has qualifying activity — i.e. is already counted, so a new qualifying action of theirs doesn't grow the tracked count. */
export async function isParticipantTracked(participantId: string): Promise<boolean> {
  const [postRow] = await getDb()
    .select({ id: post.id })
    .from(post)
    .where(eq(post.participantId, participantId))
    .limit(1);
  if (postRow) return true;

  const [voteRow] = await getDb()
    .select({ id: vote.id })
    .from(vote)
    .where(eq(vote.participantId, participantId))
    .limit(1);
  if (voteRow) return true;

  const [commentRow] = await getDb()
    .select({ id: comment.id })
    .from(comment)
    .where(eq(comment.participantId, participantId))
    .limit(1);
  return !!commentRow;
}

export interface Entitlement {
  /** The plan the org is *actually* entitled to right now — `plan` gated by `status` (`lib/billing/plans.ts`'s `resolveEffectivePlan`). */
  plan: BillingPlan;
  /** The plan the org's subscription is nominally for, regardless of whether `status` currently entitles it — for display ("You're on Pro, but your last payment failed"), never for enforcement. */
  rawPlan: BillingPlan;
  status: string;
  trackedParticipantCount: number;
  trackedParticipantLimit: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
}

/** The single composed view of "what can this organization do right now" — the admin billing page and the limit-enforcement check both read this, never the raw billing row or a hand-rolled count separately. */
export async function getEntitlement(organizationId: string): Promise<Entitlement> {
  const [billing, trackedParticipantCount] = await Promise.all([
    getOrganizationBilling(organizationId),
    countTrackedParticipants(organizationId),
  ]);

  const plan = resolveEffectivePlan({ plan: billing.plan, status: billing.status });
  return {
    plan,
    rawPlan: billing.plan,
    status: billing.status,
    trackedParticipantCount,
    trackedParticipantLimit: trackedParticipantLimitFor(plan),
    cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
    currentPeriodEnd: billing.currentPeriodEnd,
  };
}

export class TrackedParticipantLimitReachedError extends Error {
  constructor(public readonly limit: number) {
    super(
      `This workspace has reached its plan's tracked-participant limit (${limit}). Existing participants can keep interacting normally; upgrading to Pro raises the limit for new participants.`,
    );
    this.name = "TrackedParticipantLimitReachedError";
  }
}

/**
 * The single enforcement point for M9 Part G's limit rule, called
 * before any write that could make a participant newly tracked
 * (`createPost`, `castVote`, `createExternalComment` in
 * `lib/feedback/data.ts`). An already-tracked participant is always
 * let through unconditionally — the limit only ever blocks a
 * *new* tracked participant from being created past entitlement, it
 * never revokes or blocks an existing one's continued activity
 * ("existing tracked participants can continue normal interaction",
 * M9 Part G).
 *
 * This check and the write that follows it are not wrapped in a
 * shared lock the way `lib/changelog/data.ts`'s entry mutations are
 * (`DECISIONS.md` D8-007) — a business usage cap enforced at this
 * scale (dozens of participants, not a security boundary) doesn't
 * carry the same correctness stakes as a TOCTOU race in billing
 * state or public content, and the plan's own limit (25/100) has
 * enough headroom that an occasional single-request race letting one
 * participant slip past the boundary is an accepted, documented
 * tradeoff, not a defect — see `DECISIONS.md`'s tracked-participant
 * entry.
 */
export async function assertWithinParticipantLimit(
  organizationId: string,
  participantId: string,
): Promise<void> {
  const alreadyTracked = await isParticipantTracked(participantId);
  if (alreadyTracked) {
    return;
  }

  const entitlement = await getEntitlement(organizationId);
  if (entitlement.trackedParticipantCount >= entitlement.trackedParticipantLimit) {
    throw new TrackedParticipantLimitReachedError(entitlement.trackedParticipantLimit);
  }
}

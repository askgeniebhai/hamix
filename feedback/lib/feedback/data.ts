import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { board, participant, post, vote } from "@/lib/db/schema";

/**
 * Tenant-scoped data access for the feedback domain (Board, Post,
 * Vote — docs/M1_ARCHITECTURE_DECISION.md). Every function here that
 * touches a specific record either takes an `organizationId` and
 * filters by it directly, or (for the public board lookup, where no
 * organization is known yet) is the one place that resolves which
 * organization a request is even acting on — callers never pass an
 * organization id sourced from anywhere other than a server-side
 * lookup (a resolved board, or `requireActiveOrganization()`), per
 * the M3 tenant-boundary pattern in `lib/auth/session.ts`.
 */

export interface Board {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
}

const boardColumns = {
  id: board.id,
  organizationId: board.organizationId,
  slug: board.slug,
  name: board.name,
};

/** Resolves the public board for a `/b/[slug]` request. Slugs are globally unique, so this alone determines the tenant. */
export async function getBoardBySlug(slug: string): Promise<Board | null> {
  const [row] = await getDb()
    .select(boardColumns)
    .from(board)
    .where(eq(board.slug, slug))
    .limit(1);
  return row ?? null;
}

/** The active organization's own board, for the admin feedback view. */
export async function getBoardForOrganization(
  organizationId: string,
): Promise<Board | null> {
  const [row] = await getDb()
    .select(boardColumns)
    .from(board)
    .where(eq(board.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

export interface FeedbackPost {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  voteCount: number;
  votedByViewer: boolean;
}

/** Posts on a public board, with vote counts and whether the given viewer (if identified) has voted on each. */
export async function listBoardPosts(
  boardId: string,
  viewerParticipantId: string | null,
): Promise<FeedbackPost[]> {
  const voteCount = sql<number>`count(distinct ${vote.id})`.mapWith(Number);
  const votedByViewer = viewerParticipantId
    ? sql<boolean>`bool_or(${vote.participantId} = ${viewerParticipantId})`
    : sql<boolean>`false`;

  return getDb()
    .select({
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      voteCount,
      votedByViewer,
    })
    .from(post)
    .leftJoin(vote, eq(vote.postId, post.id))
    .where(eq(post.boardId, boardId))
    .groupBy(post.id)
    .orderBy(desc(voteCount), desc(post.createdAt));
}

/** Creates a post. `boardId`/`organizationId` must already be resolved server-side (from `getBoardBySlug`), never taken from client input directly. */
export async function createPost(input: {
  organizationId: string;
  boardId: string;
  participantId: string;
  title: string;
  description: string;
}): Promise<{ id: string }> {
  const [row] = await getDb().insert(post).values(input).returning({ id: post.id });
  return row;
}

/**
 * Casts one vote for (postId, participantId). Race-safe: the
 * database's `vote_post_participant_uidx` unique index — not this
 * check — is what actually prevents a duplicate vote under
 * concurrent requests; `onConflictDoNothing()` just makes a repeat
 * call idempotent instead of erroring.
 */
export async function castVote(input: {
  organizationId: string;
  postId: string;
  participantId: string;
}): Promise<void> {
  const [row] = await getDb()
    .select({ id: post.id })
    .from(post)
    .where(
      and(eq(post.id, input.postId), eq(post.organizationId, input.organizationId)),
    )
    .limit(1);
  if (!row) {
    throw new Error("Post not found in this organization");
  }

  await getDb()
    .insert(vote)
    .values({
      organizationId: input.organizationId,
      postId: input.postId,
      participantId: input.participantId,
    })
    .onConflictDoNothing();
}

/** Removes a vote, scoped to the organization so a stray cross-tenant id can never delete another tenant's vote. */
export async function removeVote(input: {
  organizationId: string;
  postId: string;
  participantId: string;
}): Promise<void> {
  await getDb()
    .delete(vote)
    .where(
      and(
        eq(vote.postId, input.postId),
        eq(vote.participantId, input.participantId),
        eq(vote.organizationId, input.organizationId),
      ),
    );
}

export interface AdminFeedbackPost {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  voteCount: number;
  submitterName: string;
  submitterEmail: string;
}

/** All posts for the organization's board, for the protected admin feedback view. */
export async function listOrganizationPostsForAdmin(
  organizationId: string,
): Promise<AdminFeedbackPost[]> {
  const voteCount = sql<number>`count(distinct ${vote.id})`.mapWith(Number);

  return getDb()
    .select({
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      voteCount,
      submitterName: participant.name,
      submitterEmail: participant.email,
    })
    .from(post)
    .innerJoin(participant, eq(participant.id, post.participantId))
    .leftJoin(vote, eq(vote.postId, post.id))
    .where(eq(post.organizationId, organizationId))
    .groupBy(post.id, participant.name, participant.email)
    .orderBy(desc(voteCount), desc(post.createdAt));
}

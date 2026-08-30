import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { board, comment, participant, post, user, vote } from "@/lib/db/schema";

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
  commentCount: number;
}

/** Posts on a public board, with vote/comment counts and whether the given viewer (if identified) has voted on each. */
export async function listBoardPosts(
  boardId: string,
  viewerParticipantId: string | null,
): Promise<FeedbackPost[]> {
  const voteCount = sql<number>`count(distinct ${vote.id})`.mapWith(Number);
  const commentCount = sql<number>`count(distinct ${comment.id})`.mapWith(Number);
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
      commentCount,
    })
    .from(post)
    .leftJoin(vote, eq(vote.postId, post.id))
    .leftJoin(comment, eq(comment.postId, post.id))
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
 * Confirms `postId` belongs to `organizationId` before any write that
 * targets it — the one check every mutation below shares, so a
 * cross-tenant `postId` (however it arrived) is always rejected
 * before it can affect a vote or comment.
 */
async function assertPostInOrganization(
  organizationId: string,
  postId: string,
): Promise<void> {
  const [row] = await getDb()
    .select({ id: post.id })
    .from(post)
    .where(and(eq(post.id, postId), eq(post.organizationId, organizationId)))
    .limit(1);
  if (!row) {
    throw new Error("Post not found in this organization");
  }
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
  await assertPostInOrganization(input.organizationId, input.postId);

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
  commentCount: number;
  submitterName: string;
  submitterEmail: string;
}

/** All posts for the organization's board, for the protected admin feedback view. */
export async function listOrganizationPostsForAdmin(
  organizationId: string,
): Promise<AdminFeedbackPost[]> {
  const voteCount = sql<number>`count(distinct ${vote.id})`.mapWith(Number);
  const commentCount = sql<number>`count(distinct ${comment.id})`.mapWith(Number);

  return getDb()
    .select({
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      voteCount,
      commentCount,
      submitterName: participant.name,
      submitterEmail: participant.email,
    })
    .from(post)
    .innerJoin(participant, eq(participant.id, post.participantId))
    .leftJoin(vote, eq(vote.postId, post.id))
    .leftJoin(comment, eq(comment.postId, post.id))
    .where(eq(post.organizationId, organizationId))
    .groupBy(post.id, participant.name, participant.email)
    .orderBy(desc(voteCount), desc(post.createdAt));
}

export interface PostDetail {
  id: string;
  boardId: string;
  title: string;
  description: string;
  createdAt: Date;
  voteCount: number;
  votedByViewer: boolean;
  submitterName: string;
}

/** A single post for the public detail page, scoped to the board it must belong to. */
export async function getPostForBoard(
  boardId: string,
  postId: string,
  viewerParticipantId: string | null,
): Promise<PostDetail | null> {
  const voteCount = sql<number>`count(distinct ${vote.id})`.mapWith(Number);
  const votedByViewer = viewerParticipantId
    ? sql<boolean>`bool_or(${vote.participantId} = ${viewerParticipantId})`
    : sql<boolean>`false`;

  const [row] = await getDb()
    .select({
      id: post.id,
      boardId: post.boardId,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      voteCount,
      votedByViewer,
      submitterName: participant.name,
    })
    .from(post)
    .innerJoin(participant, eq(participant.id, post.participantId))
    .leftJoin(vote, eq(vote.postId, post.id))
    .where(and(eq(post.id, postId), eq(post.boardId, boardId)))
    .groupBy(post.id, participant.name)
    .limit(1);

  return row ?? null;
}

export interface AdminPostDetail extends PostDetail {
  submitterEmail: string;
}

/** A single post for the protected admin thread view, scoped to the caller's organization. */
export async function getPostForOrganization(
  organizationId: string,
  postId: string,
): Promise<AdminPostDetail | null> {
  const voteCount = sql<number>`count(distinct ${vote.id})`.mapWith(Number);

  const [row] = await getDb()
    .select({
      id: post.id,
      boardId: post.boardId,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      voteCount,
      votedByViewer: sql<boolean>`false`,
      submitterName: participant.name,
      submitterEmail: participant.email,
    })
    .from(post)
    .innerJoin(participant, eq(participant.id, post.participantId))
    .leftJoin(vote, eq(vote.postId, post.id))
    .where(and(eq(post.id, postId), eq(post.organizationId, organizationId)))
    .groupBy(post.id, participant.name, participant.email)
    .limit(1);

  return row ?? null;
}

export interface FeedbackComment {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string;
  authorKind: "customer" | "team";
}

/** Comments on a post, oldest first, tenant-scoped. Author display name/kind is resolved from whichever of participant/author-user is set — the same XOR the database enforces (`DECISIONS.md` D5-001). */
export async function listCommentsForPost(
  organizationId: string,
  postId: string,
): Promise<FeedbackComment[]> {
  const rows = await getDb()
    .select({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      participantName: participant.name,
      authorUserName: user.name,
    })
    .from(comment)
    .leftJoin(participant, eq(participant.id, comment.participantId))
    .leftJoin(user, eq(user.id, comment.authorUserId))
    .where(and(eq(comment.postId, postId), eq(comment.organizationId, organizationId)))
    .orderBy(asc(comment.createdAt));

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    authorName: row.participantName ?? row.authorUserName ?? "Unknown",
    authorKind: row.participantName ? "customer" : "team",
  }));
}

/** A public reply from an external feedback participant. `participantId` must already be resolved server-side (cookie or freshly identified) — never a client-supplied id. */
export async function createExternalComment(input: {
  organizationId: string;
  postId: string;
  participantId: string;
  body: string;
}): Promise<{ id: string }> {
  await assertPostInOrganization(input.organizationId, input.postId);

  const [row] = await getDb()
    .insert(comment)
    .values({
      organizationId: input.organizationId,
      postId: input.postId,
      participantId: input.participantId,
      body: input.body,
    })
    .returning({ id: comment.id });
  return row;
}

/** A public reply from an authenticated workspace member. `authorUserId` must come from the caller's own verified session — never a client-supplied id. */
export async function createInternalComment(input: {
  organizationId: string;
  postId: string;
  authorUserId: string;
  body: string;
}): Promise<{ id: string }> {
  await assertPostInOrganization(input.organizationId, input.postId);

  const [row] = await getDb()
    .insert(comment)
    .values({
      organizationId: input.organizationId,
      postId: input.postId,
      authorUserId: input.authorUserId,
      body: input.body,
    })
    .returning({ id: comment.id });
  return row;
}

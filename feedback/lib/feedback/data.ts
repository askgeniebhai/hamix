import "server-only";

import { and, asc, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { board, comment, member, participant, post, user, vote } from "@/lib/db/schema";
import { ROADMAP_STATUSES, type PostStatus, type RoadmapStatus } from "@/lib/feedback/status";

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
  status: PostStatus;
  createdAt: Date;
  voteCount: number;
  votedByViewer: boolean;
  commentCount: number;
}

/**
 * Scalar correlated subqueries for a post's vote/comment counts —
 * deliberately not a `leftJoin` + `count(distinct …)` + `groupBy`.
 * Joining both `vote` and `comment` onto `post` multiplies rows
 * (a post with 100 votes and 50 comments would join out to 5,000
 * rows before `GROUP BY` collapses them back down); `count(distinct)`
 * keeps that *correct*, but the database still has to build the full
 * cross product first, which gets expensive as either count grows.
 * A subquery per post, backed by `post_id` indexes already present on
 * both tables (`vote_post_id_idx`, `comment_post_id_idx`), counts each
 * independently with no fan-out at all (`DECISIONS.md` D6-002).
 */
/**
 * Built via the query builder (`.select().from().where(eq(...))`),
 * not a raw `sql` template with interpolated `Column` objects: inside
 * a `sql` tag, `${post.id}` renders as the bare identifier `"id"`
 * with no table qualifier, which — once nested inside a subquery
 * whose own FROM table (`vote`/`comment`) happens to also have an
 * `id` column — resolves to *that* table's `id`, not the outer
 * post's, so the correlation silently matches nothing. The query
 * builder's own `eq()` qualifies both sides with their real table
 * names (`"vote"."post_id" = "post"."id"`), which is what actually
 * correlates correctly.
 */
function voteCountSubquery() {
  return sql<number>`(${getDb()
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(vote)
    .where(eq(vote.postId, post.id))})`.mapWith(Number);
}

function commentCountSubquery() {
  return sql<number>`(${getDb()
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(comment)
    .where(eq(comment.postId, post.id))})`.mapWith(Number);
}

function votedByViewerSubquery(viewerParticipantId: string | null) {
  if (!viewerParticipantId) {
    return sql<boolean>`false`;
  }
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(vote)
      .where(
        and(eq(vote.postId, post.id), eq(vote.participantId, viewerParticipantId)),
      ),
  ).mapWith(Boolean) as SQL<boolean>;
}

/** Escapes `%`/`_`/`\` in a literal search term so it can't be read as ILIKE wildcard syntax — a search for `100%` must not also match `100 days`. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Posts on a public board, with vote/comment counts and whether the given viewer (if identified) has voted on each. */
export async function listBoardPosts(
  boardId: string,
  viewerParticipantId: string | null,
): Promise<FeedbackPost[]> {
  const voteCount = voteCountSubquery();
  const commentCount = commentCountSubquery();
  const votedByViewer = votedByViewerSubquery(viewerParticipantId);

  return getDb()
    .select({
      id: post.id,
      title: post.title,
      description: post.description,
      status: post.status,
      createdAt: post.createdAt,
      voteCount,
      votedByViewer,
      commentCount,
    })
    .from(post)
    .where(eq(post.boardId, boardId))
    .orderBy(desc(voteCount), desc(post.createdAt));
}

export interface RoadmapPost {
  id: string;
  title: string;
  status: RoadmapStatus;
  statusChangedAt: Date;
  voteCount: number;
  commentCount: number;
}

/**
 * Posts on a public board's Roadmap (`/b/[slug]/roadmap`) — only
 * `planned`/`in_progress`/`complete`, filtered at the database level
 * (never fetched as the full board and narrowed in the browser),
 * backed by the compound `post_board_id_status_idx`
 * (`lib/db/feedback-schema.ts`) so the extra `status` predicate is a
 * direct index lookup, not a scan of every status for the board
 * (`DECISIONS.md` D7-001). Ordering (newest `statusChangedAt` first
 * within a status) is left to the database too; the caller groups the
 * already-small result into its three sections for rendering, which
 * is not the same as filtering an unbounded list client-side.
 */
export async function listRoadmapPosts(boardId: string): Promise<RoadmapPost[]> {
  const voteCount = voteCountSubquery();
  const commentCount = commentCountSubquery();

  const rows = await getDb()
    .select({
      id: post.id,
      title: post.title,
      status: post.status,
      statusChangedAt: post.statusChangedAt,
      voteCount,
      commentCount,
    })
    .from(post)
    .where(and(eq(post.boardId, boardId), inArray(post.status, ROADMAP_STATUSES)))
    .orderBy(desc(post.statusChangedAt));

  return rows as RoadmapPost[];
}

/**
 * Creates a post. `boardId`/`organizationId` must already be resolved
 * server-side (from `getBoardBySlug`), never taken from client input
 * directly. Re-verifies both `boardId` and `participantId` actually
 * belong to `organizationId` before writing — the board lookup that
 * produced `organizationId` and the participant lookup that produced
 * `participantId` happen in different requests (a returning visitor's
 * participant was identified long before this specific submission),
 * so this is the one place that confirms they still agree.
 */
export async function createPost(input: {
  organizationId: string;
  boardId: string;
  participantId: string;
  title: string;
  description: string;
}): Promise<{ id: string }> {
  await assertBoardInOrganization(input.organizationId, input.boardId);
  await assertParticipantInOrganization(input.organizationId, input.participantId);

  const [row] = await getDb().insert(post).values(input).returning({ id: post.id });
  return row;
}

/**
 * Tenant-scope assertions shared by every write below. Each mutation
 * re-verifies every id it's handed — a `postId`, a `boardId`, a
 * `participantId`, an `authorUserId` — actually belongs to the
 * organization the request claims to act on, rather than trusting
 * that the caller (a server action, today; anything else tomorrow)
 * already got it right. This is deliberate defense-in-depth: today's
 * server actions only ever pass ids they resolved server-side
 * themselves, but the data layer is the one place this repository
 * treats as the actual tenant boundary, so it does not rely on that
 * holding true forever.
 */

/** Confirms `postId` belongs to `organizationId`. */
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

/** Confirms `boardId` belongs to `organizationId`. */
async function assertBoardInOrganization(
  organizationId: string,
  boardId: string,
): Promise<void> {
  const [row] = await getDb()
    .select({ id: board.id })
    .from(board)
    .where(and(eq(board.id, boardId), eq(board.organizationId, organizationId)))
    .limit(1);
  if (!row) {
    throw new Error("Board not found in this organization");
  }
}

/** Confirms `participantId` belongs to `organizationId` — a participant identified for one organization can never act as a participant of another. */
async function assertParticipantInOrganization(
  organizationId: string,
  participantId: string,
): Promise<void> {
  const [row] = await getDb()
    .select({ id: participant.id })
    .from(participant)
    .where(
      and(
        eq(participant.id, participantId),
        eq(participant.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error("Participant not found in this organization");
  }
}

/** Confirms `userId` is currently a member of `organizationId` — required before any write attributed to an internal team author. */
async function assertAuthorIsMember(
  organizationId: string,
  userId: string,
): Promise<void> {
  const [row] = await getDb()
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  if (!row) {
    throw new Error("User is not a member of this organization");
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
  await assertParticipantInOrganization(input.organizationId, input.participantId);

  await getDb()
    .insert(vote)
    .values({
      organizationId: input.organizationId,
      postId: input.postId,
      participantId: input.participantId,
    })
    .onConflictDoNothing();
}

/**
 * Removes a vote. No separate assertion call is needed here (unlike
 * the writes above): the `DELETE`'s own `WHERE` clause already
 * requires `organizationId` to match the vote row directly, so a
 * cross-tenant `postId`/`participantId` combination simply matches
 * zero rows — there is no state it could reach that isn't already
 * scoped to the caller's own organization.
 */
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
  status: PostStatus;
  createdAt: Date;
  voteCount: number;
  commentCount: number;
  submitterName: string;
  submitterEmail: string;
}

export interface AdminPostListFilters {
  /** Case-insensitive substring match against title OR description. */
  query?: string;
  status?: PostStatus;
  /** Defaults to "newest" — a live review queue reads newest-first; "votes"/"comments" triage by demand or discussion. */
  sort?: "newest" | "votes" | "comments";
}

/**
 * All posts for the organization's board, for the protected admin
 * feedback view — searchable, filterable by status, sortable, all
 * pushed down to the database (a `WHERE`/`ORDER BY` on an indexed
 * query, not "fetch everything and filter in the browser").
 */
export async function listOrganizationPostsForAdmin(
  organizationId: string,
  filters: AdminPostListFilters = {},
): Promise<AdminFeedbackPost[]> {
  const voteCount = voteCountSubquery();
  const commentCount = commentCountSubquery();

  const conditions = [eq(post.organizationId, organizationId)];
  if (filters.status) {
    conditions.push(eq(post.status, filters.status));
  }
  if (filters.query) {
    const pattern = `%${escapeLikePattern(filters.query)}%`;
    const textMatch = or(ilike(post.title, pattern), ilike(post.description, pattern));
    if (textMatch) {
      conditions.push(textMatch);
    }
  }

  const orderBy =
    filters.sort === "votes"
      ? [desc(voteCount), desc(post.createdAt)]
      : filters.sort === "comments"
        ? [desc(commentCount), desc(post.createdAt)]
        : [desc(post.createdAt)];

  return getDb()
    .select({
      id: post.id,
      title: post.title,
      description: post.description,
      status: post.status,
      createdAt: post.createdAt,
      voteCount,
      commentCount,
      submitterName: participant.name,
      submitterEmail: participant.email,
    })
    .from(post)
    .innerJoin(participant, eq(participant.id, post.participantId))
    .where(and(...conditions))
    .orderBy(...orderBy);
}

/**
 * Updates a post's status. Tenant-scoped via the same
 * `assertPostInOrganization` check every other mutation uses — a
 * cross-tenant `postId` is rejected before any write happens. Callers
 * (the admin status-change action) are responsible for verifying the
 * caller is an authenticated member of `organizationId` first
 * (`requireActiveOrganization()`); this function only enforces that
 * the post itself belongs to that organization.
 *
 * `statusChangedAt` is only touched when the new status actually
 * differs from the current one — a single atomic `UPDATE` (a `CASE`
 * comparing the row's own pre-update `status`), not a separate
 * read-then-write, so this stays correct under concurrent requests
 * and a "change" to the same status is a true no-op for that column.
 */
export async function updatePostStatus(input: {
  organizationId: string;
  postId: string;
  status: PostStatus;
}): Promise<void> {
  await assertPostInOrganization(input.organizationId, input.postId);

  await getDb()
    .update(post)
    .set({
      status: input.status,
      statusChangedAt: sql`case when ${post.status} = ${input.status} then ${post.statusChangedAt} else now() end`,
    })
    .where(and(eq(post.id, input.postId), eq(post.organizationId, input.organizationId)));
}

export interface PostDetail {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: PostStatus;
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
  const voteCount = voteCountSubquery();
  const votedByViewer = votedByViewerSubquery(viewerParticipantId);

  const [row] = await getDb()
    .select({
      id: post.id,
      boardId: post.boardId,
      title: post.title,
      description: post.description,
      status: post.status,
      createdAt: post.createdAt,
      voteCount,
      votedByViewer,
      submitterName: participant.name,
    })
    .from(post)
    .innerJoin(participant, eq(participant.id, post.participantId))
    .where(and(eq(post.id, postId), eq(post.boardId, boardId)))
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
  const voteCount = voteCountSubquery();

  const [row] = await getDb()
    .select({
      id: post.id,
      boardId: post.boardId,
      title: post.title,
      description: post.description,
      status: post.status,
      createdAt: post.createdAt,
      voteCount,
      votedByViewer: sql<boolean>`false`,
      submitterName: participant.name,
      submitterEmail: participant.email,
    })
    .from(post)
    .innerJoin(participant, eq(participant.id, post.participantId))
    .where(and(eq(post.id, postId), eq(post.organizationId, organizationId)))
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
  await assertParticipantInOrganization(input.organizationId, input.participantId);

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
  await assertAuthorIsMember(input.organizationId, input.authorUserId);

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

import "server-only";

import { and, desc, eq, exists, inArray, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  board,
  changelogEntry,
  changelogEntryPost,
  changelogNotification,
  organization,
  participant,
  post,
  postSubscription,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import {
  assertAuthorIsMember,
  commentCountSubquery,
  getBoardForOrganization,
  voteCountSubquery,
} from "@/lib/feedback/data";
import { getEmailTransport } from "@/lib/email/get-transport";
import { renderChangelogNotificationEmail } from "@/lib/email/templates";
import type { EmailTransport } from "@/lib/email/transport";

/**
 * Tenant-scoped data access for the Changelog domain (M8 —
 * `DECISIONS.md` D8-001–D8-005). Follows the same rule every write in
 * `lib/feedback/data.ts` already does: every id this module is handed
 * is re-verified against the claimed `organizationId` before it's
 * trusted, independent of whatever the caller already checked.
 */

export type ChangelogEntryState = "draft" | "published";

function baseUrl(): string {
  return getEnv().BETTER_AUTH_URL.replace(/\/+$/, "");
}

/** Confirms `entryId` belongs to `organizationId`, returning its current state — the one place every changelog write starts from. */
async function assertEntryInOrganization(
  organizationId: string,
  entryId: string,
): Promise<{ id: string; state: ChangelogEntryState }> {
  const [row] = await getDb()
    .select({ id: changelogEntry.id, state: changelogEntry.state })
    .from(changelogEntry)
    .where(and(eq(changelogEntry.id, entryId), eq(changelogEntry.organizationId, organizationId)))
    .limit(1);
  if (!row) {
    throw new Error("Changelog entry not found in this organization");
  }
  return row;
}

/** Creates an empty draft, ready to be edited. `createdByUserId` must come from the caller's own verified session — never client-supplied — and is re-verified as a current member of the organization here, the same defense-in-depth every other authored write in this codebase applies (`DECISIONS.md` D5-003). */
export async function createChangelogDraft(input: {
  organizationId: string;
  createdByUserId: string;
  title: string;
  body: string;
}): Promise<{ id: string }> {
  await assertAuthorIsMember(input.organizationId, input.createdByUserId);

  const [row] = await getDb()
    .insert(changelogEntry)
    .values({
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
      title: input.title,
      body: input.body,
    })
    .returning({ id: changelogEntry.id });
  return row;
}

/** Edits a draft's title/body. Rejects outright once published — a published entry's content is immutable (M8 has no unpublish/edit-after-publish). */
export async function updateChangelogDraft(input: {
  organizationId: string;
  entryId: string;
  title: string;
  body: string;
}): Promise<void> {
  const entry = await assertEntryInOrganization(input.organizationId, input.entryId);
  if (entry.state !== "draft") {
    throw new Error("Only a draft entry can be edited");
  }

  await getDb()
    .update(changelogEntry)
    .set({ title: input.title, body: input.body })
    .where(and(eq(changelogEntry.id, input.entryId), eq(changelogEntry.organizationId, input.organizationId)));
}

export interface ChangelogEntrySummary {
  id: string;
  title: string;
  state: ChangelogEntryState;
  createdAt: Date;
  publishedAt: Date | null;
  linkedPostCount: number;
}

/** All of an organization's changelog entries, newest first, for the admin `/changelog` list. */
export async function listChangelogEntriesForOrganization(
  organizationId: string,
): Promise<ChangelogEntrySummary[]> {
  const linkedPostCount = sql<number>`(${getDb()
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(changelogEntryPost)
    .where(eq(changelogEntryPost.changelogEntryId, changelogEntry.id))})`.mapWith(Number);

  const rows = await getDb()
    .select({
      id: changelogEntry.id,
      title: changelogEntry.title,
      state: changelogEntry.state,
      createdAt: changelogEntry.createdAt,
      publishedAt: changelogEntry.publishedAt,
      linkedPostCount,
    })
    .from(changelogEntry)
    .where(eq(changelogEntry.organizationId, organizationId))
    .orderBy(desc(changelogEntry.createdAt));

  return rows as ChangelogEntrySummary[];
}

export interface LinkedPost {
  id: string;
  title: string;
  voteCount: number;
  commentCount: number;
}

export interface ChangelogEntryDetail {
  id: string;
  title: string;
  body: string;
  state: ChangelogEntryState;
  createdAt: Date;
  publishedAt: Date | null;
  linkedPosts: LinkedPost[];
  notifiedCount: number;
  failedCount: number;
  pendingCount: number;
}

/** A single entry with its linked posts and notification-delivery summary, for the admin editor/preview page. */
export async function getChangelogEntryForOrganization(
  organizationId: string,
  entryId: string,
): Promise<ChangelogEntryDetail | null> {
  const [entry] = await getDb()
    .select({
      id: changelogEntry.id,
      title: changelogEntry.title,
      body: changelogEntry.body,
      state: changelogEntry.state,
      createdAt: changelogEntry.createdAt,
      publishedAt: changelogEntry.publishedAt,
    })
    .from(changelogEntry)
    .where(and(eq(changelogEntry.id, entryId), eq(changelogEntry.organizationId, organizationId)))
    .limit(1);
  if (!entry) {
    return null;
  }

  const voteCount = voteCountSubquery();
  const commentCount = commentCountSubquery();
  const linkedPosts = await getDb()
    .select({
      id: post.id,
      title: post.title,
      voteCount,
      commentCount,
    })
    .from(changelogEntryPost)
    .innerJoin(post, eq(post.id, changelogEntryPost.postId))
    .where(eq(changelogEntryPost.changelogEntryId, entryId))
    .orderBy(desc(post.statusChangedAt));

  const notificationCounts = await getDb()
    .select({ state: changelogNotification.state, count: sql<number>`count(*)`.mapWith(Number) })
    .from(changelogNotification)
    .where(eq(changelogNotification.changelogEntryId, entryId))
    .groupBy(changelogNotification.state);

  const counts = { sent: 0, failed: 0, pending: 0 };
  for (const row of notificationCounts) {
    counts[row.state] = row.count;
  }

  return {
    ...entry,
    linkedPosts: linkedPosts as LinkedPost[],
    notifiedCount: counts.sent,
    failedCount: counts.failed,
    pendingCount: counts.pending,
  };
}

export interface CompletablePost {
  id: string;
  title: string;
  voteCount: number;
  commentCount: number;
  linked: boolean;
}

/** Every `complete` post for the organization, with whether it's already linked to this draft — the feedback picker's data source. Only `complete` posts are ever returned; M8's link rule is enforced here, not just at write time. */
export async function listCompletablePosts(
  organizationId: string,
  entryId: string,
): Promise<CompletablePost[]> {
  const voteCount = voteCountSubquery();
  const commentCount = commentCountSubquery();
  // Built via the query builder's own `exists()` + `eq()`, not a raw
  // `sql` template with interpolated `Column` objects — the same
  // unqualified-identifier trap `DECISIONS.md` D6-003 documents.
  // `${post.id}` inside a bare `sql` tag renders as just `"id"`, and
  // `changelog_entry_post` has its own `id` primary key, so the
  // subquery would have silently compared its own `id` to itself
  // instead of correlating to the outer post. `eq()` qualifies both
  // sides with their real table names.
  const linked = exists(
    getDb()
      .select({ one: sql`1` })
      .from(changelogEntryPost)
      .where(
        and(
          eq(changelogEntryPost.postId, post.id),
          eq(changelogEntryPost.changelogEntryId, entryId),
        ),
      ),
  ).mapWith(Boolean) as SQL<boolean>;

  const rows = await getDb()
    .select({
      id: post.id,
      title: post.title,
      voteCount,
      commentCount,
      linked,
    })
    .from(post)
    .where(and(eq(post.organizationId, organizationId), eq(post.status, "complete")))
    .orderBy(desc(post.statusChangedAt));

  return rows as CompletablePost[];
}

/** Links a `complete` post to a draft entry. Rejects a non-`complete` post, a post from another organization, or a non-draft entry — the link rule (M8-B) enforced at the data layer, not just in the picker UI. */
export async function linkPostToChangelogEntry(input: {
  organizationId: string;
  entryId: string;
  postId: string;
}): Promise<void> {
  const entry = await assertEntryInOrganization(input.organizationId, input.entryId);
  if (entry.state !== "draft") {
    throw new Error("Only a draft entry can be linked to posts");
  }

  const [postRow] = await getDb()
    .select({ id: post.id })
    .from(post)
    .where(
      and(
        eq(post.id, input.postId),
        eq(post.organizationId, input.organizationId),
        eq(post.status, "complete"),
      ),
    )
    .limit(1);
  if (!postRow) {
    throw new Error("Only a Complete post in this organization can be linked");
  }

  await getDb()
    .insert(changelogEntryPost)
    .values({
      organizationId: input.organizationId,
      changelogEntryId: input.entryId,
      postId: input.postId,
    })
    .onConflictDoNothing();
}

/** Unlinks a post from a still-draft entry. */
export async function unlinkPostFromChangelogEntry(input: {
  organizationId: string;
  entryId: string;
  postId: string;
}): Promise<void> {
  const entry = await assertEntryInOrganization(input.organizationId, input.entryId);
  if (entry.state !== "draft") {
    throw new Error("Only a draft entry can be unlinked from posts");
  }

  await getDb()
    .delete(changelogEntryPost)
    .where(
      and(
        eq(changelogEntryPost.changelogEntryId, input.entryId),
        eq(changelogEntryPost.postId, input.postId),
        eq(changelogEntryPost.organizationId, input.organizationId),
      ),
    );
}

/** Truncated, never the raw provider error — `changelog_notification.failure_reason` is a safe, bounded diagnostic, not a place to retain arbitrary provider response bodies. */
function truncateFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 300 ? `${message.slice(0, 297)}...` : message;
}

export interface PublishResult {
  linkedPostCount: number;
  recipientCount: number;
  notifiedCount: number;
  failedCount: number;
}

/**
 * Publishes a draft — the only mutation in this domain with real side
 * effects beyond a single row. In order:
 *
 * 1. Re-verifies every linked post is *still* `complete` and still
 *    belongs to this organization ("publishing must revalidate linked
 *    posts server-side" — M8-B). A post that regressed since being
 *    linked blocks the publish outright rather than silently
 *    unlinking it.
 * 2. Atomically flips `draft` → `published` with the organization and
 *    current-state check baked into the `UPDATE`'s own `WHERE` — a
 *    concurrent second publish attempt updates zero rows and is
 *    rejected, which is what actually makes "double publish" safe,
 *    not the notification uniqueness alone.
 * 3. Computes recipients — participants with a `post_subscription` on
 *    *any* linked post, deduplicated (a participant following two of
 *    this entry's posts is one recipient, not two) — and inserts one
 *    `pending` `changelog_notification` row per recipient with
 *    `ON CONFLICT DO NOTHING`, inside the same transaction as step 2.
 * 4. Only after that transaction commits, attempts to actually send
 *    each pending notification, updating it to `sent` or `failed`
 *    (with a truncated reason) as it goes — email delivery itself
 *    can't be transactional with Postgres, so this is deliberately a
 *    separate step from the transactionally-coherent state change and
 *    recipient-row creation M8-H asks for (`DECISIONS.md` D8-004).
 */
export async function publishChangelogEntry(input: {
  organizationId: string;
  entryId: string;
  transport?: EmailTransport;
}): Promise<PublishResult> {
  const transport = input.transport ?? getEmailTransport();

  const entry = await assertEntryInOrganization(input.organizationId, input.entryId);
  if (entry.state !== "draft") {
    throw new Error("This entry has already been published");
  }

  const linkedPostRows = await getDb()
    .select({ postId: changelogEntryPost.postId })
    .from(changelogEntryPost)
    .where(eq(changelogEntryPost.changelogEntryId, input.entryId));
  const linkedPostIds = linkedPostRows.map((row) => row.postId);

  if (linkedPostIds.length > 0) {
    const stillComplete = await getDb()
      .select({ id: post.id })
      .from(post)
      .where(
        and(
          inArray(post.id, linkedPostIds),
          eq(post.organizationId, input.organizationId),
          eq(post.status, "complete"),
        ),
      );
    if (stillComplete.length !== linkedPostIds.length) {
      throw new Error(
        "One or more linked requests are no longer Complete — unlink them or wait until they are before publishing",
      );
    }
  }

  const insertedRecipients = await getDb().transaction(async (tx) => {
    const updated = await tx
      .update(changelogEntry)
      .set({ state: "published", publishedAt: new Date() })
      .where(
        and(
          eq(changelogEntry.id, input.entryId),
          eq(changelogEntry.organizationId, input.organizationId),
          eq(changelogEntry.state, "draft"),
        ),
      )
      .returning({ id: changelogEntry.id });
    if (updated.length === 0) {
      throw new Error("This entry has already been published");
    }

    if (linkedPostIds.length === 0) {
      return [];
    }

    const recipients = await tx
      .selectDistinct({
        participantId: postSubscription.participantId,
        email: participant.email,
      })
      .from(postSubscription)
      .innerJoin(participant, eq(participant.id, postSubscription.participantId))
      .where(
        and(
          inArray(postSubscription.postId, linkedPostIds),
          eq(postSubscription.organizationId, input.organizationId),
        ),
      );

    if (recipients.length === 0) {
      return [];
    }

    return tx
      .insert(changelogNotification)
      .values(
        recipients.map((recipient) => ({
          organizationId: input.organizationId,
          changelogEntryId: input.entryId,
          participantId: recipient.participantId,
          email: recipient.email,
        })),
      )
      .onConflictDoNothing()
      .returning({
        id: changelogNotification.id,
        participantId: changelogNotification.participantId,
        email: changelogNotification.email,
      });
  });

  let notifiedCount = 0;
  let failedCount = 0;

  if (insertedRecipients.length > 0) {
    const [org] = await getDb()
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, input.organizationId))
      .limit(1);
    const [entryContent] = await getDb()
      .select({ title: changelogEntry.title, body: changelogEntry.body })
      .from(changelogEntry)
      .where(eq(changelogEntry.id, input.entryId))
      .limit(1);
    const boardRow = await getBoardForOrganization(input.organizationId);
    const workspaceName = org?.name ?? "Feedback";
    const changelogUrl = boardRow ? `${baseUrl()}/b/${boardRow.slug}/changelog` : baseUrl();

    const linkedPostSummaries =
      linkedPostIds.length > 0
        ? await getDb()
            .select({ id: post.id, title: post.title })
            .from(post)
            .where(inArray(post.id, linkedPostIds))
        : [];
    const emailLinkedPosts = boardRow
      ? linkedPostSummaries.map((row) => ({
          title: row.title,
          url: `${baseUrl()}/b/${boardRow.slug}/p/${row.id}`,
        }))
      : [];

    // One query for every recipient's unsubscribe token, keyed by
    // participant — each recipient's link must remove only *their*
    // subscription(s) to *these* linked posts, never another
    // recipient's.
    const subscriptionRows =
      linkedPostIds.length > 0
        ? await getDb()
            .select({
              participantId: postSubscription.participantId,
              unsubscribeToken: postSubscription.unsubscribeToken,
            })
            .from(postSubscription)
            .where(inArray(postSubscription.postId, linkedPostIds))
        : [];
    const unsubscribeTokenByParticipant = new Map(
      subscriptionRows.map((row) => [row.participantId, row.unsubscribeToken]),
    );

    for (const recipient of insertedRecipients) {
      const unsubscribeToken = unsubscribeTokenByParticipant.get(recipient.participantId);
      const unsubscribeUrl = unsubscribeToken
        ? `${baseUrl()}/unsubscribe/${unsubscribeToken}`
        : changelogUrl;
      const recipientEmail = renderChangelogNotificationEmail({
        workspaceName,
        entryTitle: entryContent?.title ?? "",
        entryBody: entryContent?.body ?? "",
        changelogUrl,
        linkedPosts: emailLinkedPosts,
        unsubscribeUrl,
      });

      try {
        await transport.send({
          to: recipient.email,
          subject: recipientEmail.subject,
          html: recipientEmail.html,
          text: recipientEmail.text,
          idempotencyKey: recipient.id,
        });
        await getDb()
          .update(changelogNotification)
          .set({ state: "sent", sentAt: new Date() })
          .where(eq(changelogNotification.id, recipient.id));
        notifiedCount += 1;
      } catch (error) {
        await getDb()
          .update(changelogNotification)
          .set({ state: "failed", failureReason: truncateFailureReason(error) })
          .where(eq(changelogNotification.id, recipient.id));
        failedCount += 1;
      }
    }
  }

  return {
    linkedPostCount: linkedPostIds.length,
    recipientCount: insertedRecipients.length,
    notifiedCount,
    failedCount,
  };
}

export interface PublishedChangelogEntry {
  id: string;
  title: string;
  body: string;
  publishedAt: Date;
  linkedPosts: LinkedPost[];
}

/** Published entries for a public board, newest first — `/b/[slug]/changelog`'s data source. A draft is never returned, structurally: the `WHERE` clause is the only filter, not a UI-layer omission. */
export async function listPublishedChangelogEntries(
  boardId: string,
): Promise<PublishedChangelogEntry[]> {
  const entries = await getDb()
    .select({
      id: changelogEntry.id,
      title: changelogEntry.title,
      body: changelogEntry.body,
      publishedAt: changelogEntry.publishedAt,
    })
    .from(changelogEntry)
    .innerJoin(board, eq(board.organizationId, changelogEntry.organizationId))
    .where(and(eq(board.id, boardId), eq(changelogEntry.state, "published")))
    .orderBy(desc(changelogEntry.publishedAt));

  if (entries.length === 0) {
    return [];
  }

  const entryIds = entries.map((entry) => entry.id);
  const voteCount = voteCountSubquery();
  const commentCount = commentCountSubquery();
  const linkRows = await getDb()
    .select({
      entryId: changelogEntryPost.changelogEntryId,
      id: post.id,
      title: post.title,
      voteCount,
      commentCount,
    })
    .from(changelogEntryPost)
    .innerJoin(post, eq(post.id, changelogEntryPost.postId))
    .where(inArray(changelogEntryPost.changelogEntryId, entryIds));

  const linksByEntry = new Map<string, LinkedPost[]>();
  for (const row of linkRows) {
    const list = linksByEntry.get(row.entryId) ?? [];
    list.push({ id: row.id, title: row.title, voteCount: row.voteCount, commentCount: row.commentCount });
    linksByEntry.set(row.entryId, list);
  }

  return entries.map((entry) => ({
    ...entry,
    publishedAt: entry.publishedAt as Date,
    linkedPosts: linksByEntry.get(entry.id) ?? [],
  }));
}

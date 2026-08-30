import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "@/lib/db/auth-schema";

function id() {
  return text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}

/**
 * A feedback collection scoped to an Organization
 * (docs/M1_ARCHITECTURE_DECISION.md's "Board/Project" entity). M4
 * auto-creates exactly one board per organization (see
 * `lib/auth/index.ts`'s `afterCreateOrganization` hook), with
 * `slug` equal to the organization's own (already globally unique)
 * slug — the simplest well-justified public-portal URL,
 * `/b/[slug]`. The table exists independently of that 1:1 default so
 * a future milestone can support more than one board per
 * organization without a schema change.
 */
export const board = pgTable(
  "board",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Global, not per-organization: the public route (/b/[slug]) has
    // no other tenant identifier in it, so two organizations could
    // otherwise collide on the same board URL.
    uniqueIndex("board_slug_uidx").on(table.slug),
    index("board_organization_id_idx").on(table.organizationId),
  ],
);

/**
 * An external feedback participant — the person submitting or voting
 * on feedback through a public board. Deliberately not a Better Auth
 * `user`/`member`: participants never sign in and have no access to
 * the workspace. Identified by (organization, email) so the same
 * person voting on two different organizations' boards is two
 * distinct participant rows — cross-tenant vote/identity leakage is
 * structurally impossible. Corresponds to the "TrackedUser" concept
 * in docs/M1_ARCHITECTURE_DECISION.md's future domain shape, scoped
 * down to only what M4 needs (no billing/usage fields yet).
 */
export const participant = pgTable(
  "participant",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    // Opaque bearer value stored in the participant's browser cookie
    // (see lib/feedback/participant.ts) so a returning visitor doesn't
    // have to re-type their email to vote again. Low blast radius by
    // design: it only lets someone submit/vote as this participant on
    // this one organization's board, nothing account-like.
    publicToken: text("public_token").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("participant_org_email_uidx").on(
      table.organizationId,
      table.email,
    ),
    uniqueIndex("participant_public_token_uidx").on(table.publicToken),
  ],
);

/**
 * A Post's lifecycle stage, as a real Postgres enum rather than a
 * free-text column, so an invalid value is rejected by the database
 * itself, not just by application-level validation. The five values
 * and their order (docs/M1_ARCHITECTURE_DECISION.md's Status concept,
 * finalized in M6 — `DECISIONS.md` D6-001) are chosen so a future
 * Roadmap milestone can group posts by this same column directly, no
 * migration required to introduce Roadmap — only to build the view
 * over it.
 */
export const postStatus = pgEnum("post_status", [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "complete",
]);

/** A feedback/feature request, scoped to a Board → Organization. */
export const post = pgTable(
  "post",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    boardId: text("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: postStatus("status").notNull().default("open"),
    // Set at creation (equal to createdAt) and updated only when
    // updatePostStatus() actually changes the status — never touched
    // by a no-op "change" to the same value. Lets a future Roadmap
    // view sort/show "time in current status" without inferring it
    // from an audit log that doesn't exist yet.
    statusChangedAt: timestamp("status_changed_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("post_board_id_idx").on(table.boardId),
    index("post_organization_id_idx").on(table.organizationId),
    index("post_status_idx").on(table.status),
    // Backs the public Roadmap's `WHERE board_id = $1 AND status IN
    // (...)` (`lib/feedback/data.ts`'s `listRoadmapPosts`) —
    // `post_board_id_idx` alone would still need to scan every status
    // for the board.
    index("post_board_id_status_idx").on(table.boardId, table.status),
  ],
);

/**
 * One vote per (Post, Participant) — enforced by a database unique
 * constraint, not just application logic, so it stays correct under
 * concurrent requests (docs/M1_ARCHITECTURE_DECISION.md's "Vote"
 * entity).
 */
export const vote = pgTable(
  "vote",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vote_post_participant_uidx").on(
      table.postId,
      table.participantId,
    ),
    index("vote_organization_id_idx").on(table.organizationId),
    index("vote_post_id_idx").on(table.postId),
  ],
);

/**
 * A reply on a Post — a distinct entity from Post itself
 * (docs/M1_ARCHITECTURE_DECISION.md's "Comment" entity, introduced in
 * M5). Exactly one of `participantId` (an external customer reply) or
 * `authorUserId` (a workspace member's public team reply) is set,
 * never both and never neither — enforced by a database CHECK
 * constraint, not just application logic, so a bug anywhere in the
 * write path can't produce an authorless or double-authored comment
 * (`DECISIONS.md` D5-001). Both foreign keys are always resolved
 * server-side (a cookie-verified participant, or the authenticated
 * session's user) — never a client-supplied author id.
 */
export const comment = pgTable(
  "comment",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    participantId: text("participant_id").references(() => participant.id, {
      onDelete: "cascade",
    }),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("comment_post_id_idx").on(table.postId),
    index("comment_organization_id_idx").on(table.organizationId),
    check(
      "comment_exactly_one_author_chk",
      sql`(${table.participantId} is not null and ${table.authorUserId} is null) or (${table.participantId} is null and ${table.authorUserId} is not null)`,
    ),
  ],
);

export const boardRelations = relations(board, ({ one, many }) => ({
  organization: one(organization, {
    fields: [board.organizationId],
    references: [organization.id],
  }),
  posts: many(post),
}));

export const participantRelations = relations(participant, ({ one, many }) => ({
  organization: one(organization, {
    fields: [participant.organizationId],
    references: [organization.id],
  }),
  posts: many(post),
  votes: many(vote),
  comments: many(comment),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  organization: one(organization, {
    fields: [post.organizationId],
    references: [organization.id],
  }),
  board: one(board, {
    fields: [post.boardId],
    references: [board.id],
  }),
  participant: one(participant, {
    fields: [post.participantId],
    references: [participant.id],
  }),
  votes: many(vote),
  comments: many(comment),
}));

export const voteRelations = relations(vote, ({ one }) => ({
  organization: one(organization, {
    fields: [vote.organizationId],
    references: [organization.id],
  }),
  post: one(post, {
    fields: [vote.postId],
    references: [post.id],
  }),
  participant: one(participant, {
    fields: [vote.participantId],
    references: [participant.id],
  }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  organization: one(organization, {
    fields: [comment.organizationId],
    references: [organization.id],
  }),
  post: one(post, {
    fields: [comment.postId],
    references: [post.id],
  }),
  participant: one(participant, {
    fields: [comment.participantId],
    references: [participant.id],
  }),
  authorUser: one(user, {
    fields: [comment.authorUserId],
    references: [user.id],
  }),
}));

/**
 * An external participant's explicit opt-in to hear about updates on
 * one Post — the *only* thing that makes a participant an email
 * recipient (`DECISIONS.md` D8-003). Never created by submitting,
 * voting, or commenting; only by the participant clicking "Follow
 * updates" on the public detail page. `unsubscribeToken` is a
 * separate, single-purpose opaque credential (not `participant`'s own
 * `publicToken`) so an unsubscribe link that ends up in the wrong
 * hands can only remove this one subscription, never act as the
 * participant anywhere else (vote, comment, etc.).
 */
export const postSubscription = pgTable(
  "post_subscription",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    unsubscribeToken: text("unsubscribe_token")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("post_subscription_post_participant_uidx").on(
      table.postId,
      table.participantId,
    ),
    uniqueIndex("post_subscription_unsubscribe_token_uidx").on(
      table.unsubscribeToken,
    ),
    index("post_subscription_organization_id_idx").on(table.organizationId),
    index("post_subscription_participant_id_idx").on(table.participantId),
  ],
);

/**
 * A published release note — a genuine entity, not a re-rendering of
 * Post rows. Links to zero or more `Post`s through the
 * `changelog_entry_post` junction (never duplicating their
 * title/description) so "what shipped" can reference "what was
 * asked for" without the two ever drifting apart
 * (`DECISIONS.md` D8-001). `draft` is fully editable; `published` is
 * immutable content (title/body) and permanently visible on the
 * public changelog — there is no unpublish in M8.
 */
export const changelogEntryState = pgEnum("changelog_entry_state", [
  "draft",
  "published",
]);

export const changelogEntry = pgTable(
  "changelog_entry",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    state: changelogEntryState("state").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (table) => [
    index("changelog_entry_organization_id_idx").on(table.organizationId),
    // Backs both the admin list (all of an org's entries) and the
    // public changelog (published-only, newest first).
    index("changelog_entry_org_state_published_idx").on(
      table.organizationId,
      table.state,
      table.publishedAt,
    ),
  ],
);

/**
 * Junction between a changelog entry and the Post(s) it closes the
 * loop on. A row's `organizationId` is redundant with both parents'
 * (enforced by `linkPostToChangelogEntry`'s own tenant assertions,
 * `lib/changelog/data.ts`) but kept directly on the table so every
 * write in this domain can be scoped the same uniform way the rest of
 * `lib/feedback/data.ts` already is.
 */
export const changelogEntryPost = pgTable(
  "changelog_entry_post",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    changelogEntryId: text("changelog_entry_id")
      .notNull()
      .references(() => changelogEntry.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("changelog_entry_post_uidx").on(
      table.changelogEntryId,
      table.postId,
    ),
    index("changelog_entry_post_entry_id_idx").on(table.changelogEntryId),
    index("changelog_entry_post_post_id_idx").on(table.postId),
    index("changelog_entry_post_organization_id_idx").on(
      table.organizationId,
    ),
  ],
);

/**
 * One delivery record per (changelog entry, recipient participant) —
 * the outbox this project's "no queues/workers, keep delivery
 * deterministic" constraint calls for. The unique index on
 * `(changelog_entry_id, participant_id)` is what actually makes
 * publishing idempotent under a double click, a retry, or a page
 * refresh: `publishChangelogEntry()` inserts these rows with
 * `ON CONFLICT DO NOTHING`, so a repeated publish attempt on an
 * already-published entry can insert nothing new before the entry's
 * own `state` guard rejects it outright (`DECISIONS.md` D8-004).
 * `email` is copied at send time (not joined from `participant` on
 * every read) so a delivery record stays a truthful historical
 * artifact even if the participant's email ever changed.
 */
export const changelogNotificationState = pgEnum(
  "changelog_notification_state",
  ["pending", "sent", "failed"],
);

export const changelogNotification = pgTable(
  "changelog_notification",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    changelogEntryId: text("changelog_entry_id")
      .notNull()
      .references(() => changelogEntry.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    state: changelogNotificationState("state").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    sentAt: timestamp("sent_at"),
    // Truncated (see lib/changelog/data.ts) before storage — never the
    // raw provider error body, which can include request metadata not
    // meant to be retained.
    failureReason: text("failure_reason"),
  },
  (table) => [
    uniqueIndex("changelog_notification_entry_participant_uidx").on(
      table.changelogEntryId,
      table.participantId,
    ),
    index("changelog_notification_organization_id_idx").on(
      table.organizationId,
    ),
    index("changelog_notification_entry_id_idx").on(table.changelogEntryId),
  ],
);

export const postSubscriptionRelations = relations(
  postSubscription,
  ({ one }) => ({
    organization: one(organization, {
      fields: [postSubscription.organizationId],
      references: [organization.id],
    }),
    post: one(post, {
      fields: [postSubscription.postId],
      references: [post.id],
    }),
    participant: one(participant, {
      fields: [postSubscription.participantId],
      references: [participant.id],
    }),
  }),
);

export const changelogEntryRelations = relations(
  changelogEntry,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [changelogEntry.organizationId],
      references: [organization.id],
    }),
    createdByUser: one(user, {
      fields: [changelogEntry.createdByUserId],
      references: [user.id],
    }),
    links: many(changelogEntryPost),
    notifications: many(changelogNotification),
  }),
);

export const changelogEntryPostRelations = relations(
  changelogEntryPost,
  ({ one }) => ({
    organization: one(organization, {
      fields: [changelogEntryPost.organizationId],
      references: [organization.id],
    }),
    changelogEntry: one(changelogEntry, {
      fields: [changelogEntryPost.changelogEntryId],
      references: [changelogEntry.id],
    }),
    post: one(post, {
      fields: [changelogEntryPost.postId],
      references: [post.id],
    }),
  }),
);

export const changelogNotificationRelations = relations(
  changelogNotification,
  ({ one }) => ({
    organization: one(organization, {
      fields: [changelogNotification.organizationId],
      references: [organization.id],
    }),
    changelogEntry: one(changelogEntry, {
      fields: [changelogNotification.changelogEntryId],
      references: [changelogEntry.id],
    }),
    participant: one(participant, {
      fields: [changelogNotification.participantId],
      references: [participant.id],
    }),
  }),
);

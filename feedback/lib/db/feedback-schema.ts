import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { organization } from "@/lib/db/auth-schema";

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("post_board_id_idx").on(table.boardId),
    index("post_organization_id_idx").on(table.organizationId),
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

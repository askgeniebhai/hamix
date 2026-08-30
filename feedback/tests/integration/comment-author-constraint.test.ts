import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import {
  board,
  comment,
  organization,
  participant,
  post,
  user,
} from "@/lib/db/schema";
import {
  createExternalComment,
  createInternalComment,
} from "@/lib/feedback/data";

/**
 * Proves the "exactly one author type" rule (`DECISIONS.md` D5-001)
 * and tenant scoping hold at the database layer, not just in
 * `lib/feedback/data.ts`'s own code paths — a row that tries to set
 * both authors, or neither, must be rejected by Postgres itself.
 */
describe("comment author constraint and tenant scoping", () => {
  const createdOrgIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    const db = getDb();
    // Delete the organizations first — that cascades away
    // board/participant/post/comment rows referencing them. `user`
    // has no FK to `organization`, so its rows are deleted separately
    // once nothing (no comment) still references them.
    if (createdOrgIds.length > 0) {
      await db.delete(organization).where(inArray(organization.id, createdOrgIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(user).where(inArray(user.id, createdUserIds));
    }
  });

  it("rejects a comment row with both a participant and a user author", async () => {
    const db = getDb();
    const orgAId = randomUUID();
    createdOrgIds.push(orgAId);
    const boardId = randomUUID();
    const participantId = randomUUID();
    const postId = randomUUID();
    const userId = randomUUID();

    await db.insert(organization).values({
      id: orgAId,
      name: "Constraint Org A",
      slug: `constraint-org-a-${orgAId}`,
      createdAt: new Date(),
    });
    await db.insert(board).values({
      id: boardId,
      organizationId: orgAId,
      slug: `constraint-board-a-${orgAId}`,
      name: "Constraint Board A",
    });
    await db.insert(participant).values({
      id: participantId,
      organizationId: orgAId,
      email: "constraint-participant@example.com",
      name: "Constraint Participant",
      publicToken: randomUUID(),
    });
    await db.insert(post).values({
      id: postId,
      organizationId: orgAId,
      boardId,
      participantId,
      title: "Constraint post",
      description: "Used to prove the author-exclusivity check constraint.",
    });
    await db.insert(user).values({
      id: userId,
      name: "Constraint Member",
      email: `constraint-member-${userId}@example.com`,
      emailVerified: false,
    });
    createdUserIds.push(userId);

    await expect(
      db.insert(comment).values({
        organizationId: orgAId,
        postId,
        participantId,
        authorUserId: userId,
        body: "Both authors set — must be rejected.",
      }),
    ).rejects.toThrow();

    await expect(
      db.insert(comment).values({
        organizationId: orgAId,
        postId,
        body: "Neither author set — must be rejected.",
      }),
    ).rejects.toThrow();

    // Exactly one author is the only shape the constraint allows.
    const [created] = await db
      .insert(comment)
      .values({
        organizationId: orgAId,
        postId,
        participantId,
        body: "Exactly one author — allowed.",
      })
      .returning({ id: comment.id });
    expect(created.id).toBeTruthy();
  });

  it("rejects createExternalComment/createInternalComment against a post from a different organization", async () => {
    const db = getDb();
    const orgAId = randomUUID();
    const orgBId = randomUUID();
    createdOrgIds.push(orgAId, orgBId);
    const boardAId = randomUUID();
    const boardBId = randomUUID();
    const participantAId = randomUUID();
    const participantBId = randomUUID();
    const postAId = randomUUID();
    const userBId = randomUUID();

    await db.insert(organization).values([
      {
        id: orgAId,
        name: "Tenant Org A",
        slug: `tenant-org-a-${orgAId}`,
        createdAt: new Date(),
      },
      {
        id: orgBId,
        name: "Tenant Org B",
        slug: `tenant-org-b-${orgBId}`,
        createdAt: new Date(),
      },
    ]);
    await db.insert(board).values([
      { id: boardAId, organizationId: orgAId, slug: `tenant-board-a-${orgAId}`, name: "Board A" },
      { id: boardBId, organizationId: orgBId, slug: `tenant-board-b-${orgBId}`, name: "Board B" },
    ]);
    await db.insert(participant).values([
      {
        id: participantAId,
        organizationId: orgAId,
        email: "tenant-a@example.com",
        name: "Tenant A Participant",
        publicToken: randomUUID(),
      },
      {
        id: participantBId,
        organizationId: orgBId,
        email: "tenant-b@example.com",
        name: "Tenant B Participant",
        publicToken: randomUUID(),
      },
    ]);
    await db.insert(post).values({
      id: postAId,
      organizationId: orgAId,
      boardId: boardAId,
      participantId: participantAId,
      title: "Tenant A's post",
      description: "Only tenant A should ever be able to comment on this.",
    });
    await db.insert(user).values({
      id: userBId,
      name: "Tenant B Member",
      email: `tenant-b-member-${userBId}@example.com`,
      emailVerified: false,
    });
    createdUserIds.push(userBId);

    // Tenant B's participant cannot comment on tenant A's post.
    await expect(
      createExternalComment({
        organizationId: orgBId,
        postId: postAId,
        participantId: participantBId,
        body: "Cross-tenant participant comment — must be rejected.",
      }),
    ).rejects.toThrow();

    // Tenant B's workspace member cannot reply on tenant A's post.
    await expect(
      createInternalComment({
        organizationId: orgBId,
        postId: postAId,
        authorUserId: userBId,
        body: "Cross-tenant internal reply — must be rejected.",
      }),
    ).rejects.toThrow();

    // The legitimate, same-tenant write succeeds.
    const created = await createExternalComment({
      organizationId: orgAId,
      postId: postAId,
      participantId: participantAId,
      body: "Same-tenant comment — allowed.",
    });
    expect(created.id).toBeTruthy();
  });
});

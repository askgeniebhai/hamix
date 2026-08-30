import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import {
  createChangelogDraft,
  linkPostToChangelogEntry,
  publishChangelogEntry,
} from "@/lib/changelog/data";
import { getDb } from "@/lib/db";
import { board, member, organization, participant, post, user } from "@/lib/db/schema";
import { subscribeToPost, updatePostStatus } from "@/lib/feedback/data";
import { FakeEmailTransport } from "@/tests/support/fake-email-transport";

describe("changelog smoke test", () => {
  const createdOrgIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await getDb().delete(organization).where(inArray(organization.id, createdOrgIds));
    }
    if (createdUserIds.length > 0) {
      await getDb().delete(user).where(inArray(user.id, createdUserIds));
    }
  });

  it("draft -> link a Complete post -> publish -> one sent notification to the subscriber", async () => {
    const db = getDb();
    const orgId = randomUUID();
    const boardId = randomUUID();
    const participantId = randomUUID();
    const postId = randomUUID();
    const userId = randomUUID();
    createdOrgIds.push(orgId);
    createdUserIds.push(userId);

    await db.insert(organization).values({
      id: orgId,
      name: "Smoke Org",
      slug: `smoke-org-${orgId}`,
      createdAt: new Date(),
    });
    await db.insert(board).values({
      id: boardId,
      organizationId: orgId,
      slug: `smoke-board-${orgId}`,
      name: "Smoke Board",
    });
    await db.insert(participant).values({
      id: participantId,
      organizationId: orgId,
      email: "smoke-participant@example.com",
      name: "Smoke Participant",
      publicToken: randomUUID(),
    });
    await db.insert(user).values({
      id: userId,
      name: "Smoke Admin",
      email: `smoke-admin-${userId}@example.com`,
      emailVerified: true,
    });
    await db.insert(member).values({
      id: randomUUID(),
      organizationId: orgId,
      userId,
      role: "owner",
      createdAt: new Date(),
    });
    await db.insert(post).values({
      id: postId,
      organizationId: orgId,
      boardId,
      participantId,
      title: "Smoke test request",
      description: "Used to smoke test the changelog flow.",
    });

    await subscribeToPost({ organizationId: orgId, postId, participantId });
    await updatePostStatus({ organizationId: orgId, postId, status: "complete" });

    const draft = await createChangelogDraft({
      organizationId: orgId,
      createdByUserId: userId,
      title: "Smoke release",
      body: "We shipped the smoke test request.",
    });

    await linkPostToChangelogEntry({ organizationId: orgId, entryId: draft.id, postId });

    const transport = new FakeEmailTransport();
    const result = await publishChangelogEntry({
      organizationId: orgId,
      entryId: draft.id,
      transport,
    });

    expect(result.linkedPostCount).toBe(1);
    expect(result.recipientCount).toBe(1);
    expect(result.notifiedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].to).toBe("smoke-participant@example.com");
    expect(transport.sent[0].subject).toContain("Smoke release");
    expect(transport.sent[0].html).toContain("Smoke test request");
  });
});

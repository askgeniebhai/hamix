import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { board, organization, participant, post } from "@/lib/db/schema";
import { updatePostStatus } from "@/lib/feedback/data";

/**
 * Proves M6's status model at the database layer:
 * - a cross-tenant `postId` is rejected the same way every other
 *   write in `lib/feedback/data.ts` rejects one
 * - `statusChangedAt` only moves when the status actually changes
 * - an invalid status value is rejected by the real Postgres enum,
 *   not just by application-level Zod validation
 */
describe("status update — tenant scoping, statusChangedAt semantics, invalid values", () => {
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await getDb().delete(organization).where(inArray(organization.id, createdOrgIds));
    }
  });

  async function seedPost(label: string) {
    const db = getDb();
    const orgId = randomUUID();
    const boardId = randomUUID();
    const participantId = randomUUID();
    const postId = randomUUID();
    createdOrgIds.push(orgId);

    await db.insert(organization).values({
      id: orgId,
      name: `${label} Org`,
      slug: `${label.toLowerCase()}-org-${orgId}`,
      createdAt: new Date(),
    });
    await db.insert(board).values({
      id: boardId,
      organizationId: orgId,
      slug: `${label.toLowerCase()}-board-${orgId}`,
      name: `${label} Board`,
    });
    await db.insert(participant).values({
      id: participantId,
      organizationId: orgId,
      email: `${label.toLowerCase()}-participant@example.com`,
      name: `${label} Participant`,
      publicToken: randomUUID(),
    });
    await db.insert(post).values({
      id: postId,
      organizationId: orgId,
      boardId,
      participantId,
      title: `${label}'s post`,
      description: "Used to test status updates.",
    });

    return { orgId, postId };
  }

  it("orgB cannot update orgA's post status", async () => {
    const a = await seedPost("StatusA");
    const b = await seedPost("StatusB");

    await expect(
      updatePostStatus({
        organizationId: b.orgId,
        postId: a.postId,
        status: "under_review",
      }),
    ).rejects.toThrow();

    const [row] = await getDb().select().from(post).where(eq(post.id, a.postId));
    expect(row.status).toBe("open");
  });

  it("a real status change updates status and statusChangedAt", async () => {
    const a = await seedPost("StatusChange");
    const [before] = await getDb().select().from(post).where(eq(post.id, a.postId));

    // Ensure a measurable time gap before the change.
    await new Promise((resolve) => setTimeout(resolve, 20));

    await updatePostStatus({
      organizationId: a.orgId,
      postId: a.postId,
      status: "planned",
    });

    const [after] = await getDb().select().from(post).where(eq(post.id, a.postId));
    expect(after.status).toBe("planned");
    expect(after.statusChangedAt.getTime()).toBeGreaterThan(
      before.statusChangedAt.getTime(),
    );
  });

  it("updating to the same status leaves statusChangedAt untouched", async () => {
    const a = await seedPost("StatusNoop");

    await updatePostStatus({
      organizationId: a.orgId,
      postId: a.postId,
      status: "in_progress",
    });
    const [afterFirstChange] = await getDb()
      .select()
      .from(post)
      .where(eq(post.id, a.postId));

    await new Promise((resolve) => setTimeout(resolve, 20));

    // Same status again — a true no-op for statusChangedAt.
    await updatePostStatus({
      organizationId: a.orgId,
      postId: a.postId,
      status: "in_progress",
    });
    const [afterNoop] = await getDb().select().from(post).where(eq(post.id, a.postId));

    expect(afterNoop.status).toBe("in_progress");
    expect(afterNoop.statusChangedAt.getTime()).toBe(
      afterFirstChange.statusChangedAt.getTime(),
    );
  });

  it("the database rejects an invalid status value even bypassing application validation", async () => {
    const a = await seedPost("StatusInvalid");

    await expect(
      getDb()
        .update(post)
        // Deliberately bypasses the PostStatus type to prove the
        // Postgres enum itself — not just Zod — rejects an invalid
        // value.
        .set({ status: "archived" as never })
        .where(eq(post.id, a.postId)),
    ).rejects.toThrow();
  });
});

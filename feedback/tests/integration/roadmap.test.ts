import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { board, organization, participant, post } from "@/lib/db/schema";
import { listRoadmapPosts, updatePostStatus } from "@/lib/feedback/data";
import { ROADMAP_STATUSES } from "@/lib/feedback/status";

/**
 * Proves the public Roadmap query at the database layer:
 * - only `planned`/`in_progress`/`complete` posts are ever returned —
 *   `open` and `under_review` are excluded by the query itself, not
 *   filtered out afterward
 * - a board only ever sees its own posts (tenant isolation)
 * - results come back ordered newest-`statusChangedAt`-first
 */
describe("listRoadmapPosts — status filtering, tenant isolation, ordering", () => {
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await getDb().delete(organization).where(inArray(organization.id, createdOrgIds));
    }
  });

  async function seedOrgWithBoard(label: string) {
    const db = getDb();
    const orgId = randomUUID();
    const boardId = randomUUID();
    const participantId = randomUUID();
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

    return { orgId, boardId, participantId };
  }

  async function seedPost(
    orgId: string,
    boardId: string,
    participantId: string,
    title: string,
  ) {
    const postId = randomUUID();
    await getDb()
      .insert(post)
      .values({
        id: postId,
        organizationId: orgId,
        boardId,
        participantId,
        title,
        description: "Used to test the roadmap query.",
      });
    return postId;
  }

  it("only returns planned/in_progress/complete posts — open and under_review are excluded", async () => {
    const { orgId, boardId, participantId } = await seedOrgWithBoard("RoadmapFilter");

    const openId = await seedPost(orgId, boardId, participantId, "Still open");
    const underReviewId = await seedPost(orgId, boardId, participantId, "Under review");
    const plannedId = await seedPost(orgId, boardId, participantId, "Planned item");
    const inProgressId = await seedPost(orgId, boardId, participantId, "In progress item");
    const completeId = await seedPost(orgId, boardId, participantId, "Complete item");

    await updatePostStatus({ organizationId: orgId, postId: underReviewId, status: "under_review" });
    await updatePostStatus({ organizationId: orgId, postId: plannedId, status: "planned" });
    await updatePostStatus({ organizationId: orgId, postId: inProgressId, status: "in_progress" });
    await updatePostStatus({ organizationId: orgId, postId: completeId, status: "complete" });

    const roadmap = await listRoadmapPosts(boardId);
    const ids = roadmap.map((p) => p.id);

    expect(ids).not.toContain(openId);
    expect(ids).not.toContain(underReviewId);
    expect(ids).toContain(plannedId);
    expect(ids).toContain(inProgressId);
    expect(ids).toContain(completeId);
    // `RoadmapPost["status"]` is typed as `RoadmapStatus`, not the
    // full `PostStatus` — this is the type-level guarantee that
    // `open`/`under_review` can never appear in a `listRoadmapPosts`
    // result, checked directly here rather than only trusted.
    expect(roadmap.every((p) => ROADMAP_STATUSES.includes(p.status))).toBe(true);
  });

  it("a board never sees another board's roadmap posts", async () => {
    const a = await seedOrgWithBoard("RoadmapTenantA");
    const b = await seedOrgWithBoard("RoadmapTenantB");

    const postA = await seedPost(a.orgId, a.boardId, a.participantId, "Tenant A planned item");
    await updatePostStatus({ organizationId: a.orgId, postId: postA, status: "planned" });

    const postB = await seedPost(b.orgId, b.boardId, b.participantId, "Tenant B planned item");
    await updatePostStatus({ organizationId: b.orgId, postId: postB, status: "planned" });

    const roadmapA = await listRoadmapPosts(a.boardId);
    const roadmapB = await listRoadmapPosts(b.boardId);

    expect(roadmapA.map((p) => p.id)).toEqual([postA]);
    expect(roadmapB.map((p) => p.id)).toEqual([postB]);
  });

  it("orders newest statusChangedAt first", async () => {
    const { orgId, boardId, participantId } = await seedOrgWithBoard("RoadmapOrder");

    const first = await seedPost(orgId, boardId, participantId, "Moved to planned first");
    await updatePostStatus({ organizationId: orgId, postId: first, status: "planned" });

    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = await seedPost(orgId, boardId, participantId, "Moved to planned second");
    await updatePostStatus({ organizationId: orgId, postId: second, status: "planned" });

    const roadmap = await listRoadmapPosts(boardId);
    const ids = roadmap.map((p) => p.id);

    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first));
  });
});

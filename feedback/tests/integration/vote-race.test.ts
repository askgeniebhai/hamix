import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { board, organization, participant, post, vote } from "@/lib/db/schema";
import { castVote } from "@/lib/feedback/data";

/**
 * Proves the vote-uniqueness guarantee at the layer that actually
 * enforces it — the database's `vote_post_participant_uidx` unique
 * index — rather than at the UI, where a browser's own request
 * timing can't reliably reproduce a true race. Bypasses
 * `lib/feedback/participant.ts` (which needs a live Next.js request
 * for `cookies()`) and seeds rows directly with Drizzle instead.
 */
describe("castVote — concurrent duplicate-vote race safety", () => {
  const orgId = randomUUID();

  afterAll(async () => {
    // `organization` cascades to board/participant/post/vote.
    await getDb().delete(organization).where(eq(organization.id, orgId));
  });

  it("records exactly one vote when the same participant votes twice concurrently", async () => {
    const db = getDb();
    const boardId = randomUUID();
    const participantId = randomUUID();
    const postId = randomUUID();

    await db.insert(organization).values({
      id: orgId,
      name: "Race Org",
      slug: `race-org-${orgId}`,
      createdAt: new Date(),
    });
    await db.insert(board).values({
      id: boardId,
      organizationId: orgId,
      slug: `race-board-${orgId}`,
      name: "Race Board",
    });
    await db.insert(participant).values({
      id: participantId,
      organizationId: orgId,
      email: "racer@example.com",
      name: "Racer",
      publicToken: randomUUID(),
    });
    await db.insert(post).values({
      id: postId,
      organizationId: orgId,
      boardId,
      participantId,
      title: "Race post",
      description: "Whichever request loses the race must not error.",
    });

    await Promise.all([
      castVote({ organizationId: orgId, postId, participantId }),
      castVote({ organizationId: orgId, postId, participantId }),
    ]);

    const votes = await db.select().from(vote).where(eq(vote.postId, postId));
    expect(votes).toHaveLength(1);
  });
});

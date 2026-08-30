import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { board, organization, participant, post, postSubscription } from "@/lib/db/schema";
import {
  isParticipantSubscribed,
  subscribeToPost,
  unsubscribeByToken,
  unsubscribeFromPost,
} from "@/lib/feedback/data";

describe("post subscriptions — follow, cookie unsubscribe, token unsubscribe", () => {
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await getDb().delete(organization).where(inArray(organization.id, createdOrgIds));
    }
  });

  async function seed(label: string) {
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
      description: "Used to test post subscriptions.",
    });

    return { orgId, postId, participantId };
  }

  it("subscribing twice is idempotent, and isParticipantSubscribed reflects the current state", async () => {
    const { orgId, postId, participantId } = await seed("Idempotent");

    expect(await isParticipantSubscribed(postId, participantId)).toBe(false);
    await subscribeToPost({ organizationId: orgId, postId, participantId });
    await subscribeToPost({ organizationId: orgId, postId, participantId });
    expect(await isParticipantSubscribed(postId, participantId)).toBe(true);

    const rows = await getDb()
      .select()
      .from(postSubscription)
      .where(inArray(postSubscription.postId, [postId]));
    expect(rows).toHaveLength(1);
  });

  it("cookie-based unsubscribe removes the subscription", async () => {
    const { orgId, postId, participantId } = await seed("CookieUnsub");

    await subscribeToPost({ organizationId: orgId, postId, participantId });
    expect(await isParticipantSubscribed(postId, participantId)).toBe(true);

    await unsubscribeFromPost({ organizationId: orgId, postId, participantId });
    expect(await isParticipantSubscribed(postId, participantId)).toBe(false);
  });

  it("token-based unsubscribe (the email-link path) removes the subscription and is idempotent", async () => {
    const { orgId, postId, participantId } = await seed("TokenUnsub");

    await subscribeToPost({ organizationId: orgId, postId, participantId });
    const [row] = await getDb()
      .select({ unsubscribeToken: postSubscription.unsubscribeToken })
      .from(postSubscription)
      .where(inArray(postSubscription.postId, [postId]));
    expect(row?.unsubscribeToken).toBeTruthy();

    const result = await unsubscribeByToken(row!.unsubscribeToken);
    expect(result).not.toBeNull();
    expect(result?.postId).toBe(postId);
    expect(await isParticipantSubscribed(postId, participantId)).toBe(false);

    // A second visit to the same email link (or a link scanner
    // pre-fetching it) finds nothing to remove — not an error.
    const second = await unsubscribeByToken(row!.unsubscribeToken);
    expect(second).toBeNull();
  });

  it("an unknown token is a safe no-op", async () => {
    expect(await unsubscribeByToken(randomUUID())).toBeNull();
  });
});

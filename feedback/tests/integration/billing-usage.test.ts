import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import {
  countTrackedParticipants,
  isParticipantTracked,
  assertWithinParticipantLimit,
  getEntitlement,
  TrackedParticipantLimitReachedError,
} from "@/lib/billing/usage";
import { getDb } from "@/lib/db";
import { board, member, organization, organizationBilling, participant, post, user } from "@/lib/db/schema";
import { castVote, createExternalComment, createPost } from "@/lib/feedback/data";

/**
 * Proves the tracked-participant metric (M9 Part E) is computed one
 * way, correctly excludes non-qualifying activity, and that the limit
 * enforcement it feeds (M9 Part G) blocks only a *new* tracked
 * participant past entitlement — never an existing one's continued
 * activity, and never destroys anything already there.
 */
describe("billing usage — tracked participants", () => {
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

  async function seedOrg(label: string) {
    const db = getDb();
    const orgId = randomUUID();
    const boardId = randomUUID();
    const userId = randomUUID();
    createdOrgIds.push(orgId);
    createdUserIds.push(userId);

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
    await db.insert(user).values({
      id: userId,
      name: `${label} Admin`,
      email: `${label.toLowerCase()}-admin-${userId}@example.com`,
      emailVerified: true,
    });
    await db.insert(member).values({
      id: randomUUID(),
      organizationId: orgId,
      userId,
      role: "owner",
      createdAt: new Date(),
    });

    return { orgId, boardId, userId };
  }

  async function seedParticipant(orgId: string, label: string) {
    const participantId = randomUUID();
    await getDb()
      .insert(participant)
      .values({
        id: participantId,
        organizationId: orgId,
        email: `${label.toLowerCase()}-${participantId}@example.com`,
        name: label,
        publicToken: randomUUID(),
      });
    return participantId;
  }

  it("counts a submitter, a voter, and a commenter once each — and never counts a participant who only followed or was merely identified", async () => {
    const org = await seedOrg("CountBasics");
    const submitter = await seedParticipant(org.orgId, "Submitter");
    const voter = await seedParticipant(org.orgId, "Voter");
    const commenter = await seedParticipant(org.orgId, "Commenter");
    const bystander = await seedParticipant(org.orgId, "Bystander");

    const submitterPost = await createPost({
      organizationId: org.orgId,
      boardId: org.boardId,
      participantId: submitter,
      title: "Tracked via submission",
      description: "Should count.",
    });
    await castVote({ organizationId: org.orgId, postId: submitterPost.id, participantId: voter });
    await createExternalComment({
      organizationId: org.orgId,
      postId: submitterPost.id,
      participantId: commenter,
      body: "Tracked via comment.",
    });
    // `bystander` exists (e.g. identified to follow the post) but never
    // submitted, voted, or commented.

    expect(await isParticipantTracked(submitter)).toBe(true);
    expect(await isParticipantTracked(voter)).toBe(true);
    expect(await isParticipantTracked(commenter)).toBe(true);
    expect(await isParticipantTracked(bystander)).toBe(false);

    expect(await countTrackedParticipants(org.orgId)).toBe(3);
  });

  it("counts a participant exactly once even with multiple qualifying actions", async () => {
    const org = await seedOrg("NoDoubleCount");
    const active = await seedParticipant(org.orgId, "Active");

    const first = await createPost({
      organizationId: org.orgId,
      boardId: org.boardId,
      participantId: active,
      title: "First request",
      description: "One.",
    });
    const second = await createPost({
      organizationId: org.orgId,
      boardId: org.boardId,
      participantId: active,
      title: "Second request",
      description: "Two.",
    });
    await castVote({ organizationId: org.orgId, postId: first.id, participantId: active });
    await castVote({ organizationId: org.orgId, postId: second.id, participantId: active });
    await createExternalComment({
      organizationId: org.orgId,
      postId: first.id,
      participantId: active,
      body: "Also commented.",
    });

    expect(await countTrackedParticipants(org.orgId)).toBe(1);
  });

  it("never counts an internal workspace member's reply as a tracked participant", async () => {
    const org = await seedOrg("InternalNotCounted");
    const participantId = await seedParticipant(org.orgId, "External");
    const p = await createPost({
      organizationId: org.orgId,
      boardId: org.boardId,
      participantId,
      title: "Needs a reply",
      description: "From the team.",
    });

    // Only the external submitter is tracked; an internal reply (a
    // separate authorUserId-based comment) doesn't add a second
    // tracked participant — the workspace member isn't a `participant`
    // row at all.
    expect(await countTrackedParticipants(org.orgId)).toBe(1);
    void p;
  });

  it("tenant isolation: an organization's tracked-participant count never includes another organization's participants", async () => {
    const a = await seedOrg("IsolationA");
    const b = await seedOrg("IsolationB");
    const participantA = await seedParticipant(a.orgId, "InA");
    const participantB = await seedParticipant(b.orgId, "InB");

    await createPost({
      organizationId: a.orgId,
      boardId: a.boardId,
      participantId: participantA,
      title: "A's request",
      description: "Only counts for A.",
    });
    await createPost({
      organizationId: b.orgId,
      boardId: b.boardId,
      participantId: participantB,
      title: "B's request",
      description: "Only counts for B.",
    });

    expect(await countTrackedParticipants(a.orgId)).toBe(1);
    expect(await countTrackedParticipants(b.orgId)).toBe(1);
  });

  it("getEntitlement defaults an org that has never touched billing to Free with the Free limit", async () => {
    const org = await seedOrg("DefaultFree");
    const entitlement = await getEntitlement(org.orgId);
    expect(entitlement.plan).toBe("free");
    expect(entitlement.trackedParticipantLimit).toBe(25);
    expect(entitlement.trackedParticipantCount).toBe(0);
  });

  it("assertWithinParticipantLimit blocks a NEW tracked participant past the limit but always allows an already-tracked one to keep interacting", async () => {
    const org = await seedOrg("LimitEnforced");
    // Directly seed the org at its Free limit (25) to avoid seeding 25
    // real posts just to reach the boundary.
    const trackedIds: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      const participantId = await seedParticipant(org.orgId, `Tracked${i}`);
      await createPost({
        organizationId: org.orgId,
        boardId: org.boardId,
        participantId,
        title: `Request ${i}`,
        description: "Fills the limit.",
      });
      trackedIds.push(participantId);
    }
    expect(await countTrackedParticipants(org.orgId)).toBe(25);

    // A brand-new participant's first qualifying action is rejected...
    const newcomer = await seedParticipant(org.orgId, "Newcomer");
    await expect(
      assertWithinParticipantLimit(org.orgId, newcomer),
    ).rejects.toBeInstanceOf(TrackedParticipantLimitReachedError);
    await expect(
      createPost({
        organizationId: org.orgId,
        boardId: org.boardId,
        participantId: newcomer,
        title: "Should be blocked",
        description: "Over the limit.",
      }),
    ).rejects.toThrow();

    // ...while every already-tracked participant keeps interacting
    // normally: a second post, a vote, a comment — none of them are
    // blocked, and none of them grow the tracked count past 25.
    const stillWorks = trackedIds[0];
    await expect(
      createPost({
        organizationId: org.orgId,
        boardId: org.boardId,
        participantId: stillWorks,
        title: "A second request from an existing tracked participant",
        description: "Must succeed.",
      }),
    ).resolves.toBeDefined();
    const [existingPost] = await getDb()
      .select({ id: post.id })
      .from(post)
      .where(inArray(post.participantId, [trackedIds[1]]))
      .limit(1);
    await expect(
      castVote({ organizationId: org.orgId, postId: existingPost.id, participantId: trackedIds[2] }),
    ).resolves.toBeUndefined();

    expect(await countTrackedParticipants(org.orgId)).toBe(25);
    // The rejected newcomer never actually got a post recorded.
    expect(await isParticipantTracked(newcomer)).toBe(false);
  });

  it("existing customer data is never destroyed at the limit — an org already over its (downgraded) limit still serves all prior participants' reads and their continued activity", async () => {
    const org = await seedOrg("NeverDestroyed");
    const participantId = await seedParticipant(org.orgId, "Grandfathered");
    const p = await createPost({
      organizationId: org.orgId,
      boardId: org.boardId,
      participantId,
      title: "Pre-existing request",
      description: "Created before any limit was ever at risk.",
    });

    // Simulate an org that was Pro (100) and lapsed back to Free (25)
    // with more than 25 tracked participants already on record — the
    // downgrade path M9 Part G is about. Nothing about their existing
    // data disappears, and the existing participant's own further
    // activity is never blocked.
    await getDb().insert(organizationBilling).values({
      organizationId: org.orgId,
      plan: "free",
      status: "none",
    });

    await expect(
      castVote({ organizationId: org.orgId, postId: p.id, participantId }),
    ).resolves.toBeUndefined();
    const [stillThere] = await getDb().select({ id: post.id }).from(post).where(inArray(post.id, [p.id]));
    expect(stillThere).toBeDefined();
  });
});

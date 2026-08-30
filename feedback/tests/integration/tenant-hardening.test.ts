import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { board, member, organization, participant, post, user } from "@/lib/db/schema";
import {
  castVote,
  createExternalComment,
  createInternalComment,
  createPost,
} from "@/lib/feedback/data";

/**
 * Hardening pass requested after M5: the shared data layer must
 * reject an impossible cross-tenant combination even when the
 * top-level `organizationId`/`postId` pair looks correct — a
 * `participantId` or `authorUserId` sourced from a *different*
 * organization must still be caught. This complements
 * `tests/integration/comment-author-constraint.test.ts` (which
 * proves a cross-org `postId` is rejected) and
 * `tests/integration/vote-race.test.ts` (race safety) — neither of
 * those exercises a same-org `postId` paired with a wrong-org
 * participant/author, which is exactly what these tests do.
 */
describe("tenant hardening — wrong-organization participant/author/board rejected", () => {
  const createdOrgIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    const db = getDb();
    if (createdOrgIds.length > 0) {
      await db.delete(organization).where(inArray(organization.id, createdOrgIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(user).where(inArray(user.id, createdUserIds));
    }
  });

  async function seedOrg(label: string) {
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

  it("orgA + postA + participantB → castVote and createExternalComment both reject", async () => {
    const db = getDb();
    const a = await seedOrg("VoteA");
    const b = await seedOrg("VoteB");

    const postAId = randomUUID();
    await db.insert(post).values({
      id: postAId,
      organizationId: a.orgId,
      boardId: a.boardId,
      participantId: a.participantId,
      title: "Org A's post",
      description: "Only org A's own participants should affect this.",
    });

    await expect(
      castVote({
        organizationId: a.orgId,
        postId: postAId,
        participantId: b.participantId,
      }),
    ).rejects.toThrow();

    await expect(
      createExternalComment({
        organizationId: a.orgId,
        postId: postAId,
        participantId: b.participantId,
        body: "Wrong-org participant comment — must be rejected.",
      }),
    ).rejects.toThrow();

    // The legitimate, same-org participant still succeeds.
    await expect(
      castVote({
        organizationId: a.orgId,
        postId: postAId,
        participantId: a.participantId,
      }),
    ).resolves.not.toThrow();
  });

  it("orgA + postA + memberB → createInternalComment rejects a non-member author", async () => {
    const db = getDb();
    const a = await seedOrg("ReplyA");
    const b = await seedOrg("ReplyB");

    const postAId = randomUUID();
    await db.insert(post).values({
      id: postAId,
      organizationId: a.orgId,
      boardId: a.boardId,
      participantId: a.participantId,
      title: "Org A's post",
      description: "Only org A's own members should be able to reply as the team.",
    });

    const userAId = randomUUID();
    const userBId = randomUUID();
    await db.insert(user).values([
      {
        id: userAId,
        name: "Org A Member",
        email: `org-a-member-${userAId}@example.com`,
        emailVerified: false,
      },
      {
        id: userBId,
        name: "Org B Member",
        email: `org-b-member-${userBId}@example.com`,
        emailVerified: false,
      },
    ]);
    createdUserIds.push(userAId, userBId);

    await db.insert(member).values([
      {
        id: randomUUID(),
        organizationId: a.orgId,
        userId: userAId,
        role: "member",
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: b.orgId,
        userId: userBId,
        role: "member",
        createdAt: new Date(),
      },
    ]);

    // userB is a real member — just not of org A.
    await expect(
      createInternalComment({
        organizationId: a.orgId,
        postId: postAId,
        authorUserId: userBId,
        body: "Wrong-org member reply — must be rejected.",
      }),
    ).rejects.toThrow();

    // The legitimate, actual org A member succeeds.
    await expect(
      createInternalComment({
        organizationId: a.orgId,
        postId: postAId,
        authorUserId: userAId,
        body: "Org A's own member replying — allowed.",
      }),
    ).resolves.not.toThrow();
  });

  it("orgA + boardB → createPost rejects a board from a different organization", async () => {
    const a = await seedOrg("BoardA");
    const b = await seedOrg("BoardB");

    await expect(
      createPost({
        organizationId: a.orgId,
        boardId: b.boardId,
        participantId: a.participantId,
        title: "Cross-org board",
        description: "org A claimed, but boardId belongs to org B — must be rejected.",
      }),
    ).rejects.toThrow();
  });

  it("orgA + participantB → createPost rejects a participant from a different organization", async () => {
    const a = await seedOrg("ParticipantA");
    const b = await seedOrg("ParticipantB");

    await expect(
      createPost({
        organizationId: a.orgId,
        boardId: a.boardId,
        participantId: b.participantId,
        title: "Cross-org participant",
        description: "org A's own board, but participantId belongs to org B — must be rejected.",
      }),
    ).rejects.toThrow();

    // The legitimate, same-org combination still succeeds.
    await expect(
      createPost({
        organizationId: a.orgId,
        boardId: a.boardId,
        participantId: a.participantId,
        title: "Same-org post",
        description: "org A's own board and participant — allowed.",
      }),
    ).resolves.not.toThrow();
  });
});

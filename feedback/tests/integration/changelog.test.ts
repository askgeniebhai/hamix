import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import {
  createChangelogDraft,
  getChangelogEntryForOrganization,
  linkPostToChangelogEntry,
  listCompletablePosts,
  listPublishedChangelogEntries,
  publishChangelogEntry,
  unlinkPostFromChangelogEntry,
  updateChangelogDraft,
} from "@/lib/changelog/data";
import { getDb } from "@/lib/db";
import {
  board,
  changelogNotification,
  member,
  organization,
  participant,
  post,
  user,
} from "@/lib/db/schema";
import { subscribeToPost, updatePostStatus } from "@/lib/feedback/data";
import { FakeEmailTransport } from "@/tests/support/fake-email-transport";

/**
 * Proves M8's changelog domain at the database layer: tenant
 * isolation on every write, the Complete-only link rule (enforced
 * even bypassing the picker UI), publish-time revalidation, and the
 * idempotency/delivery guarantees `DECISIONS.md` D8-004 describes —
 * a double publish, a subscriber reachable through two linked posts,
 * an unsubscribed participant, and a failing transport all land
 * exactly where the spec says they must.
 */
describe("changelog domain", () => {
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

  async function seedPost(orgId: string, boardId: string, participantId: string, title: string) {
    const postId = randomUUID();
    await getDb()
      .insert(post)
      .values({
        id: postId,
        organizationId: orgId,
        boardId,
        participantId,
        title,
        description: "Used to test the changelog domain.",
      });
    return postId;
  }

  it("rejects a draft created by a user who is not a member of the organization", async () => {
    const a = await seedOrg("MemberCheckA");
    const b = await seedOrg("MemberCheckB");

    await expect(
      createChangelogDraft({
        organizationId: a.orgId,
        createdByUserId: b.userId,
        title: "Cross-tenant draft attempt",
        body: "Should never be created.",
      }),
    ).rejects.toThrow();
  });

  it("rejects linking a post from a different organization, and rejects reading/editing another organization's entry", async () => {
    const a = await seedOrg("LinkTenantA");
    const b = await seedOrg("LinkTenantB");
    const participantB = await seedParticipant(b.orgId, "TenantB");
    const postB = await seedPost(b.orgId, b.boardId, participantB, "Tenant B's post");
    await updatePostStatus({ organizationId: b.orgId, postId: postB, status: "complete" });

    const draftA = await createChangelogDraft({
      organizationId: a.orgId,
      createdByUserId: a.userId,
      title: "Tenant A release",
      body: "Tenant A's own release notes.",
    });

    await expect(
      linkPostToChangelogEntry({ organizationId: a.orgId, entryId: draftA.id, postId: postB }),
    ).rejects.toThrow();

    // Tenant B cannot read or edit tenant A's entry at all.
    expect(await getChangelogEntryForOrganization(b.orgId, draftA.id)).toBeNull();
    await expect(
      updateChangelogDraft({
        organizationId: b.orgId,
        entryId: draftA.id,
        title: "Hijacked",
        body: "Should never be allowed.",
      }),
    ).rejects.toThrow();
  });

  it("only a Complete post can be linked — the picker's own data source excludes everything else, and the write rejects it directly", async () => {
    const org = await seedOrg("LinkRule");
    const participantId = await seedParticipant(org.orgId, "LinkRule");
    const openPost = await seedPost(org.orgId, org.boardId, participantId, "Still open");
    const plannedPost = await seedPost(org.orgId, org.boardId, participantId, "Planned, not complete");
    await updatePostStatus({ organizationId: org.orgId, postId: plannedPost, status: "planned" });

    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "Link rule release",
      body: "Testing the link rule.",
    });

    const completable = await listCompletablePosts(org.orgId, draft.id);
    expect(completable.map((p) => p.id)).not.toContain(openPost);
    expect(completable.map((p) => p.id)).not.toContain(plannedPost);

    await expect(
      linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId: openPost }),
    ).rejects.toThrow();
    await expect(
      linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId: plannedPost }),
    ).rejects.toThrow();
  });

  it("listCompletablePosts's linked flag reflects the real link state — not always false, not always true", async () => {
    const org = await seedOrg("LinkedFlag");
    const participantId = await seedParticipant(org.orgId, "LinkedFlag");
    const linkedPost = await seedPost(org.orgId, org.boardId, participantId, "Will be linked");
    const unlinkedPost = await seedPost(org.orgId, org.boardId, participantId, "Will stay unlinked");
    await updatePostStatus({ organizationId: org.orgId, postId: linkedPost, status: "complete" });
    await updatePostStatus({ organizationId: org.orgId, postId: unlinkedPost, status: "complete" });

    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "Linked-flag release",
      body: "Testing the linked flag correlates to the right post.",
    });

    const beforeLink = await listCompletablePosts(org.orgId, draft.id);
    expect(beforeLink.find((p) => p.id === linkedPost)?.linked).toBe(false);
    expect(beforeLink.find((p) => p.id === unlinkedPost)?.linked).toBe(false);

    await linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId: linkedPost });

    const afterLink = await listCompletablePosts(org.orgId, draft.id);
    expect(afterLink.find((p) => p.id === linkedPost)?.linked).toBe(true);
    expect(afterLink.find((p) => p.id === unlinkedPost)?.linked).toBe(false);

    await unlinkPostFromChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId: linkedPost });
    const afterUnlink = await listCompletablePosts(org.orgId, draft.id);
    expect(afterUnlink.find((p) => p.id === linkedPost)?.linked).toBe(false);
  });

  it("publishing revalidates linked posts — one that regressed off Complete blocks the publish", async () => {
    const org = await seedOrg("Revalidate");
    const participantId = await seedParticipant(org.orgId, "Revalidate");
    const postId = await seedPost(org.orgId, org.boardId, participantId, "Regressing post");
    await updatePostStatus({ organizationId: org.orgId, postId, status: "complete" });

    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "Revalidate release",
      body: "Testing publish-time revalidation.",
    });
    await linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId });

    // The post regresses after being linked, before publish.
    await updatePostStatus({ organizationId: org.orgId, postId, status: "in_progress" });

    await expect(
      publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport: new FakeEmailTransport() }),
    ).rejects.toThrow();

    const stillDraft = await getChangelogEntryForOrganization(org.orgId, draft.id);
    expect(stillDraft?.state).toBe("draft");

    // Unlinking the regressed post and re-publishing succeeds.
    await unlinkPostFromChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId });
    const transport = new FakeEmailTransport();
    const result = await publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport });
    expect(result.linkedPostCount).toBe(0);
  });

  it("a published entry can never be edited or re-published, and a draft is never returned by the public query", async () => {
    const org = await seedOrg("Immutable");
    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "Immutable release",
      body: "Testing immutability after publish.",
    });

    const beforePublish = await listPublishedChangelogEntries(org.boardId);
    expect(beforePublish.map((e) => e.id)).not.toContain(draft.id);

    const transport = new FakeEmailTransport();
    await publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport });

    await expect(
      updateChangelogDraft({
        organizationId: org.orgId,
        entryId: draft.id,
        title: "Edited after publish",
        body: "Should be rejected.",
      }),
    ).rejects.toThrow();

    await expect(
      publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport: new FakeEmailTransport() }),
    ).rejects.toThrow();

    const afterPublish = await listPublishedChangelogEntries(org.boardId);
    expect(afterPublish.map((e) => e.id)).toContain(draft.id);
  });

  it("subscribed participants each get exactly one notification; unsubscribed gets zero; a subscriber reachable through two linked posts still gets one", async () => {
    const org = await seedOrg("Recipients");
    const subscriberBoth = await seedParticipant(org.orgId, "SubscriberBoth");
    const subscriberOne = await seedParticipant(org.orgId, "SubscriberOne");
    const unsubscribed = await seedParticipant(org.orgId, "Unsubscribed");

    const postA = await seedPost(org.orgId, org.boardId, subscriberOne, "Request A");
    const postB = await seedPost(org.orgId, org.boardId, subscriberOne, "Request B");
    await updatePostStatus({ organizationId: org.orgId, postId: postA, status: "complete" });
    await updatePostStatus({ organizationId: org.orgId, postId: postB, status: "complete" });

    // subscriberBoth follows both linked posts — must receive exactly one notification, not two.
    await subscribeToPost({ organizationId: org.orgId, postId: postA, participantId: subscriberBoth });
    await subscribeToPost({ organizationId: org.orgId, postId: postB, participantId: subscriberBoth });
    // subscriberOne follows only postA.
    await subscribeToPost({ organizationId: org.orgId, postId: postA, participantId: subscriberOne });
    // `unsubscribed` never follows anything.

    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "Recipients release",
      body: "Testing recipient computation.",
    });
    await linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId: postA });
    await linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId: postB });

    const transport = new FakeEmailTransport();
    const result = await publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport });

    expect(result.recipientCount).toBe(2);
    expect(result.notifiedCount).toBe(2);
    const recipientEmails = transport.sent.map((m) => m.to);
    expect(recipientEmails).toHaveLength(2);

    const notifications = await getDb()
      .select()
      .from(changelogNotification)
      .where(eq(changelogNotification.changelogEntryId, draft.id));
    const notifiedParticipantIds = notifications.map((n) => n.participantId);
    expect(notifiedParticipantIds).toContain(subscriberBoth);
    expect(notifiedParticipantIds).toContain(subscriberOne);
    expect(notifiedParticipantIds).not.toContain(unsubscribed);
    // subscriberBoth appears exactly once, not twice, despite following two linked posts.
    expect(notifiedParticipantIds.filter((id) => id === subscriberBoth)).toHaveLength(1);
  });

  it("publishing twice is safe — the second call is rejected and no duplicate notification rows are created", async () => {
    const org = await seedOrg("DoublePublish");
    const participantId = await seedParticipant(org.orgId, "DoublePublish");
    const postId = await seedPost(org.orgId, org.boardId, participantId, "Double publish post");
    await subscribeToPost({ organizationId: org.orgId, postId, participantId });
    await updatePostStatus({ organizationId: org.orgId, postId, status: "complete" });

    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "Double publish release",
      body: "Testing double-publish idempotency.",
    });
    await linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId });

    const transport = new FakeEmailTransport();
    const first = await publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport });
    expect(first.notifiedCount).toBe(1);

    await expect(
      publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport }),
    ).rejects.toThrow();

    const notifications = await getDb()
      .select()
      .from(changelogNotification)
      .where(eq(changelogNotification.changelogEntryId, draft.id));
    expect(notifications).toHaveLength(1);
    expect(transport.sent).toHaveLength(1);
  });

  it("a provider failure is recorded as a failed delivery, not silently dropped or falsely reported sent", async () => {
    const org = await seedOrg("FailureState");
    const participantId = await seedParticipant(org.orgId, "FailureState");
    const postId = await seedPost(org.orgId, org.boardId, participantId, "Failing delivery post");
    await subscribeToPost({ organizationId: org.orgId, postId, participantId });
    await updatePostStatus({ organizationId: org.orgId, postId, status: "complete" });

    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "Failure state release",
      body: "Testing the failed-delivery path.",
    });
    await linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId });

    const transport = new FakeEmailTransport();
    transport.failNextSends(1, "Simulated Resend outage");
    const result = await publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport });

    expect(result.notifiedCount).toBe(0);
    expect(result.failedCount).toBe(1);

    const [notification] = await getDb()
      .select()
      .from(changelogNotification)
      .where(eq(changelogNotification.changelogEntryId, draft.id));
    expect(notification.state).toBe("failed");
    expect(notification.failureReason).toContain("Simulated Resend outage");
    expect(notification.sentAt).toBeNull();

    const detail = await getChangelogEntryForOrganization(org.orgId, draft.id);
    expect(detail?.failedCount).toBe(1);
    expect(detail?.notifiedCount).toBe(0);
  });

  it("the admin detail view never exposes a recipient's email — only aggregate delivery counts", async () => {
    const org = await seedOrg("NoEmailLeak");
    const participantId = await seedParticipant(org.orgId, "NoEmailLeak");
    const postId = await seedPost(org.orgId, org.boardId, participantId, "No email leak post");
    await subscribeToPost({ organizationId: org.orgId, postId, participantId });
    await updatePostStatus({ organizationId: org.orgId, postId, status: "complete" });

    const draft = await createChangelogDraft({
      organizationId: org.orgId,
      createdByUserId: org.userId,
      title: "No email leak release",
      body: "Testing that emails never leak through the detail view.",
    });
    await linkPostToChangelogEntry({ organizationId: org.orgId, entryId: draft.id, postId });
    await publishChangelogEntry({ organizationId: org.orgId, entryId: draft.id, transport: new FakeEmailTransport() });

    const detail = await getChangelogEntryForOrganization(org.orgId, draft.id);
    expect(detail).not.toBeNull();
    expect(JSON.stringify(detail)).not.toContain("@example.com");
  });
});

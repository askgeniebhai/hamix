import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { board, organization, participant, post } from "@/lib/db/schema";
import { listOrganizationPostsForAdmin } from "@/lib/feedback/data";

/**
 * Proves the admin search box treats its input as a literal substring,
 * not an ILIKE pattern — a search for a literal `%` or `_` must not
 * take on SQL wildcard meaning (`DECISIONS.md`-adjacent fix: reviewer
 * finding on PR #29).
 */
describe("admin search — ILIKE wildcards in the search term are escaped", () => {
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await getDb().delete(organization).where(inArray(organization.id, createdOrgIds));
    }
  });

  it("a literal '%' search term does not match every post", async () => {
    const db = getDb();
    const orgId = randomUUID();
    const boardId = randomUUID();
    const participantId = randomUUID();
    createdOrgIds.push(orgId);

    await db.insert(organization).values({
      id: orgId,
      name: "Escape Org",
      slug: `escape-org-${orgId}`,
      createdAt: new Date(),
    });
    await db.insert(board).values({
      id: boardId,
      organizationId: orgId,
      slug: `escape-board-${orgId}`,
      name: "Escape Board",
    });
    await db.insert(participant).values({
      id: participantId,
      organizationId: orgId,
      email: "escape-participant@example.com",
      name: "Escape Participant",
      publicToken: randomUUID(),
    });
    await db.insert(post).values([
      {
        id: randomUUID(),
        organizationId: orgId,
        boardId,
        participantId,
        title: "Give us 100% uptime",
        description: "A literal percent sign in the title.",
      },
      {
        id: randomUUID(),
        organizationId: orgId,
        boardId,
        participantId,
        title: "Unrelated request",
        description: "Should not match a search for a literal percent sign.",
      },
    ]);

    const percentResults = await listOrganizationPostsForAdmin(orgId, { query: "100%" });
    expect(percentResults).toHaveLength(1);
    expect(percentResults[0].title).toBe("Give us 100% uptime");

    // A literal "%" is itself a substring only of the first post's
    // title ("100%") — if it were treated as an unescaped wildcard it
    // would instead match everything, including "Unrelated request".
    const bareWildcardResults = await listOrganizationPostsForAdmin(orgId, { query: "%" });
    expect(bareWildcardResults).toHaveLength(1);
    expect(bareWildcardResults[0].title).toBe("Give us 100% uptime");
  });
});

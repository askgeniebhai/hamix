import { randomUUID, createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { getDb } from "../lib/db";
import { board, organization, participant, post } from "../lib/db/schema";
import { signUpWithWorkspace, unique } from "./helpers";

/**
 * M9 Part O — the commercial layer's own proof, closing the loop the
 * rest of Tier 3 already covers end to end (signup → board → submit
 * → vote → comment in feedback.spec.ts; roadmap in roadmap.spec.ts;
 * changelog + notification in changelog.spec.ts). This file adds what
 * only the billing layer needs: Free-plan display, an honest checkout
 * failure when Shopify is unreachable, and the full Shopify webhook
 * lifecycle through the *real* running server — signature
 * verification, entitlement grant, persistence across reload,
 * idempotent redelivery, tenant isolation, and cancellation
 * reconciling entitlement back down.
 *
 * `SHOPIFY_*` env vars here are fake, non-routable test credentials
 * (the CI job sets the same ones) — never a real Shopify store. A
 * real HMAC is still computed against the real `SHOPIFY_WEBHOOK_SECRET`
 * the running server verifies against, so signature verification
 * itself is genuinely exercised, not mocked.
 */

const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

function sign(rawBody: string): string {
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "SHOPIFY_WEBHOOK_SECRET must be set to run e2e/commercial.spec.ts — it signs a real HMAC against the same secret the running server verifies against.",
    );
  }
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody, "utf8").digest("base64");
}

function orderPayload(organizationId: string, orderId: number, financialStatus = "paid"): string {
  return JSON.stringify({
    id: orderId,
    financial_status: financialStatus,
    customer: { id: 900_000_000 + orderId },
    note_attributes: [{ name: "organization_id", value: organizationId }],
    // Matches SHOPIFY_PRO_VARIANT_ID ("gid://shopify/ProductVariant/1")
    // set in this environment — processShopifyWebhook now verifies the
    // paid order actually contains the configured Pro product before
    // granting entitlement (never the organization_id attribute alone).
    line_items: [{ variant_id: 1, quantity: 1 }],
  });
}

async function getOrganizationIdByName(name: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.name, name));
  if (!row) {
    throw new Error(`organization not found for name: ${name}`);
  }
  return row.id;
}

test.describe("billing — Free plan display", () => {
  test("a fresh workspace shows Free with 0 tracked participants", async ({ page }) => {
    await signUpWithWorkspace(page, { namePrefix: "BillingFree" });
    await page.goto("/settings/billing");
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("0 / 25")).toBeVisible();
  });
});

test.describe("billing — checkout is honest when Shopify is unreachable", () => {
  test("Upgrade to Pro fails visibly rather than granting or crashing", async ({ page }) => {
    await signUpWithWorkspace(page, { namePrefix: "BillingUpgrade" });
    await page.goto("/settings/billing");
    await page.getByRole("button", { name: "Upgrade to Pro" }).click();
    // The test environment's SHOPIFY_STORE_DOMAIN doesn't resolve —
    // createProCheckoutUrl's real network call genuinely fails, and
    // the action reports that honestly instead of redirecting to a
    // fake success or crashing the page (M9 Part I).
    await expect(page.getByText("Couldn't start checkout. Please try again.")).toBeVisible();
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
  });
});

test.describe("billing — Shopify webhook lifecycle", () => {
  test("invalid signature is rejected and grants nothing", async ({ page, request, baseURL }) => {
    const { workspaceName } = await signUpWithWorkspace(page, { namePrefix: "WebhookBadSig" });
    const orgId = await getOrganizationIdByName(workspaceName);
    const body = orderPayload(orgId, Date.now());

    const res = await request.post(`${baseURL}/api/webhooks/shopify`, {
      data: body,
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": "not-a-real-signature==",
        "x-shopify-webhook-id": randomUUID(),
        "x-shopify-topic": "orders/paid",
      },
    });
    expect(res.status()).toBe(401);

    await page.goto("/settings/billing");
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
  });

  test("a genuinely signed orders/paid webhook grants Pro, persists across reload, and a redelivered duplicate is a no-op", async ({
    page,
    request,
    baseURL,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, { namePrefix: "WebhookGrant" });
    const orgId = await getOrganizationIdByName(workspaceName);
    const body = orderPayload(orgId, Date.now());
    const signature = sign(body);
    const webhookId = randomUUID();

    const first = await request.post(`${baseURL}/api/webhooks/shopify`, {
      data: body,
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": signature,
        "x-shopify-webhook-id": webhookId,
        "x-shopify-topic": "orders/paid",
      },
    });
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({ status: "processed" });

    // Persists across a reload — this reads the real database row,
    // never a client-cached or optimistic "Pro" state.
    await page.goto("/settings/billing");
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();

    // Shopify redelivering the exact same webhook id is a documented,
    // expected possibility — it must be a no-op, never a duplicate
    // grant or an error.
    const duplicate = await request.post(`${baseURL}/api/webhooks/shopify`, {
      data: body,
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": signature,
        "x-shopify-webhook-id": webhookId,
        "x-shopify-topic": "orders/paid",
      },
    });
    expect(duplicate.status()).toBe(200);
    expect(await duplicate.json()).toEqual({ status: "duplicate" });
    await page.reload();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
  });

  test("tenant isolation: a webhook for organization A never grants Pro to organization B", async ({
    page,
    request,
    baseURL,
  }) => {
    const { workspaceName: orgAName } = await signUpWithWorkspace(page, {
      namePrefix: "WebhookTenantA",
    });
    const orgAId = await getOrganizationIdByName(orgAName);

    const contextB = await page.context().browser()!.newContext();
    const pageB = await contextB.newPage();
    await signUpWithWorkspace(pageB, { namePrefix: "WebhookTenantB" });

    const body = orderPayload(orgAId, Date.now());
    await request.post(`${baseURL}/api/webhooks/shopify`, {
      data: body,
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": sign(body),
        "x-shopify-webhook-id": randomUUID(),
        "x-shopify-topic": "orders/paid",
      },
    });

    await page.goto("/settings/billing");
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();

    await pageB.goto("/settings/billing");
    await expect(pageB.getByText("Free", { exact: true }).first()).toBeVisible();

    await contextB.close();
  });

  test("orders/cancelled moves an already-Pro organization back to Free entitlement", async ({
    page,
    request,
    baseURL,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, { namePrefix: "WebhookCancel" });
    const orgId = await getOrganizationIdByName(workspaceName);
    const orderId = Date.now();
    const paidBody = orderPayload(orgId, orderId);
    await request.post(`${baseURL}/api/webhooks/shopify`, {
      data: paidBody,
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": sign(paidBody),
        "x-shopify-webhook-id": randomUUID(),
        "x-shopify-topic": "orders/paid",
      },
    });
    await page.goto("/settings/billing");
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();

    const cancelBody = orderPayload(orgId, orderId, "voided");
    const cancelRes = await request.post(`${baseURL}/api/webhooks/shopify`, {
      data: cancelBody,
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": sign(cancelBody),
        "x-shopify-webhook-id": randomUUID(),
        "x-shopify-topic": "orders/cancelled",
      },
    });
    expect(cancelRes.status()).toBe(200);

    await page.reload();
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
  });
});

test.describe("billing — Free-plan tracked-participant limit", () => {
  test("a brand-new participant is blocked with a clear, non-hostile message once the limit is reached", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, { namePrefix: "LimitBoundary" });
    const orgId = await getOrganizationIdByName(workspaceName);

    const db = getDb();
    const [boardRow] = await db
      .select({ id: board.id, slug: board.slug })
      .from(board)
      .where(eq(board.organizationId, orgId));
    if (!boardRow) {
      throw new Error("board not found for organization");
    }

    // Seed exactly 25 already-tracked participants directly — the
    // counting/limit logic itself is proven at the integration level
    // (tests/integration/billing-usage.test.ts, including that an
    // *already*-tracked participant's continued activity is never
    // blocked); this test's job is only to prove what a brand-new
    // visitor actually sees in the browser once the org is at the
    // limit.
    for (let i = 0; i < 25; i++) {
      const participantId = randomUUID();
      await db.insert(participant).values({
        id: participantId,
        organizationId: orgId,
        email: `seed-${i}-${unique()}@example.com`,
        name: `Seed Participant ${i}`,
        publicToken: randomUUID(),
      });
      await db.insert(post).values({
        id: randomUUID(),
        organizationId: orgId,
        boardId: boardRow.id,
        participantId,
        title: `Seed request ${i}`,
        description: "Seeded directly to reach the Free-plan tracked-participant limit.",
      });
    }

    // A brand-new visitor, fresh browser context (no participant
    // cookie), tries to submit — they are the 26th tracked
    // participant this org would have, past the Free limit.
    const visitorContext = await page.context().browser()!.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`/b/${boardRow.slug}`);
    try {
      await visitorPage.getByRole("button", { name: "Share feedback" }).click({ timeout: 3000 });
    } catch {
      // Already open.
    }
    await visitorPage.locator("#title").fill("A brand-new request past the limit");
    await visitorPage
      .locator("#description")
      .fill("This visitor has never interacted with this board before.");
    await visitorPage.locator("#name").fill("Blocked Visitor");
    await visitorPage.locator("#email").fill(`blocked-${unique()}@example.com`);
    await visitorPage.getByRole("button", { name: "Submit feedback" }).click();

    // A clear, honest, customer-facing message — never a crash, and
    // never the admin-facing wording from the error's own `.message`
    // (M9 Part G).
    await expect(
      visitorPage.getByText("This board isn't able to accept new participants right now."),
    ).toBeVisible();

    await visitorContext.close();
  });
});

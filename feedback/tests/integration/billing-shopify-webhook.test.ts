process.env.SHOPIFY_STORE_DOMAIN = "test-shop.myshopify.com";
process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = "test-storefront-token";
process.env.SHOPIFY_WEBHOOK_SECRET = "test-webhook-secret";
process.env.SHOPIFY_PRO_VARIANT_ID = "gid://shopify/ProductVariant/1";
process.env.SHOPIFY_PRO_SELLING_PLAN_ID = "gid://shopify/SellingPlan/1";

import { randomUUID, createHmac } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { processShopifyWebhook } from "@/lib/billing/shopify/webhook";
import { getEntitlement } from "@/lib/billing/usage";
import { getDb } from "@/lib/db";
import { billingWebhookEvent, member, organization, organizationBilling, user } from "@/lib/db/schema";

const WEBHOOK_SECRET = "test-webhook-secret";

function sign(rawBody: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody, "utf8").digest("base64");
}

/**
 * Proves the Shopify billing webhook path end to end against a real
 * database: signature verification (Shopify's own documented
 * `X-Shopify-Hmac-Sha256` recipe, reproduced here exactly the way
 * `verifyShopifyHmac` computes it — a real forged/tampered payload is
 * rejected, not just a "trust me" mock), idempotent processing on a
 * redelivered `X-Shopify-Webhook-Id`, and entitlement reconciliation
 * for the `orders/paid` → `orders/cancelled` → `subscription_contracts/
 * update` lifecycle (M9 Part H/Part O's "cancelled subscription
 * changes entitlement correctly").
 */
describe("processShopifyWebhook — signature, idempotency, entitlement reconciliation", () => {
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
    const userId = randomUUID();
    createdOrgIds.push(orgId);
    createdUserIds.push(userId);

    await db.insert(organization).values({
      id: orgId,
      name: `${label} Org`,
      slug: `${label.toLowerCase()}-org-${orgId}`,
      createdAt: new Date(),
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
    return orgId;
  }

  function orderPayload(
    organizationId: string,
    orderId: number,
    financialStatus = "paid",
    // Defaults to a value derived from the order id so a renewal
    // (same customer, new order id) is easy to model distinctly from
    // a first purchase — not because two organizations sharing a
    // customer id would fail; `provider_customer_id` is deliberately
    // not unique (see the "one Shopify customer, two organizations"
    // test below).
    customerId = 500000000 + orderId,
  ) {
    return JSON.stringify({
      id: orderId,
      financial_status: financialStatus,
      customer: { id: customerId },
      note_attributes: [{ name: "organization_id", value: organizationId }],
      // Matches SHOPIFY_PRO_VARIANT_ID ("gid://shopify/ProductVariant/1")
      // set at the top of this file — the classic REST order webhook's
      // line_items[].variant_id is the bare numeric id, never the GID.
      line_items: [{ variant_id: 1, quantity: 1 }],
    });
  }

  /** A paid order whose line items do NOT contain the configured Pro variant — the exact "cart line swapped before checkout completed" scenario `processShopifyWebhook`'s product-verification check exists to reject. */
  function orderPayloadWrongProduct(organizationId: string, orderId: number, customerId = 500000000 + orderId) {
    return JSON.stringify({
      id: orderId,
      financial_status: "paid",
      customer: { id: customerId },
      note_attributes: [{ name: "organization_id", value: organizationId }],
      line_items: [{ variant_id: 999999, quantity: 1 }],
    });
  }

  it("rejects a webhook whose signature doesn't match the raw body", async () => {
    const orgId = await seedOrg("BadSig");
    const body = orderPayload(orgId, 1001);

    const result = await processShopifyWebhook({
      rawBody: body,
      hmacHeader: "not-a-real-signature==",
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    expect(result.status).toBe("invalid_signature");

    // Nothing was recorded for a rejected signature.
    const entitlement = await getEntitlement(orgId);
    expect(entitlement.plan).toBe("free");
  });

  it("a genuinely signed orders/paid webhook grants Pro, and the exact same delivery redelivered is a no-op idempotent duplicate", async () => {
    const orgId = await seedOrg("PaidGrant");
    const body = orderPayload(orgId, 2001);
    const signature = sign(body);
    const webhookId = randomUUID();

    const first = await processShopifyWebhook({
      rawBody: body,
      hmacHeader: signature,
      webhookId,
      topic: "orders/paid",
    });
    expect(first.status).toBe("processed");

    const entitlementAfterFirst = await getEntitlement(orgId);
    expect(entitlementAfterFirst.plan).toBe("pro");
    expect(entitlementAfterFirst.trackedParticipantLimit).toBe(100);

    // Shopify redelivers the identical webhook (same X-Shopify-Webhook-Id) — a
    // documented, expected possibility.
    const second = await processShopifyWebhook({
      rawBody: body,
      hmacHeader: signature,
      webhookId,
      topic: "orders/paid",
    });
    expect(second.status).toBe("duplicate");

    const events = await getDb()
      .select()
      .from(billingWebhookEvent)
      .where(inArray(billingWebhookEvent.providerEventId, [webhookId]));
    expect(events).toHaveLength(1);
  });

  it("orders/cancelled moves an already-Pro org back to Free entitlement", async () => {
    const orgId = await seedOrg("CancelFlow");
    const paidBody = orderPayload(orgId, 3001);
    await processShopifyWebhook({
      rawBody: paidBody,
      hmacHeader: sign(paidBody),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    expect((await getEntitlement(orgId)).plan).toBe("pro");

    const cancelBody = orderPayload(orgId, 3001, "voided");
    const cancelResult = await processShopifyWebhook({
      rawBody: cancelBody,
      hmacHeader: sign(cancelBody),
      webhookId: randomUUID(),
      topic: "orders/cancelled",
    });
    expect(cancelResult.status).toBe("processed");
    expect((await getEntitlement(orgId)).plan).toBe("free");
  });

  it("subscription_contracts/update with status CANCELLED also reconciles entitlement back to Free", async () => {
    const orgId = await seedOrg("ContractCancel");
    const paidBody = orderPayload(orgId, 4001);
    await processShopifyWebhook({
      rawBody: paidBody,
      hmacHeader: sign(paidBody),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    expect((await getEntitlement(orgId)).plan).toBe("pro");

    const contractBody = JSON.stringify({
      admin_graphql_api_id: "gid://shopify/SubscriptionContract/9001",
      status: "CANCELLED",
      customAttributes: [{ key: "organization_id", value: orgId }],
    });
    const result = await processShopifyWebhook({
      rawBody: contractBody,
      hmacHeader: sign(contractBody),
      webhookId: randomUUID(),
      topic: "subscription_contracts/update",
    });
    expect(result.status).toBe("processed");
    expect((await getEntitlement(orgId)).plan).toBe("free");
  });

  it("an order with no organization_id attribute is ignored, not misattributed to any organization", async () => {
    const body = JSON.stringify({ id: 5001, financial_status: "paid", note_attributes: [] });
    const result = await processShopifyWebhook({
      rawBody: body,
      hmacHeader: sign(body),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    expect(result.status).toBe("ignored");
  });

  it("a paid order whose line items don't contain the configured Pro variant is ignored, not granted Pro", async () => {
    const orgId = await seedOrg("WrongProduct");
    const body = orderPayloadWrongProduct(orgId, 8001);
    const result = await processShopifyWebhook({
      rawBody: body,
      hmacHeader: sign(body),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    expect(result.status).toBe("ignored");
    expect((await getEntitlement(orgId)).plan).toBe("free");
  });

  it("tenant isolation: an orders/paid webhook for one organization never grants entitlement to another", async () => {
    const orgA = await seedOrg("TenantIsoA");
    const orgB = await seedOrg("TenantIsoB");
    const body = orderPayload(orgA, 6001);
    await processShopifyWebhook({
      rawBody: body,
      hmacHeader: sign(body),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });

    expect((await getEntitlement(orgA)).plan).toBe("pro");
    expect((await getEntitlement(orgB)).plan).toBe("free");
  });

  it("the same Shopify customer buying Pro for two different organizations grants both — provider_customer_id is not globally unique", async () => {
    const orgA = await seedOrg("SharedCustomerA");
    const orgB = await seedOrg("SharedCustomerB");
    const sharedCustomerId = 700000001;

    const bodyA = orderPayload(orgA, 7101, "paid", sharedCustomerId);
    const resultA = await processShopifyWebhook({
      rawBody: bodyA,
      hmacHeader: sign(bodyA),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    expect(resultA.status).toBe("processed");

    const bodyB = orderPayload(orgB, 7102, "paid", sharedCustomerId);
    const resultB = await processShopifyWebhook({
      rawBody: bodyB,
      hmacHeader: sign(bodyB),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    expect(resultB.status).toBe("processed");

    expect((await getEntitlement(orgA)).plan).toBe("pro");
    expect((await getEntitlement(orgB)).plan).toBe("pro");
  });

  it("cleans up its own organization_billing rows via the organization cascade", async () => {
    const orgId = await seedOrg("CascadeCleanup");
    const body = orderPayload(orgId, 7001);
    await processShopifyWebhook({
      rawBody: body,
      hmacHeader: sign(body),
      webhookId: randomUUID(),
      topic: "orders/paid",
    });
    const [row] = await getDb()
      .select({ organizationId: organizationBilling.organizationId })
      .from(organizationBilling)
      .where(inArray(organizationBilling.organizationId, [orgId]));
    expect(row).toBeDefined();
    // Deletion itself is exercised by this file's own afterAll, which
    // deletes the organization row and relies on ON DELETE CASCADE —
    // if that FK weren't cascading, afterAll would throw.
  });
});

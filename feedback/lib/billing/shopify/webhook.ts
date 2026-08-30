import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { billingWebhookEvent, organizationBilling } from "@/lib/db/schema";
import { getShopifyBillingConfig } from "@/lib/billing/shopify/config";
import type { BillingSubscriptionStatus } from "@/lib/billing/plans";

/**
 * `X-Shopify-Hmac-Sha256` = base64(HMAC-SHA256(raw body, webhook
 * secret)) — Shopify's own documented verification recipe, confirmed
 * directly before writing this rather than assumed. Requires the raw,
 * unparsed request body (a Next.js route handler's own
 * `request.text()` already gives that — never `request.json()` first,
 * which would re-serialize the body and break the signature).
 */
export function verifyShopifyHmac(
  rawBody: string,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader) {
    return false;
  }
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const computedBuffer = Buffer.from(computed);
  const headerBuffer = Buffer.from(hmacHeader);
  if (computedBuffer.length !== headerBuffer.length) {
    return false;
  }
  return timingSafeEqual(computedBuffer, headerBuffer);
}

interface ParsedOrderWebhook {
  orderId: string;
  organizationId: string | null;
  customerId: string | null;
  financialStatus: string | null;
  /** The `variant_id` of every line item on the order, stringified — used to confirm the order actually paid for the configured "Feedback Pro" product before granting entitlement, never inferred from the `organization_id` attribute alone. */
  lineItemVariantIds: string[];
}

/** Reads the classic REST Order webhook payload's `note_attributes` — the array Shopify copies a subscription contract's own custom attributes into on every order it generates, including renewals (confirmed against Shopify's developer changelog before this was written). */
function parseOrderWebhook(rawBody: string): ParsedOrderWebhook | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.id !== "number" && typeof record.id !== "string") {
    return null;
  }

  let organizationId: string | null = null;
  if (Array.isArray(record.note_attributes)) {
    for (const attr of record.note_attributes) {
      if (attr && typeof attr === "object") {
        const a = attr as Record<string, unknown>;
        if (a.name === "organization_id" && typeof a.value === "string") {
          organizationId = a.value;
        }
      }
    }
  }

  const customer = record.customer;
  const customerId =
    customer && typeof customer === "object" && "id" in (customer as Record<string, unknown>)
      ? String((customer as Record<string, unknown>).id)
      : null;

  const lineItemVariantIds: string[] = [];
  if (Array.isArray(record.line_items)) {
    for (const item of record.line_items) {
      if (item && typeof item === "object") {
        const li = item as Record<string, unknown>;
        if (li.variant_id !== undefined && li.variant_id !== null) {
          lineItemVariantIds.push(String(li.variant_id));
        }
      }
    }
  }

  return {
    orderId: String(record.id),
    organizationId,
    customerId,
    financialStatus: typeof record.financial_status === "string" ? record.financial_status : null,
    lineItemVariantIds,
  };
}

/** `"gid://shopify/ProductVariant/123"` → `"123"` — the classic REST order webhook's `line_items[].variant_id` is a bare numeric id, never the Storefront API's GID form `createProCheckoutUrl` uses. */
function numericIdFromGid(gidOrId: string): string {
  const parts = gidOrId.split("/");
  return parts[parts.length - 1] || gidOrId;
}

interface ParsedSubscriptionContractWebhook {
  contractId: string;
  organizationId: string | null;
  status: string | null;
}

/**
 * Best-effort parse of a `subscription_contracts/update` payload.
 * Deliberately defensive (never throws on an unexpected shape, just
 * returns `null`/nulled fields) — this webhook topic's exact JSON
 * shape for a classic (non-embedded-app) webhook subscription could
 * not be confirmed with the same certainty as the very standard
 * `orders/*` REST payload during this build, and this project's rule
 * is to say so honestly rather than guess and claim it works
 * (`DECISIONS.md`'s billing-provider entry, "requires live
 * verification"). `orders/paid`/`orders/cancelled` are the load-
 * bearing signals; this is a secondary, more-precise cancellation
 * signal layered on top.
 */
function parseSubscriptionContractWebhook(rawBody: string): ParsedSubscriptionContractWebhook | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const id = record.admin_graphql_api_id ?? record.id;
  if (id === undefined || id === null) {
    return null;
  }

  let organizationId: string | null = null;
  const customAttributes = record.customAttributes ?? record.custom_attributes;
  if (Array.isArray(customAttributes)) {
    for (const attr of customAttributes) {
      if (attr && typeof attr === "object") {
        const a = attr as Record<string, unknown>;
        const key = a.key ?? a.name;
        if (key === "organization_id" && typeof a.value === "string") {
          organizationId = a.value;
        }
      }
    }
  }

  return {
    contractId: String(id),
    organizationId,
    status: typeof record.status === "string" ? record.status : null,
  };
}

/** Shopify's `SubscriptionContractSubscriptionStatus` values mapped onto our own provider-neutral status enum — see `DECISIONS.md`'s billing-provider entry for the reasoning behind each mapping. */
function mapContractStatus(shopifyStatus: string): BillingSubscriptionStatus | null {
  switch (shopifyStatus.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "PAUSED":
      return "paused";
    case "CANCELLED":
    case "EXPIRED":
    case "FAILED":
      return "canceled";
    default:
      return null;
  }
}

const PRO_PERIOD_LENGTH_MS = 30 * 24 * 60 * 60 * 1000;

export interface ProcessShopifyWebhookInput {
  rawBody: string;
  hmacHeader: string | null;
  webhookId: string | null;
  topic: string | null;
}

export type ProcessShopifyWebhookResult =
  | { status: "not_configured" }
  | { status: "invalid_signature" }
  | { status: "duplicate" }
  | { status: "ignored"; reason: string }
  | { status: "processed" };

/**
 * The single entry point every Shopify billing webhook goes through —
 * verify, deduplicate, then dispatch, all inside one database
 * transaction. Mirrors `lib/changelog/data.ts`'s idempotent-publish
 * pattern: `billing_webhook_event`'s unique `(provider,
 * provider_event_id)` index plus `ON CONFLICT DO NOTHING` is what
 * actually makes a Shopify-redelivered webhook a no-op on its second
 * attempt, not application-level "have I seen this before" logic
 * (`DECISIONS.md` D8-004, reused here).
 *
 * The ledger insert and the entitlement mutation (or its deliberate
 * absence, for an `ignored` outcome) commit or roll back together.
 * Without this, a transient failure *after* the ledger row committed
 * (a dropped connection, a constraint violation) would leave the
 * event marked "seen" with its entitlement change never applied —
 * and Shopify's retry of that exact webhook id would then hit the
 * `duplicate` path and silently never try again, permanently losing
 * a paid or cancelled event. Wrapping both in one transaction means a
 * failure here rolls the ledger insert back too, so the next retry
 * reprocesses it for real.
 */
export async function processShopifyWebhook(
  input: ProcessShopifyWebhookInput,
): Promise<ProcessShopifyWebhookResult> {
  const config = getShopifyBillingConfig();
  if (!config) {
    return { status: "not_configured" };
  }
  if (!verifyShopifyHmac(input.rawBody, input.hmacHeader, config.webhookSecret)) {
    return { status: "invalid_signature" };
  }
  const webhookId = input.webhookId;
  if (!webhookId) {
    return { status: "ignored", reason: "missing X-Shopify-Webhook-Id" };
  }

  return getDb().transaction(async (tx) => {
    const inserted = await tx
      .insert(billingWebhookEvent)
      .values({ provider: "shopify", providerEventId: webhookId, type: input.topic ?? "unknown" })
      .onConflictDoNothing()
      .returning({ id: billingWebhookEvent.id });
    if (inserted.length === 0) {
      return { status: "duplicate" };
    }

    switch (input.topic) {
      case "orders/paid": {
        const order = parseOrderWebhook(input.rawBody);
        if (!order?.organizationId) {
          return { status: "ignored", reason: "no organization_id attribute on this order" };
        }
        // Confirm the paid order actually contains the configured
        // "Feedback Pro" product before granting entitlement — the
        // `organization_id` cart attribute alone isn't proof of
        // payment for *that* product: a cart's line items can be
        // edited independently of its attributes before checkout
        // completes (e.g. the Pro line swapped for something
        // cheaper), so trusting the attribute alone would let an
        // unrelated paid order grant Pro.
        const expectedVariantId = numericIdFromGid(config.proVariantId);
        if (!order.lineItemVariantIds.includes(expectedVariantId)) {
          return {
            status: "ignored",
            reason: "paid order does not contain the configured Pro product variant",
          };
        }
        await tx
          .insert(organizationBilling)
          .values({
            organizationId: order.organizationId,
            provider: "shopify",
            providerCustomerId: order.customerId,
            providerSubscriptionId: order.orderId,
            plan: "pro",
            status: "active",
            currentPeriodEnd: new Date(Date.now() + PRO_PERIOD_LENGTH_MS),
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: organizationBilling.organizationId,
            set: {
              provider: "shopify",
              providerCustomerId: order.customerId,
              providerSubscriptionId: order.orderId,
              plan: "pro",
              status: "active",
              currentPeriodEnd: new Date(Date.now() + PRO_PERIOD_LENGTH_MS),
              cancelAtPeriodEnd: false,
              updatedAt: new Date(),
            },
          });
        return { status: "processed" };
      }
      case "orders/cancelled": {
        const order = parseOrderWebhook(input.rawBody);
        if (!order?.organizationId) {
          return { status: "ignored", reason: "no organization_id attribute on this order" };
        }
        await tx
          .update(organizationBilling)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(organizationBilling.organizationId, order.organizationId));
        return { status: "processed" };
      }
      case "subscription_contracts/update": {
        const contract = parseSubscriptionContractWebhook(input.rawBody);
        if (!contract?.organizationId || !contract.status) {
          return { status: "ignored", reason: "unrecognized subscription-contract payload shape" };
        }
        const mapped = mapContractStatus(contract.status);
        if (!mapped) {
          return { status: "ignored", reason: `unmapped contract status: ${contract.status}` };
        }
        await tx
          .update(organizationBilling)
          .set({ status: mapped, updatedAt: new Date() })
          .where(eq(organizationBilling.organizationId, contract.organizationId));
        return { status: "processed" };
      }
      default:
        return { status: "ignored", reason: `unhandled topic: ${input.topic ?? "(none)"}` };
    }
  });
}

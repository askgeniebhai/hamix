import { NextResponse, type NextRequest } from "next/server";

import { processShopifyWebhook } from "@/lib/billing/shopify/webhook";

/**
 * Shopify's billing webhook receiver (M9 Part H). `request.text()` is
 * the raw, unparsed body — required for `verifyShopifyHmac`; calling
 * `request.json()` first would re-serialize the body and break
 * signature verification.
 *
 * Every response is `200` once the signature check itself has run,
 * including "ignored"/"not configured"/"duplicate" outcomes — Shopify
 * retries a webhook that doesn't get a `2xx`, and none of those
 * outcomes are things retrying would fix. Only a bad signature is
 * rejected outright, and a genuinely unexpected server error still
 * surfaces as a `500` so Shopify's own retry schedule can recover it.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await processShopifyWebhook({
    rawBody,
    hmacHeader: request.headers.get("x-shopify-hmac-sha256"),
    webhookId: request.headers.get("x-shopify-webhook-id"),
    topic: request.headers.get("x-shopify-topic"),
  });

  if (result.status === "invalid_signature") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  return NextResponse.json({ status: result.status });
}

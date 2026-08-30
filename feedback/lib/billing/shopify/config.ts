import "server-only";

import { getEnv } from "@/lib/env";

export interface ShopifyBillingConfig {
  storeDomain: string;
  storefrontAccessToken: string;
  webhookSecret: string;
  proVariantId: string;
  proSellingPlanId: string;
  apiVersion: string;
}

let cached: ShopifyBillingConfig | null | undefined;

/**
 * Resolves M9's billing configuration — reusing the Product Owner's
 * existing Shopify store/Shopify Payments setup rather than opening a
 * separate payment stack (`DECISIONS.md`'s billing-provider entry).
 * Returns `null`, never throws, when any piece is missing: a
 * zero-env build/dev/CI run must succeed, and every call site decides
 * for itself what "billing isn't configured here" means (a checkout
 * action fails loudly and truthfully only when actually attempted; a
 * webhook with no configured secret can't be verified, so it's
 * refused rather than trusted).
 */
export function getShopifyBillingConfig(): ShopifyBillingConfig | null {
  if (cached !== undefined) {
    return cached;
  }

  const env = getEnv();
  if (
    !env.SHOPIFY_STORE_DOMAIN ||
    !env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    !env.SHOPIFY_WEBHOOK_SECRET ||
    !env.SHOPIFY_PRO_VARIANT_ID ||
    !env.SHOPIFY_PRO_SELLING_PLAN_ID
  ) {
    cached = null;
    return null;
  }

  cached = {
    storeDomain: env.SHOPIFY_STORE_DOMAIN,
    storefrontAccessToken: env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    webhookSecret: env.SHOPIFY_WEBHOOK_SECRET,
    proVariantId: env.SHOPIFY_PRO_VARIANT_ID,
    proSellingPlanId: env.SHOPIFY_PRO_SELLING_PLAN_ID,
    apiVersion: env.SHOPIFY_API_VERSION,
  };
  return cached;
}

export class ShopifyBillingNotConfiguredError extends Error {
  constructor() {
    super(
      "Shopify billing is not configured for this environment (SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_ACCESS_TOKEN / SHOPIFY_WEBHOOK_SECRET / SHOPIFY_PRO_VARIANT_ID / SHOPIFY_PRO_SELLING_PLAN_ID).",
    );
    this.name = "ShopifyBillingNotConfiguredError";
  }
}

import "server-only";

import { createStorefrontApiClient } from "@shopify/storefront-api-client";

import {
  getShopifyBillingConfig,
  ShopifyBillingNotConfiguredError,
} from "@/lib/billing/shopify/config";

const CART_CREATE_MUTATION = `#graphql
  mutation FeedbackProCartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface CartCreateResponse {
  cartCreate: {
    cart: { id: string; checkoutUrl: string } | null;
    userErrors: { field: string[] | null; message: string }[];
  };
}

/**
 * Creates a Shopify Cart for the "Feedback Pro" subscription product
 * (selling plan) and returns its `checkoutUrl` — the URL the admin's
 * browser is redirected to, on the store's own domain, to complete
 * payment through the Product Owner's existing Shopify Payments setup.
 *
 * The cart's `organization_id` attribute is the entire tenant-mapping
 * mechanism: Shopify copies a subscription's cart/contract attributes
 * onto every order it generates from that contract (confirmed
 * directly from Shopify's own developer changelog before writing this
 * — never assumed), so `lib/billing/shopify/webhook.ts` can recover
 * which organization a given order or subscription-contract webhook
 * is about purely from that one attribute, on the *first* checkout
 * and on every renewal, with no separately-stored provider-side id to
 * keep in sync (`DECISIONS.md`'s billing-provider entry).
 *
 * A plain cart *permalink* (`/cart/{variant}:{qty}?selling_plan=...`)
 * cannot be used for this — Shopify's own docs state selling plans
 * don't work with cart permalinks — which is why this goes through
 * the Storefront API's `cartCreate` instead.
 */
export async function createProCheckoutUrl(input: {
  organizationId: string;
}): Promise<string> {
  const config = getShopifyBillingConfig();
  if (!config) {
    throw new ShopifyBillingNotConfiguredError();
  }

  const client = createStorefrontApiClient({
    storeDomain: config.storeDomain,
    apiVersion: config.apiVersion,
    publicAccessToken: config.storefrontAccessToken,
  });

  const { data, errors } = await client.request<CartCreateResponse>(CART_CREATE_MUTATION, {
    variables: {
      input: {
        lines: [
          {
            merchandiseId: config.proVariantId,
            quantity: 1,
            sellingPlanId: config.proSellingPlanId,
          },
        ],
        attributes: [{ key: "organization_id", value: input.organizationId }],
      },
    },
  });

  if (errors || !data?.cartCreate.cart || data.cartCreate.userErrors.length > 0) {
    const detail =
      data?.cartCreate.userErrors.map((e) => e.message).join("; ") ||
      errors?.message ||
      "unknown error";
    throw new Error(`Failed to create Shopify checkout: ${detail}`);
  }

  return data.cartCreate.cart.checkoutUrl;
}

/**
 * A deep link to the store's own hosted customer-account page, where
 * a subscriber manages or cancels their subscription directly through
 * Shopify — the same "hand off to the provider's own self-serve
 * surface, never build a custom one" design `EmailTransport`'s
 * production counterpart follows for delivery. Returns `null` when
 * billing isn't configured (there's no store domain to link to).
 *
 * This assumes the store's classic customer-accounts path
 * (`/account`). If the store instead uses Shopify's newer hosted
 * "New Customer Accounts" (a `shop.app`/custom account domain rather
 * than the store's own), this URL needs to be swapped for that
 * domain before launch — verifying which account system the Product
 * Owner's store actually uses requires looking at that store directly,
 * outside this session's reach (see the launch-readiness checklist).
 */
export function buildManageSubscriptionUrl(): string | null {
  const config = getShopifyBillingConfig();
  if (!config) {
    return null;
  }
  return `https://${config.storeDomain}/account`;
}

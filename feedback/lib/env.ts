import { z } from "zod";

/**
 * Server-side environment validation. Only imported by modules that
 * actually need a variable (lib/db, lib/auth) — never by page/layout
 * components — so the public shell renders without requiring a live
 * database or auth secret to exist yet (M2 is foundation only).
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Postgres/Neon connection string)"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  // Both optional: a zero-env build/dev/CI run must still succeed.
  // When either is missing, `lib/email` resolves to a transport that
  // fails loudly *only when an actual send is attempted* — never at
  // import/build time, and never by silently claiming success
  // (`DECISIONS.md` D8-005).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  // All optional for the same zero-env-safe reason `lib/email`
  // established (`DECISIONS.md` D8-005, mirrored for billing): a
  // build, a dev run, or CI must never require live Shopify
  // credentials, and a billing action with any of these missing fails
  // loudly and truthfully only when actually attempted, never at
  // import time and never by fabricating a "Pro active" state.
  // `SHOPIFY_STORE_DOMAIN` is the store's own `*.myshopify.com`
  // domain (M9's billing reuses the Product Owner's existing Shopify
  // store/Shopify Payments setup rather than a separate payment
  // stack — `DECISIONS.md`'s billing-provider entry).
  SHOPIFY_STORE_DOMAIN: z.string().optional(),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_WEBHOOK_SECRET: z.string().optional(),
  SHOPIFY_PRO_VARIANT_ID: z.string().optional(),
  SHOPIFY_PRO_SELLING_PLAN_ID: z.string().optional(),
  // Shopify releases a new quarterly API version (Storefront API
  // included) roughly every January/April/July/October; overridable
  // without a code change so this doesn't go stale between releases.
  SHOPIFY_API_VERSION: z.string().default("2026-07"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Lazily validates and returns process.env, memoized after the first call. */
export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

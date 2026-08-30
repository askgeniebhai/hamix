/**
 * The two launch plans (M9 Part F) — deliberately just two. Every
 * number that could plausibly change before or shortly after launch
 * (participant limits, the eventual public price) lives here, not
 * scattered through business logic, so raising a limit or repricing
 * Pro is a one-line change, never a hunt through the codebase
 * (`DECISIONS.md`, the pricing-configuration entry).
 *
 * Deliberately provider-neutral: nothing in this file knows a payment
 * provider exists. `plan`/`status` are the only two facts entitlement
 * logic is allowed to depend on — never a provider's own id or
 * vocabulary directly (`DECISIONS.md`'s "payment provider ≠
 * entitlement logic" rule).
 */

export type BillingPlan = "free" | "pro";

/** Mirrors `lib/db/billing-schema.ts`'s `billingSubscriptionStatus` enum values. */
export type BillingSubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export const PLAN_TRACKED_PARTICIPANT_LIMIT: Record<BillingPlan, number> = {
  free: 25,
  pro: 100,
};

/**
 * Display-only — the actual charged amount is whatever price the
 * configured "Feedback Pro" product/selling plan is set to in the
 * Product Owner's Shopify store, never hard-coded into a charge. This
 * is the number the pricing page and billing UI show a visitor
 * *before* Checkout, and it's expected to be edited here to match the
 * store's actual configured price before launch — the working
 * target, not a promise this file enforces.
 */
export const PRO_PLAN_DISPLAY_PRICE_USD = 99;

/**
 * A subscription is only ever entitled to its plan's Pro limit while
 * the provider reports one of these statuses. Everything else —
 * `canceled`, `unpaid`, `incomplete`, `paused`, or simply having
 * never subscribed (`none`) — falls back to the Free limit regardless
 * of what `plan` says the organization last subscribed to. `past_due`
 * is deliberately included: a subscription can sit in a short retry/
 * grace window before a provider ultimately cancels it, and treating
 * that window as still-entitled avoids punishing a business for a
 * charge that hasn't been retried yet — the next webhook moves the
 * row to `canceled` (or back to `active`) when that resolves, and
 * this file has nothing more to decide until then.
 */
const ENTITLED_STATUSES = new Set<BillingSubscriptionStatus>(["active", "trialing", "past_due"]);

export function isEntitledStatus(status: string): boolean {
  return ENTITLED_STATUSES.has(status as BillingSubscriptionStatus);
}

/** The plan an organization is *actually* entitled to right now — never `plan` alone. */
export function resolveEffectivePlan(input: {
  plan: BillingPlan;
  status: string;
}): BillingPlan {
  return input.plan === "pro" && isEntitledStatus(input.status) ? "pro" : "free";
}

export function trackedParticipantLimitFor(plan: BillingPlan): number {
  return PLAN_TRACKED_PARTICIPANT_LIMIT[plan];
}

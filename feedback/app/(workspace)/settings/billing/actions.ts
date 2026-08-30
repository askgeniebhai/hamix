"use server";

import { redirect } from "next/navigation";

import { requireActiveOrganization } from "@/lib/auth/session";
import { createProCheckoutUrl } from "@/lib/billing/shopify/checkout";
import { ShopifyBillingNotConfiguredError } from "@/lib/billing/shopify/config";

export interface FormState {
  error?: string;
}

const genericError = "Couldn't start checkout. Please try again.";

/** Only a workspace owner or admin may start/manage billing (M9 Part I) — a regular member never reaches Checkout or the provider's subscription-management page, even by guessing this action's URL. */
function assertCanManageBilling(role: string): FormState | null {
  if (role !== "owner" && role !== "admin") {
    return { error: "Only a workspace owner or admin can manage billing." };
  }
  return null;
}

/**
 * Starts a Shopify Checkout for the "Feedback Pro" subscription.
 * `redirect()` is deliberately called outside the try/catch below —
 * it works by throwing internally, and catching broadly here would
 * swallow that throw and turn a successful redirect into a reported
 * error.
 */
export async function startCheckoutAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { organization } = await requireActiveOrganization();
  const denied = assertCanManageBilling(organization.role);
  if (denied) {
    return denied;
  }

  let checkoutUrl: string;
  try {
    checkoutUrl = await createProCheckoutUrl({ organizationId: organization.id });
  } catch (error) {
    return {
      error:
        error instanceof ShopifyBillingNotConfiguredError
          ? "Billing isn't configured for this environment yet."
          : genericError,
    };
  }

  redirect(checkoutUrl);
}

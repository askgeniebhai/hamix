import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizationBilling } from "@/lib/db/schema";
import type { BillingPlan } from "@/lib/billing/plans";

export interface OrganizationBillingRow {
  organizationId: string;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  plan: BillingPlan;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

const DEFAULT_ROW_SHAPE = {
  provider: null,
  providerCustomerId: null,
  providerSubscriptionId: null,
  plan: "free" as const,
  status: "none",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

/**
 * An organization's billing row, or the implicit Free-plan default
 * for one that has never touched billing — no row is created just to
 * read one, so a brand-new workspace never needs a billing insert
 * before it can use the free product loop at all.
 */
export async function getOrganizationBilling(
  organizationId: string,
): Promise<OrganizationBillingRow> {
  const [row] = await getDb()
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.organizationId, organizationId))
    .limit(1);

  if (!row) {
    return { organizationId, ...DEFAULT_ROW_SHAPE };
  }
  return row;
}

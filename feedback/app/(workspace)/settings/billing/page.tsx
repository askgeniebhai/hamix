import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/billing/usage";
import { buildManageSubscriptionUrl } from "@/lib/billing/shopify/checkout";
import { PRO_PLAN_DISPLAY_PRICE_USD } from "@/lib/billing/plans";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingPage() {
  const { organization } = await requireActiveOrganization();
  const canManageBilling = organization.role === "owner" || organization.role === "admin";
  const entitlement = await getEntitlement(organization.id);
  const manageSubscriptionUrl = entitlement.plan === "pro" ? buildManageSubscriptionUrl() : null;

  const usagePercent = Math.min(
    100,
    Math.round((entitlement.trackedParticipantCount / entitlement.trackedParticipantLimit) * 100),
  );
  const atLimit = entitlement.trackedParticipantCount >= entitlement.trackedParticipantLimit;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Your plan and tracked-participant usage.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Current plan</CardTitle>
            <Badge variant={entitlement.plan === "pro" ? "default" : "outline"}>
              {entitlement.plan === "pro" ? "Pro" : "Free"}
            </Badge>
          </div>
          <CardDescription>
            {entitlement.plan === "pro"
              ? "Full access to Feedback, Roadmap, and Changelog for your customers."
              : "The complete core loop — Feedback, Voting, Comments, Status, Roadmap, and Changelog — free while you're getting started."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Tracked participants</span>
              <span className={cn("tabular-nums", atLimit ? "font-medium text-destructive" : "text-muted-foreground")}>
                {entitlement.trackedParticipantCount} / {entitlement.trackedParticipantLimit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
              <div
                className={cn("h-full rounded-full", atLimit ? "bg-destructive" : "bg-primary")}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A tracked participant is an external customer who submitted feedback, voted, or
              commented — not a workspace member, and not someone who only followed a request for
              updates. At the limit, everyone already tracked keeps working normally — only a
              brand-new participant is paused until you upgrade.
            </p>
          </div>

          {entitlement.plan === "free" ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">
                Nudge Pro — ${PRO_PLAN_DISPLAY_PRICE_USD}/month
              </p>
              <p className="text-xs text-muted-foreground">
                Up to 100 tracked participants. Checkout runs through our existing Shopify store.
              </p>
              {canManageBilling ? (
                <UpgradeButton />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ask a workspace owner or admin to upgrade.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              {entitlement.cancelAtPeriodEnd ? (
                <p className="text-sm text-foreground">
                  Your subscription is set to end
                  {entitlement.currentPeriodEnd ? ` on ${formatDate(entitlement.currentPeriodEnd)}` : ""}.
                  You&rsquo;ll keep Pro access until then.
                </p>
              ) : (
                <p className="text-sm text-foreground">
                  Thanks for being a Nudge Pro customer.
                </p>
              )}
              {canManageBilling && manageSubscriptionUrl ? (
                <Link
                  href={manageSubscriptionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
                >
                  Manage subscription
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

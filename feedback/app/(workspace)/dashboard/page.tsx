import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Milestone, ScrollText } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/session";
import { getBoardForOrganization, getFeedbackSummary } from "@/lib/feedback/data";
import { getEntitlement } from "@/lib/billing/usage";
import { PublicBoardUrl } from "@/components/dashboard/public-board-url";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * The first screen after onboarding, and the one an admin returns to
 * — so it earns its place by answering M9 Part K's "first-value
 * moment" (the public board URL, front and center, not one extra
 * click into Settings) and Part C's admin acceptance bar ("what needs
 * my attention, without learning the software first?") with a real
 * open-requests count, not a static message. Previously a fixed
 * empty-state shown identically whether the workspace had zero or a
 * hundred requests, with copy that had gone stale the moment Roadmap
 * and Changelog shipped (M7/M8) — see
 * `docs/UI_UX_COMMERCIAL_BENCHMARK.md`'s dashboard row.
 */
export default async function DashboardPage() {
  const { organization } = await requireActiveOrganization();
  const board = await getBoardForOrganization(organization.id);
  const [summary, entitlement] = await Promise.all([
    getFeedbackSummary(organization.id),
    getEntitlement(organization.id),
  ]);

  const baseUrl = getEnv().BETTER_AUTH_URL.replace(/\/+$/, "");
  const boardUrl = board ? `${baseUrl}/b/${board.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {organization.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Share this link with customers, then triage what comes back.
        </p>
      </div>

      {boardUrl ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">Your public feedback board</CardTitle>
            <CardDescription>
              Anyone with this link can submit ideas, vote, and see what&rsquo;s planned —
              no account needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublicBoardUrl url={boardUrl} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/feedback" className="block">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Inbox className="size-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">Needs a look</CardTitle>
              </div>
              <CardDescription>
                {summary.needsAttentionCount === 0
                  ? "Nothing new — you're caught up."
                  : `${summary.needsAttentionCount} request${summary.needsAttentionCount === 1 ? "" : "s"} not yet triaged.`}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {boardUrl ? (
          <Link href={`${new URL(boardUrl).pathname}/roadmap`} className="block">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Milestone className="size-4 text-muted-foreground" aria-hidden="true" />
                  <CardTitle className="text-base">Public roadmap</CardTitle>
                </div>
                <CardDescription>
                  Planned, in progress, and complete — visible to every customer.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ) : null}

        <Link href="/changelog" className="block">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ScrollText className="size-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">Changelog</CardTitle>
              </div>
              <CardDescription>
                Publish what shipped and close the loop with subscribers.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          {summary.totalCount} total request{summary.totalCount === 1 ? "" : "s"}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {entitlement.trackedParticipantCount} / {entitlement.trackedParticipantLimit} tracked
          participants
        </span>
        <Link
          href="/settings/billing"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto px-2 py-0.5 text-xs")}
        >
          View billing
        </Link>
      </div>
    </div>
  );
}

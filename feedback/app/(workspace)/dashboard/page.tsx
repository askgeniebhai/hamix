import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/session";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { organization } = await requireActiveOrganization();

  return (
    <EmptyState
      icon={Sparkles}
      headingLevel="h1"
      title={`${organization.name} is ready`}
      description="Roadmap and changelog tools will appear here in a future milestone. Feedback collection is live — see what's been submitted."
      action={
        <Link href="/feedback" className={buttonVariants({ variant: "outline" })}>
          View feedback
        </Link>
      }
    />
  );
}

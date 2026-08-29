import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/session";
import { EmptyState } from "@/components/empty-state";

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
      description="Feedback boards, voting, and roadmap tools will appear here in a future milestone. This foundation is where they'll live."
    />
  );
}

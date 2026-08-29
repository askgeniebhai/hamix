import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <EmptyState
      icon={Sparkles}
      headingLevel="h1"
      title="Your workspace is ready"
      description="Feedback boards, voting, and roadmap tools will appear here in a future milestone. This foundation is where they'll live."
    />
  );
}

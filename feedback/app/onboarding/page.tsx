import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";

import { requireSession } from "@/lib/auth/session";
import { CreateWorkspaceForm } from "@/components/auth/create-workspace-form";

export const metadata: Metadata = {
  title: "Create your workspace",
};

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-medium text-foreground"
      >
        <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
        Nudge
      </Link>
      <main id="main-content" className="w-full max-w-sm">
        <CreateWorkspaceForm />
      </main>
    </div>
  );
}

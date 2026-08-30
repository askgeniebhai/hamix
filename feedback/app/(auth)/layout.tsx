import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";

import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (session) {
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
        {children}
      </main>
    </div>
  );
}

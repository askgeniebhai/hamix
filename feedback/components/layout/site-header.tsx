import Link from "next/link";
import { MessageSquareText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
          Feedback
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}

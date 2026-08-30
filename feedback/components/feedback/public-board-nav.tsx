import Link from "next/link";

import { cn } from "@/lib/utils";

interface PublicBoardNavProps {
  boardSlug: string;
  active: "feedback" | "roadmap";
}

const TABS = [
  { key: "feedback", label: "Feedback", href: (slug: string) => `/b/${slug}` },
  { key: "roadmap", label: "Roadmap", href: (slug: string) => `/b/${slug}/roadmap` },
] as const;

/** Switches between a public board's two views. Shared by `/b/[slug]` and `/b/[slug]/roadmap` so a visitor always has one clear way to move between "what's being asked for" and "what's happening about it." */
export function PublicBoardNav({ boardSlug, active }: PublicBoardNavProps) {
  return (
    <nav aria-label="Board" className="flex w-fit items-center gap-1 rounded-full bg-muted p-1">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href(boardSlug)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  /**
   * Heading level for the title. Use "h1" when this is a page's only
   * heading (e.g. the whole page is an empty state); defaults to "h2"
   * for use alongside a page header a level above it.
   */
  headingLevel?: "h1" | "h2";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  headingLevel = "h2",
}: EmptyStateProps) {
  const Heading = headingLevel;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <Heading className="text-sm font-medium text-foreground">
          {title}
        </Heading>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

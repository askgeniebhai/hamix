"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  LayoutGrid,
  MessageSquareText,
  Milestone,
  ScrollText,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Feedback", href: "/feedback", icon: Inbox },
  { label: "Settings", href: "/settings", icon: Settings },
];

const upcomingNav = [
  { label: "Roadmap", icon: Milestone },
  { label: "Changelog", icon: ScrollText },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4 text-sidebar-foreground md:flex">
      <Link
        href="/"
        className="flex items-center gap-2 px-2 pb-6 text-sm font-medium"
      >
        <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
        Feedback
      </Link>

      <nav aria-label="Workspace" className="flex flex-col gap-1">
        {primaryNav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-1 border-t border-sidebar-border pt-4">
        <span className="px-2 pb-1 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
        {upcomingNav.map(({ label, icon: Icon }) => (
          <span
            key={label}
            aria-disabled="true"
            className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/70"
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </aside>
  );
}

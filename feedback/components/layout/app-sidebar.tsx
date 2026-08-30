"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Inbox,
  LayoutGrid,
  MessageSquareText,
  ScrollText,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const primaryNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Feedback", href: "/feedback", icon: Inbox },
  { label: "Changelog", href: "/changelog", icon: ScrollText },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
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
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNav } from "@/components/layout/app-sidebar";
import { cn } from "@/lib/utils";

/**
 * The mobile counterpart to `AppSidebar`, which is `hidden md:flex` —
 * genuinely absent, not just visually hidden, below the `md`
 * breakpoint. Before this component existed there was no way at all
 * to reach Feedback/Changelog/Billing/Settings from a phone — a real
 * gap the M9 UI/UX benchmark's mobile pass caught
 * (`docs/UI_UX_COMMERCIAL_BENCHMARK.md`).
 *
 * A persistent bottom tab bar rather than a hamburger menu: every
 * primary destination is one tap away, nothing to open first — the
 * simpler of the two for a small nav like this, and consistent with
 * Part C's "no giant wizard, no extra interaction" instruction.
 *
 * Shares `aria-label="Workspace"` with the desktop `<nav>` in
 * `AppSidebar`. That's safe, not ambiguous: Tailwind's `hidden`/`flex`
 * pair is a true `display: none` toggle, so only one of the two is
 * ever actually present in the accessibility tree at a given
 * viewport — the same locator (`getByRole("navigation", {name:
 * "Workspace"})`) resolves correctly either way.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-sidebar px-1 py-1.5 text-sidebar-foreground md:hidden"
    >
      {primaryNav.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

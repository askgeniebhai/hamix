"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function UserMenu({
  user,
}: {
  user: { name: string; email: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function logOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={`Account menu for ${user.name}`}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
      >
        <Avatar className="size-6">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <ChevronsUpDown
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{user.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logOut}>
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import type { ActiveOrganization } from "@/lib/auth/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OrgSwitcher({
  organization,
  organizations,
}: {
  organization: { id: string; name: string };
  organizations: ActiveOrganization[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [switchError, setSwitchError] = useState<string | null>(null);

  function switchTo(organizationId: string) {
    if (organizationId === organization.id) return;
    setSwitchError(null);
    startTransition(async () => {
      const { error } = await authClient.organization.setActive({
        organizationId,
      });
      if (error) {
        setSwitchError(error.message ?? "Couldn't switch workspace.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        <span className="text-muted-foreground">Workspace</span>
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>
        <span>{organization.name}</span>
        {organizations.length > 1 ? (
          <ChevronsUpDown
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => switchTo(org.id)}>
              {org.id === organization.id ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <span className="size-4" aria-hidden="true" />
              )}
              {org.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {switchError ? (
          <p className="px-1.5 py-1 text-xs text-destructive">{switchError}</p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

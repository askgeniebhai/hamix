import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ScrollText } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/session";
import { listChangelogEntriesForOrganization } from "@/lib/changelog/data";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Changelog",
};

export default async function ChangelogListPage() {
  const { organization } = await requireActiveOrganization();
  const entries = await listChangelogEntriesForOrganization(organization.id);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Changelog</h1>
          <p className="text-sm text-muted-foreground">
            Tell customers what shipped, and close the loop on what they asked for.
          </p>
        </div>
        <Link href="/changelog/new" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          New entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No changelog entries yet"
          description="Write your first release note and link the requests it closes the loop on."
          action={
            <Link href="/changelog/new" className={buttonVariants({ variant: "outline" })}>
              New entry
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/changelog/${entry.id}`}>
                <Card className="transition-colors hover:ring-foreground/20">
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">{entry.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.linkedPostCount}{" "}
                        {entry.linkedPostCount === 1 ? "linked request" : "linked requests"}
                        {entry.publishedAt
                          ? ` · Published ${formatDate(entry.publishedAt)}`
                          : ` · Created ${formatDate(entry.createdAt)}`}
                      </span>
                    </div>
                    <Badge variant={entry.state === "published" ? "default" : "outline"}>
                      {entry.state === "published" ? "Published" : "Draft"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

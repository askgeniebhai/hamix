import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChangelogDraftForm } from "@/components/changelog/changelog-draft-form";
import { createDraftAction } from "@/app/(workspace)/changelog/actions";

export const metadata: Metadata = {
  title: "New changelog entry",
};

export default function NewChangelogEntryPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/changelog"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Changelog
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New entry</h1>
        <p className="text-sm text-muted-foreground">
          Save as a draft first — you can link requests and publish from the next screen.
        </p>
      </div>

      <div className="max-w-xl">
        <ChangelogDraftForm
          action={createDraftAction}
          submitLabel="Save draft"
          pendingLabel="Saving…"
        />
      </div>
    </div>
  );
}

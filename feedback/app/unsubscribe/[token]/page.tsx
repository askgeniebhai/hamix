import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { unsubscribeByToken } from "@/lib/feedback/data";

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Unsubscribed",
};

/**
 * Reached only from an email link — no cookie or session, by design
 * (the recipient may be on a different browser/device than the one
 * they followed from). `unsubscribeByToken` is idempotent: a second
 * visit to the same link (a repeat click, an email client
 * pre-fetching it) finds nothing to delete and this page says so
 * plainly, rather than erroring.
 */
export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { token } = await params;
  const result = await unsubscribeByToken(token);

  return (
    <main
      id="main-content"
      className="flex min-h-svh flex-1 flex-col items-center justify-center p-6"
    >
      <EmptyState
        icon={BellOff}
        headingLevel="h1"
        title={result ? "You're unfollowed" : "Nothing to unfollow"}
        description={
          result
            ? `You won't get any more updates about "${result.title}".`
            : "This link has already been used, or isn't valid."
        }
        action={
          result ? (
            <Link
              href={`/b/${result.boardSlug}/p/${result.postId}`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View the request
            </Link>
          ) : undefined
        }
      />
    </main>
  );
}

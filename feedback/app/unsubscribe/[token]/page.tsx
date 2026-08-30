import type { Metadata } from "next";
import { BellOff } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { UnsubscribeConfirm } from "@/components/feedback/unsubscribe-confirm";
import { previewUnsubscribeByToken } from "@/lib/feedback/data";

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Unsubscribe",
};

/**
 * Reached only from an email link — no cookie or session, by design
 * (the recipient may be on a different browser/device than the one
 * they followed from). This GET render never mutates: it only resolves
 * the token with `previewUnsubscribeByToken` and shows a confirmation.
 * The actual unsubscribe happens in `UnsubscribeConfirm`'s client-side
 * form, an explicit POST through `confirmUnsubscribeAction` — so an
 * email security scanner or client prefetching this URL can't silently
 * unsubscribe the real recipient before they ever open the email.
 */
export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { token } = await params;
  const post = await previewUnsubscribeByToken(token);

  return (
    <main
      id="main-content"
      className="flex min-h-svh flex-1 flex-col items-center justify-center p-6"
    >
      {post ? (
        <UnsubscribeConfirm token={token} post={post} />
      ) : (
        <EmptyState
          icon={BellOff}
          headingLevel="h1"
          title="Nothing to unfollow"
          description="This link has already been used, or isn't valid."
        />
      )}
    </main>
  );
}

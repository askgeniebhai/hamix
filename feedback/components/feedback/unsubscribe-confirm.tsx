"use client";

import { useActionState } from "react";
import { Bell, BellOff } from "lucide-react";

import { confirmUnsubscribeAction, type ConfirmUnsubscribeState } from "@/app/unsubscribe/[token]/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import type { SubscribedPost } from "@/lib/feedback/data";

interface UnsubscribeConfirmProps {
  token: string;
  post: SubscribedPost;
}

const initialState: ConfirmUnsubscribeState = { submitted: false, result: null };

/**
 * Reached only from an email link, so a plain GET must never
 * unsubscribe anyone — a security scanner or client prefetching the
 * URL only ever triggers the server component's read-only
 * `previewUnsubscribeByToken` lookup that produces `post` below. The
 * actual removal happens only once a person clicks this button, which
 * POSTs through `confirmUnsubscribeAction`.
 */
export function UnsubscribeConfirm({ token, post }: UnsubscribeConfirmProps) {
  const boundAction = confirmUnsubscribeAction.bind(null, token);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (state.submitted) {
    return (
      <EmptyState
        icon={BellOff}
        headingLevel="h1"
        title={state.result ? "You're unfollowed" : "Nothing to unfollow"}
        description={
          state.result
            ? `You won't get any more updates about "${state.result.title}".`
            : "This link has already been used, or isn't valid."
        }
      />
    );
  }

  return (
    <EmptyState
      icon={Bell}
      headingLevel="h1"
      title="Stop following this request?"
      description={`You'll no longer get updates about "${post.title}".`}
      action={
        <form action={formAction}>
          <Button type="submit" disabled={pending}>
            {pending ? "Unfollowing…" : "Stop following"}
          </Button>
        </form>
      }
    />
  );
}

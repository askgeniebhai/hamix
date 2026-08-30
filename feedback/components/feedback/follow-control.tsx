"use client";

import { useActionState, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import { followAction, unfollowAction, type FormState } from "@/app/b/[slug]/p/[postId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FollowControlProps {
  boardSlug: string;
  postId: string;
  following: boolean;
  identified: boolean;
}

const initialState: FormState = {};

/** "Follow updates" / "Stop following" — the only UI that creates or removes a `post_subscription` row, always an explicit click, never implied by voting or commenting. */
export function FollowControl({ boardSlug, postId, following, identified }: FollowControlProps) {
  const [showIdentify, setShowIdentify] = useState(false);
  const boundAction = following
    ? unfollowAction.bind(null, boardSlug, postId)
    : followAction.bind(null, boardSlug, postId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (!following && !identified && !showIdentify) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setShowIdentify(true)}>
        <Bell className="size-3.5" aria-hidden="true" />
        Follow updates
      </Button>
    );
  }

  if (!following && !identified && showIdentify) {
    return (
      <form
        action={formAction}
        className="flex w-56 flex-col gap-1.5 rounded-lg border border-border bg-card p-2 shadow-sm"
      >
        <p className="px-0.5 text-xs font-medium text-muted-foreground">
          Follow this request for updates
        </p>
        <label className="sr-only" htmlFor={`follow-name-${postId}`}>
          Your name
        </label>
        <Input
          id={`follow-name-${postId}`}
          name="name"
          placeholder="Your name"
          required
          autoComplete="name"
          aria-invalid={!!state.error}
        />
        <label className="sr-only" htmlFor={`follow-email-${postId}`}>
          Your email
        </label>
        <Input
          id={`follow-email-${postId}`}
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          aria-invalid={!!state.error}
        />
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Following…" : "Follow"}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction}>
      <Button type="submit" variant={following ? "secondary" : "outline"} size="sm" disabled={pending}>
        {following ? (
          <>
            <BellOff className="size-3.5" aria-hidden="true" />
            {pending ? "…" : "Stop following"}
          </>
        ) : (
          <>
            <Bell className="size-3.5" aria-hidden="true" />
            {pending ? "…" : "Follow updates"}
          </>
        )}
      </Button>
    </form>
  );
}

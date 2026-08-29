"use client";

import { useActionState, useState } from "react";
import { ChevronUp } from "lucide-react";

import { unvoteAction, voteAction, type FormState } from "@/app/b/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VoteControlProps {
  boardSlug: string;
  postId: string;
  title: string;
  voteCount: number;
  voted: boolean;
  identified: boolean;
}

const initialState: FormState = {};

const countLabel = (count: number) => `${count} vote${count === 1 ? "" : "s"}`;

export function VoteControl({
  boardSlug,
  postId,
  title,
  voteCount,
  voted,
  identified,
}: VoteControlProps) {
  const [showIdentify, setShowIdentify] = useState(false);
  const boundAction = voted
    ? unvoteAction.bind(null, boardSlug, postId)
    : voteAction.bind(null, boardSlug, postId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (!voted && !identified && !showIdentify) {
    return (
      <button
        type="button"
        onClick={() => setShowIdentify(true)}
        aria-label={`Vote for “${title}” — ${countLabel(voteCount)}`}
        className="flex w-14 flex-col items-center gap-0.5 rounded-lg border border-border bg-background px-2 py-1.5 text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronUp className="size-4" aria-hidden="true" />
        <span className="text-sm font-semibold tabular-nums">{voteCount}</span>
      </button>
    );
  }

  if (!voted && !identified && showIdentify) {
    return (
      <form
        action={formAction}
        className="flex w-44 flex-col gap-1.5 rounded-lg border border-border bg-card p-2 shadow-sm"
      >
        <p className="px-0.5 text-xs font-medium text-muted-foreground">
          One-time — to vote
        </p>
        <label className="sr-only" htmlFor={`vote-name-${postId}`}>
          Your name
        </label>
        <Input
          id={`vote-name-${postId}`}
          name="name"
          placeholder="Your name"
          required
          autoComplete="name"
          aria-invalid={!!state.error}
        />
        <label className="sr-only" htmlFor={`vote-email-${postId}`}>
          Your email
        </label>
        <Input
          id={`vote-email-${postId}`}
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          aria-invalid={!!state.error}
        />
        {state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Voting…" : "Vote"}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        aria-pressed={voted}
        aria-label={
          voted
            ? `Remove your vote from “${title}” — ${countLabel(voteCount)}`
            : `Vote for “${title}” — ${countLabel(voteCount)}`
        }
        className={cn(
          "flex w-14 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60",
          voted
            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
            : "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary",
        )}
      >
        <ChevronUp className="size-4" aria-hidden="true" />
        <span className="text-sm font-semibold tabular-nums">{voteCount}</span>
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { ChevronUp, MessageCircle } from "lucide-react";

import {
  linkPostAction,
  unlinkPostAction,
  type FormState,
} from "@/app/(workspace)/changelog/[entryId]/actions";
import { Button } from "@/components/ui/button";
import type { CompletablePost } from "@/lib/changelog/data";

const initialState: FormState = {};

function LinkToggle({ entryId, post }: { entryId: string; post: CompletablePost }) {
  const boundAction = (post.linked ? unlinkPostAction : linkPostAction).bind(null, entryId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="postId" value={post.id} />
      <Button type="submit" size="sm" variant={post.linked ? "outline" : "secondary"} disabled={pending}>
        {pending ? "…" : post.linked ? "Unlink" : "Link"}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}

/** The `complete` post picker — nothing else is selectable, enforcing M8-B's link rule at the UI's data source as well as the write itself. */
export function FeedbackPicker({
  entryId,
  posts,
}: {
  entryId: string;
  posts: CompletablePost[];
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No Complete requests yet — mark a request Complete from its thread to link it here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {posts.map((post) => (
        <li
          key={post.id}
          className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{post.title}</span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 tabular-nums">
                <ChevronUp className="size-3.5" aria-hidden="true" />
                {post.voteCount}
              </span>
              <span className="flex items-center gap-1 tabular-nums">
                <MessageCircle className="size-3.5" aria-hidden="true" />
                {post.commentCount}
              </span>
            </span>
          </div>
          <LinkToggle entryId={entryId} post={post} />
        </li>
      ))}
    </ul>
  );
}

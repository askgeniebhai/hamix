import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { FeedbackComment } from "@/lib/feedback/data";

/**
 * A read-only comment list, shared by the public detail page and the
 * admin thread view — team replies are visually distinguished (a
 * "Team" badge + a subtly tinted card) from customer replies (plain
 * card), per M5's "clearly distinguish team replies visually"
 * requirement, without turning the thread into a noisy forum.
 */
export function CommentThread({ comments }: { comments: FeedbackComment[] }) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No comments yet — be the first to reply.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {comments.map((comment) => (
        <li key={comment.id}>
          <article
            className={
              comment.authorKind === "team"
                ? "flex flex-col gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-4"
                : "flex flex-col gap-1.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {comment.authorName}
              </span>
              {comment.authorKind === "team" ? (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <Users aria-hidden="true" />
                  Team
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-pretty text-foreground">{comment.body}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}

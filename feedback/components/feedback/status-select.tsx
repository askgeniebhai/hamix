"use client";

import { useState, useTransition } from "react";

import { updateStatusAction } from "@/app/(workspace)/feedback/[postId]/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/feedback/status-badge";
import { POST_STATUSES, POST_STATUS_LABELS, type PostStatus } from "@/lib/feedback/status";

/**
 * The admin status changer. Calls `updateStatusAction` directly
 * (an imperative server-action call, not a form submission) so
 * changing status is a single select interaction — no separate
 * "save" step. Optimistic: the badge updates immediately, and rolls
 * back only if the server actually rejects the change (a cross-tenant
 * post, or a session that's no longer a valid member — both rejected
 * server-side regardless of what this control shows).
 */
export function StatusSelect({
  postId,
  status,
}: {
  postId: string;
  status: PostStatus;
}) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(next: PostStatus | null) {
    if (!next) {
      return;
    }
    const previous = current;
    setCurrent(next);
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("status", next);
      const result = await updateStatusAction(postId, {}, formData);
      if (result.error) {
        setCurrent(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Select value={current} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger aria-label="Change status">
          <SelectValue>
            <StatusBadge status={current} className="border-0 px-0" />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {POST_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {POST_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

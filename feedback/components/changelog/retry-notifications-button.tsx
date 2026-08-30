"use client";

import { useActionState } from "react";
import { CircleAlert, RotateCw } from "lucide-react";

import { retryNotificationsAction, type FormState } from "@/app/(workspace)/changelog/[entryId]/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

/**
 * Resumes delivery for a published entry's `pending`/`failed`
 * notification rows. Only rendered when there's something to retry —
 * see `PublishedSummary` in `app/(workspace)/changelog/[entryId]/page.tsx`.
 */
export function RetryNotificationsButton({ entryId }: { entryId: string }) {
  const boundAction = retryNotificationsAction.bind(null, entryId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-fit">
        <RotateCw className="size-3.5" aria-hidden="true" />
        {pending ? "Retrying…" : "Retry failed/pending deliveries"}
      </Button>
    </form>
  );
}

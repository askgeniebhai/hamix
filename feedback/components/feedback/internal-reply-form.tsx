"use client";

import { useActionState, useId } from "react";
import { CircleAlert } from "lucide-react";

import { addInternalReplyAction, type FormState } from "@/app/(workspace)/feedback/[postId]/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: FormState = {};

export function InternalReplyForm({ postId }: { postId: string }) {
  const boundAction = addInternalReplyAction.bind(null, postId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const bodyId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={bodyId}>Reply publicly as your team</Label>
        <Textarea
          id={bodyId}
          name="body"
          required
          minLength={1}
          maxLength={2000}
          rows={3}
          placeholder="This reply will be visible to everyone on the public board."
        />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Posting…" : "Post reply"}
      </Button>
    </form>
  );
}

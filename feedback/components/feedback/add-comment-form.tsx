"use client";

import { useActionState, useId } from "react";
import { CircleAlert } from "lucide-react";

import { addExternalCommentAction, type FormState } from "@/app/b/[slug]/p/[postId]/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddCommentFormProps {
  boardSlug: string;
  postId: string;
  identified: boolean;
}

const initialState: FormState = {};

export function AddCommentForm({ boardSlug, postId, identified }: AddCommentFormProps) {
  const boundAction = addExternalCommentAction.bind(null, boardSlug, postId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const bodyId = useId();
  const nameId = useId();
  const emailId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={bodyId}>Add a comment</Label>
        <Textarea
          id={bodyId}
          name="body"
          required
          minLength={1}
          maxLength={2000}
          rows={3}
          placeholder="Share more detail, or ask a question…"
        />
      </div>

      {!identified ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={nameId}>Your name</Label>
            <Input id={nameId} name="name" required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={emailId}>Your email</Label>
            <Input id={emailId} name="email" type="email" required autoComplete="email" />
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Posting…" : "Post comment"}
      </Button>
    </form>
  );
}

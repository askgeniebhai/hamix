"use client";

import { useActionState, useId } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ChangelogDraftFormState {
  error?: string;
}

interface ChangelogDraftFormProps {
  action: (
    prevState: ChangelogDraftFormState,
    formData: FormData,
  ) => Promise<ChangelogDraftFormState>;
  initialTitle?: string;
  initialBody?: string;
  submitLabel: string;
  pendingLabel: string;
}

const initialState: ChangelogDraftFormState = {};

/** The shared title+body editor for both creating a draft and editing an existing one — deliberately just two plain fields, no rich-text editor ("keep the editor simple," M8-C). */
export function ChangelogDraftForm({
  action,
  initialTitle = "",
  initialBody = "",
  submitLabel,
  pendingLabel,
}: ChangelogDraftFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const titleId = useId();
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
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          name="title"
          required
          minLength={3}
          maxLength={140}
          defaultValue={initialTitle}
          placeholder="Dark mode is here"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={bodyId}>What shipped</Label>
        <Textarea
          id={bodyId}
          name="body"
          required
          minLength={10}
          maxLength={5000}
          rows={8}
          defaultValue={initialBody}
          placeholder="Describe the release in plain language…"
        />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

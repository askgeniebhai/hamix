"use client";

import { useActionState } from "react";
import { CircleAlert } from "lucide-react";

import { publishAction, type FormState } from "@/app/(workspace)/changelog/[entryId]/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

export function PublishButton({ entryId }: { entryId: string }) {
  const boundAction = publishAction.bind(null, entryId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Publishing…" : "Publish"}
      </Button>
    </form>
  );
}

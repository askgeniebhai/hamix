"use client";

import { useActionState } from "react";
import { CircleAlert } from "lucide-react";

import { startCheckoutAction, type FormState } from "@/app/(workspace)/settings/billing/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

export function UpgradeButton() {
  const [state, formAction, pending] = useActionState(startCheckoutAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Starting checkout…" : "Upgrade to Pro"}
      </Button>
    </form>
  );
}

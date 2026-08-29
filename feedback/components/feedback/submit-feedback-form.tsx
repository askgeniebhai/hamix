"use client";

import { useActionState } from "react";
import { CircleAlert } from "lucide-react";

import { submitFeedbackAction, type FormState } from "@/app/b/[slug]/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: FormState = {};

export function SubmitFeedbackForm({ boardSlug }: { boardSlug: string }) {
  const boundAction = submitFeedbackAction.bind(null, boardSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          Share feedback
        </CardTitle>
        <CardDescription>
          Tell us what you need — we read every submission.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error ? (
            <Alert variant="destructive">
              <CircleAlert className="size-4" aria-hidden="true" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={140}
              placeholder="A short summary of what you need"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              name="description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="What would this help you do?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Your email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Submitting…" : "Submit feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

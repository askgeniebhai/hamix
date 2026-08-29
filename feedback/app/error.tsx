"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center p-6"
    >
      <div className="flex w-full max-w-md flex-col gap-4">
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            An unexpected error occurred while loading this page.
          </AlertDescription>
        </Alert>
        <Button onClick={reset} className="self-start">
          Try again
        </Button>
      </div>
    </main>
  );
}

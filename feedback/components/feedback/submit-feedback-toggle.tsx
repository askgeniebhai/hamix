"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { SubmitFeedbackForm } from "@/components/feedback/submit-feedback-form";
import { Button } from "@/components/ui/button";

/**
 * The request list is the first thing a visitor sees — showing real
 * demand before asking them to add their own is stronger social proof
 * than an always-open form pushing every existing request below the
 * fold (`docs/UI_UX_COMMERCIAL_BENCHMARK.md`'s public-board row).
 * Once opened, the form stays open — this is a "reduce first-load
 * clutter" toggle, not a modal to fight with.
 */
export function SubmitFeedbackToggle({ boardSlug }: { boardSlug: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="w-fit">
        <Plus className="size-4" aria-hidden="true" />
        Share feedback
      </Button>
    );
  }

  return <SubmitFeedbackForm boardSlug={boardSlug} />;
}

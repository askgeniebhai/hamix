import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { POST_STATUS_LABELS, type PostStatus } from "@/lib/feedback/status";

/**
 * A small, calm dot-indicator + label — not a saturated colored pill
 * — so five statuses read as one coherent system rather than a
 * traffic-light dashboard. The dot color is the only place a fixed
 * (non-token) hue is used, and only because it's decorative, not
 * text-on-background, so it doesn't need a dark-mode override.
 */
const STATUS_DOT_CLASS: Record<PostStatus, string> = {
  open: "bg-muted-foreground/50",
  under_review: "bg-amber-500",
  planned: "bg-sky-500",
  in_progress: "bg-primary",
  complete: "bg-emerald-500",
};

export function StatusBadge({
  status,
  className,
}: {
  status: PostStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 text-foreground", className)}>
      <span
        className={cn("size-1.5 rounded-full", STATUS_DOT_CLASS[status])}
        aria-hidden="true"
      />
      {POST_STATUS_LABELS[status]}
    </Badge>
  );
}

import { z } from "zod";

/**
 * The single source of truth for a Post's lifecycle stage — order and
 * values must stay in sync with `lib/db/feedback-schema.ts`'s
 * `postStatus` Postgres enum (Drizzle declares the two separately;
 * there's no way to derive one from the other across the client/
 * server boundary this module is imported across). Order matters: a
 * future Roadmap milestone can group posts by this same list directly
 * (`DECISIONS.md` D6-001).
 */
export const POST_STATUSES = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "complete",
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const postStatusSchema = z.enum(POST_STATUSES);

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  complete: "Complete",
};

/**
 * The subset of statuses the public Roadmap (`/b/[slug]/roadmap`)
 * shows — `open` and `under_review` are internal triage states with
 * nothing yet worth telling a customer, so they're excluded here
 * rather than filtered out ad hoc wherever the roadmap is read or
 * rendered (`DECISIONS.md` D7-001).
 */
export const ROADMAP_STATUSES = ["planned", "in_progress", "complete"] as const satisfies readonly PostStatus[];

export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

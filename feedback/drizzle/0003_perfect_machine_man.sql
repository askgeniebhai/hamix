CREATE TYPE "public"."post_status" AS ENUM('open', 'under_review', 'planned', 'in_progress', 'complete');--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "status" "post_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "status_changed_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "post_status_idx" ON "post" USING btree ("status");
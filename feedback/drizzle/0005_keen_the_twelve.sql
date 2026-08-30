CREATE TYPE "public"."changelog_entry_state" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."changelog_notification_state" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "changelog_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"state" "changelog_entry_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "changelog_entry_post" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"changelog_entry_id" text NOT NULL,
	"post_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"changelog_entry_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"email" text NOT NULL,
	"state" "changelog_notification_state" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "post_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"post_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "changelog_entry" ADD CONSTRAINT "changelog_entry_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry" ADD CONSTRAINT "changelog_entry_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry_post" ADD CONSTRAINT "changelog_entry_post_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry_post" ADD CONSTRAINT "changelog_entry_post_changelog_entry_id_changelog_entry_id_fk" FOREIGN KEY ("changelog_entry_id") REFERENCES "public"."changelog_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry_post" ADD CONSTRAINT "changelog_entry_post_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_notification" ADD CONSTRAINT "changelog_notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_notification" ADD CONSTRAINT "changelog_notification_changelog_entry_id_changelog_entry_id_fk" FOREIGN KEY ("changelog_entry_id") REFERENCES "public"."changelog_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_notification" ADD CONSTRAINT "changelog_notification_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_subscription" ADD CONSTRAINT "post_subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_subscription" ADD CONSTRAINT "post_subscription_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_subscription" ADD CONSTRAINT "post_subscription_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changelog_entry_organization_id_idx" ON "changelog_entry" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_org_state_published_idx" ON "changelog_entry" USING btree ("organization_id","state","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_entry_post_uidx" ON "changelog_entry_post" USING btree ("changelog_entry_id","post_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_post_entry_id_idx" ON "changelog_entry_post" USING btree ("changelog_entry_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_post_post_id_idx" ON "changelog_entry_post" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_post_organization_id_idx" ON "changelog_entry_post" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_notification_entry_participant_uidx" ON "changelog_notification" USING btree ("changelog_entry_id","participant_id");--> statement-breakpoint
CREATE INDEX "changelog_notification_organization_id_idx" ON "changelog_notification" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "changelog_notification_entry_id_idx" ON "changelog_notification" USING btree ("changelog_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_subscription_post_participant_uidx" ON "post_subscription" USING btree ("post_id","participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_subscription_unsubscribe_token_uidx" ON "post_subscription" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "post_subscription_organization_id_idx" ON "post_subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "post_subscription_participant_id_idx" ON "post_subscription" USING btree ("participant_id");
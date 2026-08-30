CREATE TYPE "public"."billing_plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."billing_subscription_status" AS ENUM('none', 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');--> statement-breakpoint
CREATE TABLE "billing_webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_billing" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"provider" text,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"plan" "billing_plan" DEFAULT 'free' NOT NULL,
	"status" "billing_subscription_status" DEFAULT 'none' NOT NULL,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_billing" ADD CONSTRAINT "organization_billing_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_event_provider_event_uidx" ON "billing_webhook_event" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_billing_provider_customer_id_uidx" ON "organization_billing" USING btree ("provider_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_billing_provider_subscription_id_uidx" ON "organization_billing" USING btree ("provider_subscription_id");
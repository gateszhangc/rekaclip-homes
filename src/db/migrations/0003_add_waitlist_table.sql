-- Add waitlist table for subscription capacity overflow.
CREATE SCHEMA IF NOT EXISTS "easyclaw";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "easyclaw"."waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "notified_at" timestamp with time zone,
  "status" varchar(50) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_unique_idx"
  ON "easyclaw"."waitlist" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_status_idx"
  ON "easyclaw"."waitlist" USING btree ("status");

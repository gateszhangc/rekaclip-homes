CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'provisioning' NOT NULL,
	"telegram_token_encrypted" text NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "deployments_user_id_idx" ON "deployments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "deployments_status_idx" ON "deployments" USING btree ("status");

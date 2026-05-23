-- Add account pool and unbind logs tables

-- Account pool table for OpenAI account management
CREATE TABLE IF NOT EXISTS "account_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"is_bound" boolean DEFAULT false NOT NULL,
	"bound_user_id" varchar(255),
	"bound_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "account_pool_account_id_unique" UNIQUE("account_id")
);

-- Indexes for account pool
CREATE INDEX IF NOT EXISTS "idx_account_pool_status" ON "account_pool" ("is_bound", "is_active");
CREATE INDEX IF NOT EXISTS "idx_account_pool_bound_user" ON "account_pool" ("bound_user_id") WHERE "is_bound" = true;

-- Account unbind logs for audit
CREATE TABLE IF NOT EXISTS "account_unbind_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"previous_user_id" varchar(255) NOT NULL,
	"reason" text,
	"stopped_deployments" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);

-- Indexes for unbind logs
CREATE INDEX IF NOT EXISTS "idx_unbind_logs_account" ON "account_unbind_logs" ("account_id");
CREATE INDEX IF NOT EXISTS "idx_unbind_logs_created" ON "account_unbind_logs" ("created_at");

-- Add account_id to deployments table
ALTER TABLE "deployments" ADD COLUMN IF NOT EXISTS "account_id" uuid;
ALTER TABLE "deployments" ADD COLUMN IF NOT EXISTS "stopped_at" timestamp with time zone;
ALTER TABLE "deployments" ADD COLUMN IF NOT EXISTS "stop_reason" varchar(50);

-- Add foreign key constraint (optional, can be added later)
-- ALTER TABLE "deployments" ADD CONSTRAINT "deployments_account_id_fkey" 
--   FOREIGN KEY ("account_id") REFERENCES "account_pool"("id");

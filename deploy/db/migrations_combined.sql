-- Reka Clip local database export
-- Generated: 2026-05-23T14:21:57.707Z
-- Source: postgresql://postgres@localhost:5432/rekaclip
-- Database: rekaclip (schema: easyclaw)
--
-- Restore example:
--   createdb rekaclip
--   psql "$DATABASE_URL" -f deploy/db/00_schema.sql
--   psql "$DATABASE_URL" -f deploy/db/01_data.sql
--

-- Drizzle migration files (reference)


-- ========== 0000_wealthy_squirrel_girl.sql ==========
CREATE TABLE "affiliates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"status" varchar(50) DEFAULT '' NOT NULL,
	"invited_by" varchar(255) NOT NULL,
	"paid_order_no" varchar(255) DEFAULT '' NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"reward_percent" integer DEFAULT 0 NOT NULL,
	"reward_amount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikeys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "apikeys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"api_key" varchar(255) NOT NULL,
	"title" varchar(100),
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"status" varchar(50),
	CONSTRAINT "apikeys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trans_no" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"user_uuid" varchar(255) NOT NULL,
	"trans_type" varchar(50) NOT NULL,
	"credits" integer NOT NULL,
	"order_no" varchar(255),
	"expired_at" timestamp with time zone,
	CONSTRAINT "credits_trans_no_unique" UNIQUE("trans_no")
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "feedbacks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone,
	"status" varchar(50),
	"user_uuid" varchar(255),
	"content" text,
	"rating" integer
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_no" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"user_uuid" varchar(255) DEFAULT '' NOT NULL,
	"user_email" varchar(255) DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"interval" varchar(50),
	"expired_at" timestamp with time zone,
	"status" varchar(50) NOT NULL,
	"stripe_session_id" varchar(255),
	"credits" integer NOT NULL,
	"currency" varchar(50),
	"sub_id" varchar(255),
	"sub_interval_count" integer,
	"sub_cycle_anchor" integer,
	"sub_period_end" integer,
	"sub_period_start" integer,
	"sub_times" integer,
	"product_id" varchar(255),
	"product_name" varchar(255),
	"valid_months" integer,
	"order_detail" text,
	"paid_at" timestamp with time zone,
	"paid_email" varchar(255),
	"paid_detail" text,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"slug" varchar(255),
	"title" varchar(255),
	"description" text,
	"content" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"status" varchar(50),
	"cover_url" varchar(255),
	"author_name" varchar(255),
	"author_avatar_url" varchar(255),
	"locale" varchar(50),
	CONSTRAINT "posts_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"nickname" varchar(255),
	"avatar_url" varchar(255),
	"locale" varchar(50),
	"signin_type" varchar(50),
	"signin_ip" varchar(255),
	"signin_provider" varchar(50),
	"signin_openid" varchar(255),
	"invite_code" varchar(255) DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone,
	"invited_by" varchar(255) DEFAULT '' NOT NULL,
	"is_affiliate" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_provider_unique_idx" ON "users" USING btree ("email","signin_provider");

-- ========== 0001_add_deployments_table.sql ==========
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


-- ========== 0002_add_account_pool.sql ==========
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


-- ========== 0003_add_waitlist_table.sql ==========
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


-- ========== 0004_add_manual_payment_requests.sql ==========
-- Add manual payment requests table for Alipay/WeChat QR code payments.
CREATE SCHEMA IF NOT EXISTS "easyclaw";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "easyclaw"."manual_payment_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_no" varchar(255) NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_uuid" varchar(255) NOT NULL,
  "user_email" varchar(255) NOT NULL,
  "amount" integer NOT NULL,
  "product_id" varchar(255) NOT NULL,
  "product_name" varchar(255),
  "credits" integer DEFAULT 0 NOT NULL,
  "valid_months" integer,
  "interval" varchar(50),
  "status" varchar(50) DEFAULT 'pending' NOT NULL,
  "payment_method" varchar(50),
  "transaction_id" varchar(255),
  "paid_at" timestamp with time zone,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" varchar(255),
  "notes" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_payment_user_uuid_idx"
  ON "easyclaw"."manual_payment_requests" USING btree ("user_uuid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_payment_status_idx"
  ON "easyclaw"."manual_payment_requests" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manual_payment_product_idx"
  ON "easyclaw"."manual_payment_requests" USING btree ("product_id", "user_uuid")
  WHERE "status" = 'pending';


-- ========== 0005_add_deployment_channels.sql ==========
CREATE SCHEMA IF NOT EXISTS "easyclaw";
--> statement-breakpoint
ALTER TABLE IF EXISTS "easyclaw"."deployments"
  ADD COLUMN IF NOT EXISTS "channel_type" varchar(50) DEFAULT 'telegram';
--> statement-breakpoint
ALTER TABLE IF EXISTS "easyclaw"."deployments"
  ADD COLUMN IF NOT EXISTS "channel_token_encrypted" text;
--> statement-breakpoint
UPDATE "easyclaw"."deployments"
SET "channel_type" = coalesce(nullif("channel_type", ''), 'telegram')
WHERE "channel_type" IS NULL OR "channel_type" = '';
--> statement-breakpoint
UPDATE "easyclaw"."deployments"
SET "channel_token_encrypted" = coalesce("channel_token_encrypted", "telegram_token_encrypted")
WHERE "channel_token_encrypted" IS NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "easyclaw"."deployments"
  ALTER COLUMN "channel_type" SET DEFAULT 'telegram';
--> statement-breakpoint
ALTER TABLE IF EXISTS "easyclaw"."deployments"
  ALTER COLUMN "channel_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "easyclaw"."deployments"
  ALTER COLUMN "channel_token_encrypted" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deployments_channel_type_idx"
  ON "easyclaw"."deployments" USING btree ("channel_type");


-- ========== 0006_add_active_deployment_seat_index.sql ==========
CREATE SCHEMA IF NOT EXISTS "easyclaw";
--> statement-breakpoint
DROP INDEX IF EXISTS "easyclaw"."uniq_public_deployments_subscription_order_consumed_success";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_public_deployments_subscription_order_active_seat"
  ON "easyclaw"."deployments" USING btree ("subscription_order_no")
  WHERE "subscription_order_no" IS NOT NULL
    AND "status" IN ('provisioning', 'running');


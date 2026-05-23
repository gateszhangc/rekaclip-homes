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

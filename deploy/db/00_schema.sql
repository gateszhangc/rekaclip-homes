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


-- Schemas
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE SCHEMA IF NOT EXISTS "easyclaw";
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
"id" integer DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass) NOT NULL,
"hash" text NOT NULL,
"created_at" bigint
);

CREATE TABLE IF NOT EXISTS "easyclaw"."affiliates" (
"id" integer NOT NULL,
"user_uuid" varchar NOT NULL,
"created_at" timestamp with time zone,
"status" varchar DEFAULT ''::character varying NOT NULL,
"invited_by" varchar NOT NULL,
"paid_order_no" varchar DEFAULT ''::character varying NOT NULL,
"paid_amount" integer DEFAULT 0 NOT NULL,
"reward_percent" integer DEFAULT 0 NOT NULL,
"reward_amount" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "easyclaw"."apikeys" (
"id" integer NOT NULL,
"api_key" varchar NOT NULL,
"title" varchar,
"user_uuid" varchar NOT NULL,
"created_at" timestamp with time zone,
"status" varchar
);

CREATE TABLE IF NOT EXISTS "easyclaw"."credits" (
"id" integer NOT NULL,
"trans_no" varchar NOT NULL,
"created_at" timestamp with time zone,
"user_uuid" varchar NOT NULL,
"trans_type" varchar NOT NULL,
"credits" integer NOT NULL,
"order_no" varchar,
"expired_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "easyclaw"."deployments" (
"id" uuid NOT NULL,
"user_id" text NOT NULL,
"account_id" uuid,
"status" text NOT NULL,
"channel_type" text DEFAULT 'telegram'::text NOT NULL,
"channel_token_encrypted" text NOT NULL,
"telegram_token_encrypted" text NOT NULL,
"target_host" text,
"error_message" text,
"requested_model" text,
"resolved_model" text,
"subscription_order_no" text,
"consumed_success" boolean DEFAULT false,
"consumed_at" timestamp with time zone,
"created_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "easyclaw"."feedbacks" (
"id" integer NOT NULL,
"created_at" timestamp with time zone,
"status" varchar,
"user_uuid" varchar,
"content" text,
"rating" integer
);

CREATE TABLE IF NOT EXISTS "easyclaw"."manual_payment_requests" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"order_no" varchar NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"user_uuid" varchar NOT NULL,
"user_email" varchar NOT NULL,
"amount" integer NOT NULL,
"product_id" varchar NOT NULL,
"product_name" varchar,
"credits" integer DEFAULT 0 NOT NULL,
"valid_months" integer,
"interval" varchar,
"status" varchar DEFAULT 'pending'::character varying NOT NULL,
"payment_method" varchar,
"transaction_id" varchar,
"paid_at" timestamp with time zone,
"reviewed_at" timestamp with time zone,
"reviewed_by" varchar,
"notes" text
);

CREATE TABLE IF NOT EXISTS "easyclaw"."orders" (
"id" integer NOT NULL,
"order_no" varchar NOT NULL,
"created_at" timestamp with time zone,
"user_uuid" varchar DEFAULT ''::character varying NOT NULL,
"user_email" varchar DEFAULT ''::character varying NOT NULL,
"amount" integer NOT NULL,
"interval" varchar,
"expired_at" timestamp with time zone,
"status" varchar NOT NULL,
"stripe_session_id" varchar,
"credits" integer NOT NULL,
"currency" varchar,
"sub_id" varchar,
"sub_interval_count" integer,
"sub_cycle_anchor" integer,
"sub_period_end" integer,
"sub_period_start" integer,
"sub_times" integer,
"product_id" varchar,
"product_name" varchar,
"valid_months" integer,
"order_detail" text,
"paid_at" timestamp with time zone,
"paid_email" varchar,
"paid_detail" text
);

CREATE TABLE IF NOT EXISTS "easyclaw"."posts" (
"id" integer NOT NULL,
"uuid" varchar NOT NULL,
"slug" varchar,
"title" varchar,
"description" text,
"content" text,
"created_at" timestamp with time zone,
"updated_at" timestamp with time zone,
"status" varchar,
"cover_url" varchar,
"author_name" varchar,
"author_avatar_url" varchar,
"locale" varchar
);

CREATE TABLE IF NOT EXISTS "easyclaw"."users" (
"id" integer NOT NULL,
"uuid" varchar NOT NULL,
"email" varchar NOT NULL,
"created_at" timestamp with time zone,
"nickname" varchar,
"avatar_url" varchar,
"locale" varchar,
"signin_type" varchar,
"signin_ip" varchar,
"signin_provider" varchar,
"signin_openid" varchar,
"invite_code" varchar DEFAULT ''::character varying NOT NULL,
"updated_at" timestamp with time zone,
"invited_by" varchar DEFAULT ''::character varying NOT NULL,
"is_affiliate" boolean DEFAULT false NOT NULL
);

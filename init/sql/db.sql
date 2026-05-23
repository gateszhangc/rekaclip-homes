-- Schema initialization for easyclaw
-- Run against your DATABASE_URL to provision the required tables.

-- Create schema
CREATE SCHEMA IF NOT EXISTS easyclaw;

-- Grant privileges on the schema
GRANT ALL ON SCHEMA easyclaw TO postgres, anon, authenticated, service_role;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA easyclaw GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA easyclaw GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA easyclaw GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- Affiliates table
CREATE TABLE IF NOT EXISTS easyclaw.affiliates (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_uuid character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  status character varying NOT NULL DEFAULT ''::character varying,
  invited_by character varying NOT NULL,
  paid_order_no character varying NOT NULL DEFAULT ''::character varying,
  paid_amount integer NOT NULL DEFAULT 0,
  reward_percent integer NOT NULL DEFAULT 0,
  reward_amount integer NOT NULL DEFAULT 0
);

-- API keys
CREATE TABLE IF NOT EXISTS easyclaw.apikeys (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key character varying NOT NULL UNIQUE,
  title character varying,
  user_uuid character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'active'
);

-- Credits
CREATE TABLE IF NOT EXISTS easyclaw.credits (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trans_no character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  user_uuid character varying NOT NULL,
  trans_type character varying NOT NULL,
  credits integer NOT NULL,
  order_no character varying,
  expired_at timestamp with time zone
);

-- Feedbacks
CREATE TABLE IF NOT EXISTS easyclaw.feedbacks (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  status character varying,
  user_uuid character varying,
  content text,
  rating integer
);

-- Orders
CREATE TABLE IF NOT EXISTS easyclaw.orders (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_no character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  user_uuid character varying NOT NULL DEFAULT ''::character varying,
  user_email character varying NOT NULL DEFAULT ''::character varying,
  amount integer NOT NULL,
  interval character varying,
  expired_at timestamp with time zone,
  status character varying NOT NULL,
  stripe_session_id character varying,
  credits integer NOT NULL,
  currency character varying,
  sub_id character varying,
  sub_interval_count integer,
  sub_cycle_anchor integer,
  sub_period_end integer,
  sub_period_start integer,
  sub_times integer,
  product_id character varying,
  product_name character varying,
  valid_months integer,
  order_detail text,
  paid_at timestamp with time zone,
  paid_email character varying,
  paid_detail text
);

-- Outfits
CREATE TABLE IF NOT EXISTS easyclaw.outfits (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid character varying NOT NULL UNIQUE,
  user_uuid character varying,
  created_at timestamp with time zone DEFAULT now(),
  base_image_url character varying,
  img_description text,
  img_url character varying,
  status character varying
);

-- Wallpapers
CREATE TABLE IF NOT EXISTS easyclaw.wallpapers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid character varying NOT NULL UNIQUE,
  user_uuid character varying,
  created_at timestamp with time zone DEFAULT now(),
  img_description text,
  img_url character varying,
  status character varying
);

-- Posts
CREATE TABLE IF NOT EXISTS easyclaw.posts (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid character varying NOT NULL UNIQUE,
  slug character varying,
  title character varying,
  description text,
  content text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status character varying,
  cover_url character varying,
  author_name character varying,
  author_avatar_url character varying,
  locale character varying
);

-- Users
CREATE TABLE IF NOT EXISTS easyclaw.users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid character varying NOT NULL UNIQUE,
  email character varying NOT NULL,
  created_at timestamp with time zone,
  nickname character varying,
  avatar_url character varying,
  locale character varying,
  signin_type character varying,
  signin_ip character varying,
  signin_provider character varying,
  signin_openid character varying,
  invite_code character varying NOT NULL DEFAULT ''::character varying,
  updated_at timestamp with time zone,
  invited_by character varying NOT NULL DEFAULT ''::character varying,
  is_affiliate boolean NOT NULL DEFAULT false
);

-- Unique index for (email, provider)
CREATE UNIQUE INDEX IF NOT EXISTS email_provider_unique_idx
  ON easyclaw.users (email, signin_provider);

-- Deployments table (for OpenClaw deployment feature)
CREATE TABLE IF NOT EXISTS easyclaw.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'provisioning'::character varying CHECK (status IN ('provisioning', 'running', 'failed')),
  telegram_token_encrypted text NOT NULL,
  target_host text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Account pool table for OpenAI account management
CREATE TABLE IF NOT EXISTS easyclaw.account_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  account_id varchar(255) NOT NULL UNIQUE,
  email varchar(255),
  is_bound boolean DEFAULT false NOT NULL,
  bound_user_id varchar(255),
  bound_at timestamp with time zone,
  is_active boolean DEFAULT true NOT NULL,
  failure_count integer DEFAULT 0 NOT NULL,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for account pool
CREATE INDEX IF NOT EXISTS idx_account_pool_status ON easyclaw.account_pool (is_bound, is_active);
CREATE INDEX IF NOT EXISTS idx_account_pool_bound_user ON easyclaw.account_pool (bound_user_id) WHERE is_bound = true;

-- Account unbind logs for audit
CREATE TABLE IF NOT EXISTS easyclaw.account_unbind_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  previous_user_id varchar(255) NOT NULL,
  reason text,
  stopped_deployments integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for unbind logs
CREATE INDEX IF NOT EXISTS idx_unbind_logs_account ON easyclaw.account_unbind_logs (account_id);
CREATE INDEX IF NOT EXISTS idx_unbind_logs_created ON easyclaw.account_unbind_logs (created_at);

-- Add account_id, stopped_at, stop_reason columns to deployments table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'easyclaw' AND table_name = 'deployments' AND column_name = 'account_id') THEN
    ALTER TABLE easyclaw.deployments ADD COLUMN account_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'easyclaw' AND table_name = 'deployments' AND column_name = 'stopped_at') THEN
    ALTER TABLE easyclaw.deployments ADD COLUMN stopped_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'easyclaw' AND table_name = 'deployments' AND column_name = 'stop_reason') THEN
    ALTER TABLE easyclaw.deployments ADD COLUMN stop_reason varchar(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'easyclaw' AND table_name = 'deployments' AND column_name = 'target_host') THEN
    ALTER TABLE easyclaw.deployments ADD COLUMN target_host text;
  END IF;
END $$;

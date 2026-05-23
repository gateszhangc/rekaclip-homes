-- MVP backend schema for users & deployments
-- Run with DATABASE_URL pointing to your Postgres instance.

-- users
create table if not exists public.users (
  id text primary key,
  email text unique,
  created_at timestamptz default now()
);

create schema if not exists easyclaw;

-- deployments
create table if not exists easyclaw.deployments (
  id uuid primary key,
  user_id text not null,
  account_id uuid,
  status text not null check (status in ('provisioning','running','failed','stopped')),
  channel_type text not null default 'telegram',
  channel_token_encrypted text not null,
  telegram_token_encrypted text not null,
  target_host text,
  error_message text,
  requested_model text,
  resolved_model text,
  subscription_order_no text,
  consumed_success boolean default false,
  consumed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table easyclaw.deployments add column if not exists requested_model text;
alter table easyclaw.deployments add column if not exists resolved_model text;
alter table easyclaw.deployments add column if not exists subscription_order_no text;
alter table easyclaw.deployments add column if not exists consumed_success boolean default false;
alter table easyclaw.deployments add column if not exists consumed_at timestamptz;
alter table easyclaw.deployments add column if not exists channel_type text;
alter table easyclaw.deployments add column if not exists channel_token_encrypted text;
alter table easyclaw.deployments add column if not exists target_host text;
alter table easyclaw.deployments add column if not exists account_id uuid;

update easyclaw.deployments
set channel_type = coalesce(nullif(channel_type, ''), 'telegram')
where channel_type is null or channel_type = '';

update easyclaw.deployments
set channel_token_encrypted = coalesce(channel_token_encrypted, telegram_token_encrypted)
where channel_token_encrypted is null;

alter table easyclaw.deployments alter column channel_type set default 'telegram';
alter table easyclaw.deployments alter column channel_type set not null;
alter table easyclaw.deployments alter column channel_token_encrypted set not null;

create index if not exists idx_deployments_user_id on easyclaw.deployments(user_id);
create index if not exists idx_deployments_status on easyclaw.deployments(status);
create index if not exists idx_deployments_channel_type on easyclaw.deployments(channel_type);
create index if not exists idx_deployments_subscription_order_no on easyclaw.deployments(subscription_order_no);
create index if not exists idx_deployments_account_id on easyclaw.deployments(account_id);

-- Remove legacy one-user-one-success index.
drop index if exists easyclaw.uniq_deployments_user_running_or_stopped;

drop index if exists easyclaw.uniq_public_deployments_subscription_order_consumed_success;

-- One subscription order can occupy only one active deployment seat at a time.
create unique index if not exists uniq_public_deployments_subscription_order_active_seat
  on easyclaw.deployments(subscription_order_no)
  where subscription_order_no is not null
    and status in ('provisioning', 'running');

-- One-time backfill:
-- Legacy successful states should stay consumed even if later state transitions happen.
update easyclaw.deployments
set consumed_success = true,
    consumed_at = coalesce(consumed_at, updated_at, created_at, now())
where status in ('running', 'stopped');

-- Align legacy deployments status checks with current runtime states.
do $$
declare
  status_check record;
begin
  for status_check in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'easyclaw'
      and t.relname = 'deployments'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table easyclaw.deployments drop constraint %I', status_check.conname);
  end loop;

  alter table easyclaw.deployments
    add constraint deployments_status_check
    check (status in ('provisioning', 'running', 'failed', 'stopped'));
end $$;

-- account_pool (API Key mode - no OAuth)
create table if not exists account_pool (
  id uuid primary key default gen_random_uuid(),
  account_id text unique not null,
  email text,
  -- API Key (encrypted)
  api_key_encrypted text not null,
  -- Provider: openai, openrouter, anthropic, google, etc.
  provider text not null default 'openai',
  -- Model name (e.g., gpt-4o, gpt-5.4, gpt-5.2, claude-3-opus, etc.)
  model text,
  -- Thing level / organization identifier
  thing_level text,
  -- Account tier: starter or pro
  tier text not null default 'starter',
  -- Binding status
  is_bound boolean default false,
  bound_user_id text,
  bound_at timestamptz,
  -- Status
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Compatibility migration for legacy OAuth schema.
-- `create table if not exists` does not modify existing tables, so we patch
-- missing columns in-place when upgrading old deployments.
alter table account_pool add column if not exists api_key_encrypted text;
alter table account_pool add column if not exists provider text;
alter table account_pool add column if not exists model text;
alter table account_pool add column if not exists thing_level text;
alter table account_pool add column if not exists tier text default 'starter';
alter table account_pool add column if not exists is_bound boolean default false;
alter table account_pool add column if not exists bound_user_id text;
alter table account_pool add column if not exists bound_at timestamptz;
alter table account_pool add column if not exists is_active boolean default true;
alter table account_pool add column if not exists last_used_at timestamptz;
alter table account_pool add column if not exists created_at timestamptz default now();
alter table account_pool add column if not exists updated_at timestamptz default now();

-- Legacy OAuth columns might still exist with NOT NULL constraints.
-- Drop those constraints so API-key-mode inserts don't fail on old schemas.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'account_pool'
      and column_name = 'access_token_encrypted'
  ) then
    execute 'alter table account_pool alter column access_token_encrypted drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'account_pool'
      and column_name = 'refresh_token_encrypted'
  ) then
    execute 'alter table account_pool alter column refresh_token_encrypted drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'account_pool'
      and column_name = 'expires_at'
  ) then
    execute 'alter table account_pool alter column expires_at drop not null';
  end if;
end $$;

do $$
begin
  -- Backfill API key from legacy OAuth access token column when present.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'account_pool'
      and column_name = 'access_token_encrypted'
  ) then
    execute '
      update account_pool
      set api_key_encrypted = coalesce(api_key_encrypted, access_token_encrypted)
      where api_key_encrypted is null
    ';
  end if;
end $$;

update account_pool
set provider = coalesce(nullif(provider, ''), 'openai');

update account_pool
set is_active = coalesce(is_active, true);

update account_pool
set is_bound = coalesce(is_bound, false);

update account_pool
set tier = coalesce(nullif(lower(tier), ''), 'starter');

-- GPT-5.4 routing must use OpenRouter provider + canonical model key.
update account_pool
set provider = 'openrouter',
    model = 'openrouter/openai/gpt-5.4',
    updated_at = now()
where coalesce(nullif(lower(model), ''), '') in (
  'gpt-5-4',
  'gpt-5.4',
  'openai/gpt-5-4',
  'openai/gpt-5.4',
  'openrouter/openai/gpt-5-4',
  'openrouter/openai/gpt-5.4'
);

-- GPT-5.2 routing must use OpenRouter provider + canonical model key.
update account_pool
set provider = 'openrouter',
    model = 'openrouter/openai/gpt-5.2',
    updated_at = now()
where coalesce(nullif(lower(model), ''), '') in (
  'gpt-5-2',
  'gpt-5.2',
  'openai/gpt-5-2',
  'openai/gpt-5.2',
  'openrouter/openai/gpt-5-2',
  'openrouter/openai/gpt-5.2'
);

alter table account_pool alter column provider set default 'openai';
alter table account_pool alter column tier set default 'starter';
alter table account_pool alter column tier set not null;
alter table account_pool alter column is_active set default true;
alter table account_pool alter column is_bound set default false;

create index if not exists idx_account_pool_bound_user_id on account_pool(bound_user_id);
create index if not exists idx_account_pool_is_bound on account_pool(is_bound);
create index if not exists idx_account_pool_is_active on account_pool(is_active);
create index if not exists idx_account_pool_tier on account_pool(tier);
create index if not exists idx_account_pool_available on account_pool(is_bound, is_active, tier);

-- account unbind logs
create table if not exists account_unbind_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account_pool(id),
  previous_user_id text not null,
  reason text,
  stopped_deployments integer default 0,
  created_at timestamptz default now()
);

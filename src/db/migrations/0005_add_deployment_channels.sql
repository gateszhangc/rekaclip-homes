CREATE SCHEMA IF NOT EXISTS "rekaclip";
--> statement-breakpoint
ALTER TABLE IF EXISTS "rekaclip"."deployments"
  ADD COLUMN IF NOT EXISTS "channel_type" varchar(50) DEFAULT 'telegram';
--> statement-breakpoint
ALTER TABLE IF EXISTS "rekaclip"."deployments"
  ADD COLUMN IF NOT EXISTS "channel_token_encrypted" text;
--> statement-breakpoint
UPDATE "rekaclip"."deployments"
SET "channel_type" = coalesce(nullif("channel_type", ''), 'telegram')
WHERE "channel_type" IS NULL OR "channel_type" = '';
--> statement-breakpoint
UPDATE "rekaclip"."deployments"
SET "channel_token_encrypted" = coalesce("channel_token_encrypted", "telegram_token_encrypted")
WHERE "channel_token_encrypted" IS NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "rekaclip"."deployments"
  ALTER COLUMN "channel_type" SET DEFAULT 'telegram';
--> statement-breakpoint
ALTER TABLE IF EXISTS "rekaclip"."deployments"
  ALTER COLUMN "channel_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "rekaclip"."deployments"
  ALTER COLUMN "channel_token_encrypted" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deployments_channel_type_idx"
  ON "rekaclip"."deployments" USING btree ("channel_type");

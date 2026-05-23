CREATE SCHEMA IF NOT EXISTS "easyclaw";
--> statement-breakpoint
DROP INDEX IF EXISTS "easyclaw"."uniq_public_deployments_subscription_order_consumed_success";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_public_deployments_subscription_order_active_seat"
  ON "easyclaw"."deployments" USING btree ("subscription_order_no")
  WHERE "subscription_order_no" IS NOT NULL
    AND "status" IN ('provisioning', 'running');

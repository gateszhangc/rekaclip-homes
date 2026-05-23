import fs from "fs";
import postgres from "postgres";

const env = fs.readFileSync(".env.development", "utf8");
const match = env.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");

const sql = postgres(match[1], { prepare: false, connect_timeout: 20, max: 1 });

const route = "openrouter/anthropic/claude-opus-4";
const releaseStart = "2026-05-01T17:40:00Z";
const releaseEnd = "2026-05-01T17:50:00Z";

try {
  const routeSummary = await sql.unsafe(
    `
      select provider, model, tier, is_active, is_bound, count(*)::int as count
      from public.account_pool
      where provider = 'openrouter'
        and model = $1
      group by provider, model, tier, is_active, is_bound
      order by tier, is_active desc, is_bound desc
    `,
    [route]
  );

  const routeUpdatedBuckets = await sql.unsafe(
    `
      select date_trunc('minute', updated_at) as updated_minute,
             tier,
             is_active,
             is_bound,
             count(*)::int as count
      from public.account_pool
      where provider = 'openrouter'
        and model = $1
        and updated_at >= $2::timestamptz
        and updated_at < $3::timestamptz
      group by 1, tier, is_active, is_bound
      order by 1, tier, is_active desc, is_bound desc
    `,
    [route, releaseStart, releaseEnd]
  );

  const releasedOpenrouter = await sql.unsafe(
    `
      select model, tier, is_active, is_bound, count(*)::int as count
      from public.account_pool
      where provider = 'openrouter'
        and is_bound = false
        and bound_user_id is null
        and bound_at is null
        and updated_at >= $1::timestamptz
        and updated_at < $2::timestamptz
      group by model, tier, is_active, is_bound
      order by model, tier, is_active desc
    `,
    [releaseStart, releaseEnd]
  );

  const recentDeployments = await sql.unsafe(
    `
      select resolved_model, status, count(*)::int as count
      from easyclaw.deployments
      where created_at >= now() - interval '7 days'
        and resolved_model = $1
      group by resolved_model, status
      order by status
    `,
    [route]
  );

  console.log(JSON.stringify({
    route,
    releaseWindowUtc: { start: releaseStart, end: releaseEnd },
    routeSummary,
    routeUpdatedBuckets,
    releasedOpenrouter,
    recentDeployments,
  }, null, 2));
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

import fs from "fs";
import postgres from "postgres";

const env = fs.readFileSync(".env.development", "utf8");
const match = env.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");

const sql = postgres(match[1], { prepare: false, connect_timeout: 20, max: 1 });

try {
  const poolSummary = await sql.unsafe(`
    select provider, model, tier, is_active, is_bound, count(*)::int as count,
           min(updated_at) as min_updated_at,
           max(updated_at) as max_updated_at
    from public.account_pool
    where provider = 'openrouter'
    group by provider, model, tier, is_active, is_bound
    order by model nulls first, tier, is_active desc, is_bound desc
  `);

  const recentOpenrouterDeployments = await sql.unsafe(`
    select requested_model, resolved_model, status, count(*)::int as count,
           min(created_at) as first_created_at,
           max(created_at) as last_created_at
    from easyclaw.deployments
    where created_at >= now() - interval '14 days'
      and resolved_model ilike 'openrouter/%'
    group by requested_model, resolved_model, status
    order by resolved_model, status
  `);

  const availableByUpdatedMinute = await sql.unsafe(`
    select date_trunc('minute', updated_at) as updated_minute,
           tier,
           count(*)::int as count
    from public.account_pool
    where provider = 'openrouter'
      and is_active = true
      and is_bound = false
    group by 1, tier
    order by 1 desc, tier
    limit 40
  `);

  console.log(JSON.stringify({
    poolSummary,
    recentOpenrouterDeployments,
    availableByUpdatedMinute,
  }, null, 2));
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

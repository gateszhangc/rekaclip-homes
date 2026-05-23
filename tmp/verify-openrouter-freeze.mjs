import fs from "fs";
import postgres from "postgres";

const env = fs.readFileSync(".env.development", "utf8");
const match = env.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");

const sql = postgres(match[1], { prepare: false, connect_timeout: 20, max: 1 });

const releaseStart = "2026-05-01T17:40:00Z";
const releaseEnd = "2026-05-01T17:50:00Z";

try {
  const availableOpenrouter = await sql.unsafe(`
    select tier, count(*)::int as count
    from public.account_pool
    where provider = 'openrouter'
      and is_active = true
      and coalesce(is_bound, false) = false
    group by tier
    order by tier
  `);

  const releaseBatchStatus = await sql.unsafe(
    `
      select tier, is_active, is_bound, count(*)::int as count
      from public.account_pool
      where provider = 'openrouter'
        and bound_user_id is null
        and bound_at is null
        and updated_at >= $1::timestamptz
      group by tier, is_active, is_bound
      order by tier, is_active desc, is_bound desc
    `,
    [releaseStart]
  );

  const currentSummary = await sql.unsafe(`
    select tier, is_active, is_bound, count(*)::int as count
    from public.account_pool
    where provider = 'openrouter'
    group by tier, is_active, is_bound
    order by tier, is_active desc, is_bound desc
  `);

  console.log(JSON.stringify({
    availableOpenrouter,
    releaseWindowUtc: { start: releaseStart, originalEnd: releaseEnd },
    releaseBatchStatus,
    currentSummary,
  }, null, 2));
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

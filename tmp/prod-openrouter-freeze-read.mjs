import fs from "fs";
import postgres from "postgres";

const env = fs.readFileSync(".env.development", "utf8");
const match = env.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) {
  throw new Error("DATABASE_URL not found");
}

const sql = postgres(match[1], { prepare: false, connect_timeout: 20, max: 1 });

try {
  const db = await sql`
    select current_database() as database, current_schema() as schema, now() as now_utc
  `;

  const columns = await sql`
    select table_schema, table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_name in ('account_pool', 'deployments', 'account_unbind_logs')
      and table_schema in ('easyclaw', 'public')
    order by table_schema, table_name, ordinal_position
  `;

  const accountPoolSchema = columns.find((column) => column.table_name === "account_pool")
    ?.table_schema;
  if (!accountPoolSchema) {
    throw new Error("account_pool table not found in easyclaw or public schema");
  }
  const accountPoolTable = `${accountPoolSchema}.account_pool`;

  const targetModels = [
    "openrouter/anthropic/claude-opus-4",
    "openrouter/anthropic/claude-opus-4-6",
    "openrouter/anthropic/claude-opus-4.6",
    "claude-opus-4-6",
    "claude-opus-4.6",
  ];

  const routeStats = await sql.unsafe(
    `
    select coalesce(nullif(lower(provider), ''), '') as provider,
           coalesce(nullif(lower(model), ''), '') as model,
           coalesce(nullif(lower(tier), ''), 'starter') as tier,
           is_active,
           is_bound,
           count(*)::int as count,
           min(created_at) as min_created_at,
           max(updated_at) as max_updated_at
    from ${accountPoolTable}
    where coalesce(nullif(lower(provider), ''), '') = 'openrouter'
      and coalesce(nullif(lower(model), ''), '') = any($1)
    group by 1,2,3,4,5
    order by model, tier, is_active desc, is_bound
    `,
    [targetModels]
  );

  const releaseWindow = await sql.unsafe(
    `
    select coalesce(nullif(lower(provider), ''), '') as provider,
           coalesce(nullif(lower(model), ''), '') as model,
           coalesce(nullif(lower(tier), ''), 'starter') as tier,
           is_active,
           is_bound,
           count(*)::int as count,
           min(updated_at) as min_updated_at,
           max(updated_at) as max_updated_at
    from ${accountPoolTable}
    where coalesce(nullif(lower(provider), ''), '') = 'openrouter'
      and is_bound = false
      and updated_at >= $1::timestamptz
      and updated_at < $2::timestamptz
    group by 1,2,3,4,5
    order by tier, model, is_active desc
    `,
    ["2026-05-01T17:44:00Z", "2026-05-01T17:47:00Z"]
  );

  console.log(
    JSON.stringify(
      { db: db[0], accountPoolSchema, columns, routeStats, releaseWindow },
      null,
      2
    )
  );
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

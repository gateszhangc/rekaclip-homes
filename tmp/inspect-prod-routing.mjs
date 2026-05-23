import fs from "fs";
import postgres from "postgres";

const env = fs.readFileSync(".env.development", "utf8");
const match = env.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");

const sql = postgres(match[1], { prepare: false, connect_timeout: 20, max: 1 });

try {
  const tables = await sql.unsafe(`
    select table_schema, table_name
    from information_schema.tables
    where table_name in ('account_pool', 'deployments')
    order by table_schema, table_name
  `);

  const columns = await sql.unsafe(`
    select table_schema, table_name, column_name, data_type, column_default, is_nullable
    from information_schema.columns
    where table_name in ('account_pool', 'deployments')
    order by table_schema, table_name, ordinal_position
  `);

  const configTables = await sql.unsafe(`
    select table_schema, table_name
    from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema')
      and (
        table_name ilike '%config%'
        or table_name ilike '%model%'
        or table_name ilike '%provider%'
        or table_name ilike '%route%'
      )
    order by table_schema, table_name
  `);

  console.log(JSON.stringify({ tables, columns, configTables }, null, 2));
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

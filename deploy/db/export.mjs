#!/usr/bin/env node
/**
 * Export local PostgreSQL to deploy/db/
 * Usage: node deploy/db/export.mjs
 * Reads DATABASE_URL from .env.development
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
config({ path: path.join(root, ".env.development") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.development");
  process.exit(1);
}

const outDir = path.join(__dirname);
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@/]+@/, ":***@");
const header = (file) => `-- Reka Clip local database export
-- Generated: ${new Date().toISOString()}
-- Source: ${maskedUrl}
-- Database: rekaclip (schema: easyclaw)
--
-- Restore:
--   psql "$DATABASE_URL" -f deploy/db/00_schema.sql
--   psql "$DATABASE_URL" -f deploy/db/${file}
--

`;

const schemas = await sql`
  SELECT schema_name FROM information_schema.schemata
  WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')
  ORDER BY schema_name
`;

const schemaLines = [header("00_schema.sql"), "-- Schemas"];
for (const { schema_name } of schemas) {
  schemaLines.push(`CREATE SCHEMA IF NOT EXISTS "${schema_name}";`);
}
schemaLines.push("");

const tables = await sql`
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_schema NOT IN ('pg_catalog','information_schema','pg_toast')
    AND table_type = 'BASE TABLE'
  ORDER BY table_schema, table_name
`;

for (const { table_schema, table_name } of tables) {
  const full = `"${table_schema}"."${table_name}"`;
  const cols = await sql`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = ${table_schema} AND table_name = ${table_name}
    ORDER BY ordinal_position
  `;
  const colDefs = cols.map((c) => {
    let type = c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type;
    if (type === "character varying") type = "varchar";
    let def = `"${c.column_name}" ${type}`;
    if (c.column_default) def += ` DEFAULT ${c.column_default}`;
    if (c.is_nullable === "NO") def += " NOT NULL";
    return def;
  });
  schemaLines.push(`CREATE TABLE IF NOT EXISTS ${full} (`);
  schemaLines.push(colDefs.join(",\n"));
  schemaLines.push(");");
  schemaLines.push("");
}

fs.writeFileSync(path.join(outDir, "00_schema.sql"), schemaLines.join("\n"));

const dataLines = [header("01_data.sql"), "BEGIN;", ""];
for (const { table_schema, table_name } of tables) {
  const full = `"${table_schema}"."${table_name}"`;
  const countRows = await sql.unsafe(`SELECT COUNT(*)::int AS c FROM ${full}`);
  const count = countRows[0]?.c ?? 0;
  if (count === 0) continue;
  dataLines.push(`-- ${table_schema}.${table_name} (${count} rows)`);
  const rows = await sql.unsafe(`SELECT * FROM ${full}`);
  const keys = Object.keys(rows[0]);
  for (const row of rows) {
    const vals = keys.map((k) => {
      const v = row[k];
      if (v === null) return "NULL";
      if (typeof v === "number") return String(v);
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
      if (v instanceof Date) return `'${v.toISOString()}'`;
      if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    dataLines.push(
      `INSERT INTO ${full} (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${vals.join(", ")});`
    );
  }
  dataLines.push("");
}
dataLines.push("COMMIT;");
fs.writeFileSync(path.join(outDir, "01_data.sql"), dataLines.join("\n"));

const migDir = path.join(root, "src/db/migrations");
const migFiles = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
let migBundle = header("migrations_combined.sql") + "-- Drizzle migration files (reference)\n\n";
for (const f of migFiles) {
  migBundle += `\n-- ========== ${f} ==========\n`;
  migBundle += fs.readFileSync(path.join(migDir, f), "utf8");
  migBundle += "\n";
}
fs.writeFileSync(path.join(outDir, "migrations_combined.sql"), migBundle);

fs.writeFileSync(
  path.join(outDir, "export_manifest.json"),
  JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      database: "rekaclip",
      schema: "easyclaw",
      tables: tables.map((t) => `${t.table_schema}.${t.table_name}`),
      files: ["00_schema.sql", "01_data.sql", "migrations_combined.sql", "README.md"],
    },
    null,
    2
  )
);

console.log(`Exported ${tables.length} tables to deploy/db/`);
await sql.end();

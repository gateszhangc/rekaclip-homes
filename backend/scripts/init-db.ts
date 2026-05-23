import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import "../src/load-env.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlPath = path.resolve(__dirname, "../sql/init.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query(sql);
  console.log("✅ Database initialized");
} finally {
  await client.end();
}

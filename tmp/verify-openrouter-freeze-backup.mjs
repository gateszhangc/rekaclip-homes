import fs from "fs";
import postgres from "postgres";

const backupPath = process.env.BACKUP_PATH;
if (!backupPath) throw new Error("BACKUP_PATH is required");

const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));

const env = fs.readFileSync(".env.development", "utf8");
const match = env.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");

const sql = postgres(match[1], { prepare: false, connect_timeout: 20, max: 1 });

try {
  const candidateStatus = await sql.unsafe(
    `
      select tier, is_active, is_bound, count(*)::int as count
      from public.account_pool
      where id = any($1::uuid[])
      group by tier, is_active, is_bound
      order by tier, is_active desc, is_bound desc
    `,
    [backup.candidateIds]
  );

  const releaseBatchStatus = await sql.unsafe(
    `
      select tier, is_active, is_bound, count(*)::int as count
      from public.account_pool
      where id = any($1::uuid[])
      group by tier, is_active, is_bound
      order by tier, is_active desc, is_bound desc
    `,
    [backup.releaseBatchIds]
  );

  console.log(JSON.stringify({
    backupPath,
    backupCreatedAt: backup.createdAt,
    candidateCountInBackup: backup.candidateIds.length,
    releaseBatchCountInBackup: backup.releaseBatchIds.length,
    candidateStatus,
    releaseBatchStatus,
  }, null, 2));
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

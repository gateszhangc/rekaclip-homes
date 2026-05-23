import fs from "fs";
import postgres from "postgres";

const APPLY = process.env.APPLY_OPENROUTER_FREEZE === "1";
const releaseStart = "2026-05-01T17:40:00Z";
const releaseEnd = "2026-05-01T17:50:00Z";

const env = fs.readFileSync(".env.development", "utf8");
const match = env.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");

const sql = postgres(match[1], { prepare: false, connect_timeout: 20, max: 1 });

function group(rows, keys) {
  const map = new Map();
  for (const row of rows) {
    const key = keys.map((k) => String(row[k] ?? "null")).join(" | ");
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

try {
  await sql.begin(async (tx) => {
    const candidates = await tx.unsafe(`
      select id, provider, model, tier, is_active, is_bound, updated_at
      from public.account_pool
      where provider = 'openrouter'
        and is_active = true
        and coalesce(is_bound, false) = false
      order by tier, updated_at, id
    `);

    const releaseBatch = await tx.unsafe(
      `
        select id, provider, model, tier, is_active, is_bound, updated_at
        from public.account_pool
        where provider = 'openrouter'
          and is_active = true
          and coalesce(is_bound, false) = false
          and bound_user_id is null
          and bound_at is null
          and updated_at >= $1::timestamptz
          and updated_at < $2::timestamptz
        order by tier, updated_at, id
      `,
      [releaseStart, releaseEnd]
    );

    const backup = {
      createdAt: new Date().toISOString(),
      apply: APPLY,
      releaseWindowUtc: { start: releaseStart, end: releaseEnd },
      action: "set public.account_pool.is_active=false for active unbound openrouter accounts",
      candidateCount: candidates.length,
      releaseBatchCount: releaseBatch.length,
      candidateSummary: group(candidates, ["provider", "model", "tier", "is_active", "is_bound"]),
      releaseBatchSummary: group(releaseBatch, ["provider", "model", "tier", "is_active", "is_bound"]),
      candidateIds: candidates.map((row) => row.id),
      releaseBatchIds: releaseBatch.map((row) => row.id),
    };

    const backupPath = `tmp/openrouter-freeze-backup-${backup.createdAt.replace(/[:.]/g, "-")}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    let updated = [];
    if (APPLY && candidates.length > 0) {
      updated = await tx.unsafe(
        `
          update public.account_pool
          set is_active = false,
              updated_at = now()
          where id = any($1::uuid[])
            and provider = 'openrouter'
            and is_active = true
            and coalesce(is_bound, false) = false
          returning id, tier, is_active, is_bound
        `,
        [candidates.map((row) => row.id)]
      );
    }

    const after = await tx.unsafe(`
      select provider, model, tier, is_active, is_bound, count(*)::int as count
      from public.account_pool
      where provider = 'openrouter'
      group by provider, model, tier, is_active, is_bound
      order by model nulls first, tier, is_active desc, is_bound desc
    `);

    console.log(JSON.stringify({
      apply: APPLY,
      backupPath,
      candidateCount: candidates.length,
      releaseBatchCount: releaseBatch.length,
      updatedCount: updated.length,
      candidateSummary: backup.candidateSummary,
      releaseBatchSummary: backup.releaseBatchSummary,
      after,
    }, null, 2));
  });
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

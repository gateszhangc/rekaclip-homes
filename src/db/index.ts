import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Detect if running in Cloudflare Workers environment
const isCloudflareWorker =
  typeof globalThis !== "undefined" && "Cloudflare" in globalThis;

// Database instance for Node.js environment
let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * postgres.js only sets rejectUnauthorized=false in TLS for ssl strings
 * "require" | "allow" | "prefer". The URL param sslmode=no-verify becomes
 * ssl === "no-verify", which skips that branch and can mis-handle self-signed
 * certs. Passing an explicit ssl object fixes that.
 */
function postgresOptionsFromDatabaseUrl(databaseUrl: string) {
  const base = {
    prepare: false,
    idle_timeout: 30,
  } as const;

  let ssl: { rejectUnauthorized: boolean } | undefined;
  try {
    const normalized = databaseUrl.replace(/^postgresql:/i, "postgres:");
    const mode = new URL(normalized).searchParams.get("sslmode") || "";
    if (mode.toLowerCase() === "no-verify") {
      ssl = { rejectUnauthorized: false };
    }
  } catch {
    // ignore invalid URL
  }

  if (isCloudflareWorker) {
    return {
      ...base,
      max: 1,
      connect_timeout: 5,
      ...(ssl ? { ssl } : {}),
    };
  }

  return {
    ...base,
    max: 10,
    connect_timeout: 25,
    ...(ssl ? { ssl } : {}),
  };
}

export function db() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const pgOptions = postgresOptionsFromDatabaseUrl(databaseUrl);

  // In Cloudflare Workers, create new connection each time
  if (isCloudflareWorker) {
    const client = postgres(databaseUrl, pgOptions);
    return drizzle(client);
  }

  // In Node.js environment, use singleton pattern
  if (dbInstance) {
    return dbInstance;
  }

  const client = postgres(databaseUrl, pgOptions);
  dbInstance = drizzle({ client });

  return dbInstance;
}

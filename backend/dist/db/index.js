import { Pool } from "pg";
import { logger } from "../utils/logger.js";
const DB_POOL_KEEPALIVE_INITIAL_DELAY_MS = 10000;
const DB_POOL_CONNECTION_TIMEOUT_MS = 30000;
function pgSslFromDatabaseUrl() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        return undefined;
    }
    try {
        const normalized = connectionString.replace(/^postgresql:/i, "postgres:");
        const u = new URL(normalized);
        const mode = (u.searchParams.get("sslmode") || "").toLowerCase();
        if (mode === "disable" || mode === "false") {
            return false;
        }
        if (mode === "no-verify" || mode === "require") {
            return { rejectUnauthorized: false };
        }
    }
    catch {
        // ignore
    }
    return undefined;
}
const toErrorMessage = (error) => error instanceof Error ? error.message : String(error);
const toErrorStack = (error) => error instanceof Error ? error.stack : undefined;
export const buildPgPoolConfig = () => {
    const ssl = pgSslFromDatabaseUrl();
    return {
        connectionString: process.env.DATABASE_URL,
        keepAlive: true,
        keepAliveInitialDelayMillis: DB_POOL_KEEPALIVE_INITIAL_DELAY_MS,
        connectionTimeoutMillis: DB_POOL_CONNECTION_TIMEOUT_MS,
        ...(ssl !== undefined ? { ssl } : {}),
    };
};
export const createDbApi = (dbPool) => ({
    query: (text, params) => dbPool.query(text, params),
    withClient: async (fn) => {
        const client = (await dbPool.connect());
        try {
            await client.query("BEGIN");
            const result = await fn(client);
            await client.query("COMMIT");
            return result;
        }
        catch (error) {
            try {
                await client.query("ROLLBACK");
            }
            catch (rollbackError) {
                logger.warn({
                    error: toErrorMessage(rollbackError),
                    stack: toErrorStack(rollbackError),
                    originalError: toErrorMessage(error),
                }, "Postgres rollback failed after transaction error");
            }
            throw error;
        }
        finally {
            client.release();
        }
    },
});
const pool = new Pool(buildPgPoolConfig());
pool.on("error", (error) => {
    logger.error({
        error: toErrorMessage(error),
        stack: toErrorStack(error),
    }, "Postgres pool error");
});
const dbApi = createDbApi(pool);
export const query = dbApi.query;
export const withClient = dbApi.withClient;

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { query } from "../db/index.js";
const DEPLOYMENTS_SCHEMA = "easyclaw";
const DEPLOYMENTS_TABLE = "deployments";
const TARGET_HOST_COLUMN = "target_host";
const DEFAULT_STATE_FILE = path.resolve(process.cwd(), "state", "deployment-target-hosts.json");
let hasTargetHostColumnPromise = null;
let stateWriteLock = Promise.resolve();
const normalizeTargetHost = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
};
const sanitizeState = (value) => {
    if (!value || typeof value !== "object") {
        return {};
    }
    const entries = Object.entries(value)
        .map(([deploymentId, record]) => {
        if (!record || typeof record !== "object") {
            return null;
        }
        const targetHost = normalizeTargetHost(record.targetHost);
        if (!targetHost) {
            return null;
        }
        const updatedAt = typeof record.updatedAt === "string" &&
            record.updatedAt.trim()
            ? record.updatedAt.trim()
            : new Date(0).toISOString();
        return [deploymentId, { targetHost, updatedAt }];
    })
        .filter((entry) => entry !== null);
    return Object.fromEntries(entries);
};
const readStateFile = async (filePath = resolveDeploymentTargetHostStateFile()) => {
    try {
        const raw = await readFile(filePath, "utf8");
        return sanitizeState(JSON.parse(raw));
    }
    catch (error) {
        const nodeError = error;
        if (nodeError?.code === "ENOENT") {
            return {};
        }
        throw error;
    }
};
const withStateWriteLock = async (fn) => {
    const previous = stateWriteLock.catch(() => { });
    let release = () => { };
    stateWriteLock = new Promise((resolve) => {
        release = resolve;
    });
    await previous;
    try {
        return await fn();
    }
    finally {
        release();
    }
};
export const resolveDeploymentTargetHostStateFile = () => {
    const raw = process.env.OPENCLAW_TARGET_HOST_STATE_FILE?.trim();
    return raw && raw.length > 0 ? raw : DEFAULT_STATE_FILE;
};
export const hasDeploymentTargetHostColumn = async () => {
    if (!hasTargetHostColumnPromise) {
        hasTargetHostColumnPromise = query(`select exists (
         select 1
         from information_schema.columns
         where table_schema = $1
           and table_name = $2
           and column_name = $3
       ) as present`, [DEPLOYMENTS_SCHEMA, DEPLOYMENTS_TABLE, TARGET_HOST_COLUMN]).then((result) => result.rows[0]?.present === true);
    }
    return hasTargetHostColumnPromise;
};
export const readDeploymentTargetHostState = readStateFile;
export const getPersistedDeploymentTargetHost = async (deploymentId, filePath = resolveDeploymentTargetHostStateFile()) => {
    const state = await readStateFile(filePath);
    return normalizeTargetHost(state[deploymentId]?.targetHost);
};
export const persistDeploymentTargetHost = async (deploymentId, targetHost, filePath = resolveDeploymentTargetHostStateFile()) => {
    const normalizedTargetHost = normalizeTargetHost(targetHost);
    if (!normalizedTargetHost) {
        return;
    }
    await withStateWriteLock(async () => {
        const state = await readStateFile(filePath);
        state[deploymentId] = {
            targetHost: normalizedTargetHost,
            updatedAt: new Date().toISOString(),
        };
        const dir = path.dirname(filePath);
        await mkdir(dir, { recursive: true });
        const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(`${tempFilePath}`, `${JSON.stringify(state, null, 2)}\n`, "utf8");
        await rename(tempFilePath, filePath);
    });
};
export const resolvePersistedDeploymentTargetHost = async (deploymentId, databaseTargetHost) => {
    const normalizedDatabaseTargetHost = normalizeTargetHost(databaseTargetHost);
    if (normalizedDatabaseTargetHost) {
        return normalizedDatabaseTargetHost;
    }
    if (await hasDeploymentTargetHostColumn()) {
        return null;
    }
    return getPersistedDeploymentTargetHost(deploymentId);
};
export const resetDeploymentTargetHostStoreForTests = () => {
    hasTargetHostColumnPromise = null;
    stateWriteLock = Promise.resolve();
};
export const setDeploymentTargetHostColumnSupportForTests = (supported) => {
    hasTargetHostColumnPromise =
        supported === null ? null : Promise.resolve(supported);
};

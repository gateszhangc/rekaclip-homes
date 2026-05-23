import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveOpenClawK8sNamespace, } from "./runtime-provider.js";
const DEFAULT_STATE_FILE = path.resolve(process.cwd(), "state", "deployment-runtime-state.json");
let stateWriteLock = Promise.resolve();
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
};
const normalizeProvider = (value) => {
    return value === "docker" || value === "k8s" ? value : null;
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
        const provider = normalizeProvider(record.provider);
        if (!provider) {
            return null;
        }
        const dockerTargetHost = normalizeOptionalString(record.dockerTargetHost);
        const k8sNamespace = normalizeOptionalString(record.k8sNamespace) || (provider === "k8s" ? resolveOpenClawK8sNamespace() : null);
        const updatedAt = typeof record.updatedAt === "string" &&
            record.updatedAt.trim()
            ? record.updatedAt.trim()
            : new Date(0).toISOString();
        return [
            deploymentId,
            {
                provider,
                dockerTargetHost,
                k8sNamespace,
                updatedAt,
            },
        ];
    })
        .filter((entry) => entry !== null);
    return Object.fromEntries(entries);
};
const readStateFile = async (filePath = resolveDeploymentRuntimeStateFile()) => {
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
export const resolveDeploymentRuntimeStateFile = () => {
    const raw = process.env.OPENCLAW_RUNTIME_STATE_FILE?.trim();
    return raw && raw.length > 0 ? raw : DEFAULT_STATE_FILE;
};
export const readDeploymentRuntimeState = readStateFile;
export const getPersistedDeploymentRuntimeState = async (deploymentId, filePath = resolveDeploymentRuntimeStateFile()) => {
    const state = await readStateFile(filePath);
    return state[deploymentId] || null;
};
export const persistDeploymentRuntimeState = async (deploymentId, record, filePath = resolveDeploymentRuntimeStateFile()) => {
    const provider = record.provider;
    const dockerTargetHost = normalizeOptionalString(record.dockerTargetHost);
    const k8sNamespace = normalizeOptionalString(record.k8sNamespace) ||
        (provider === "k8s" ? resolveOpenClawK8sNamespace() : null);
    await withStateWriteLock(async () => {
        const state = await readStateFile(filePath);
        state[deploymentId] = {
            provider,
            dockerTargetHost,
            k8sNamespace,
            updatedAt: new Date().toISOString(),
        };
        const dir = path.dirname(filePath);
        await mkdir(dir, { recursive: true });
        const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(`${tempFilePath}`, `${JSON.stringify(state, null, 2)}\n`, "utf8");
        await rename(tempFilePath, filePath);
    });
};
export const removePersistedDeploymentRuntimeState = async (deploymentId, filePath = resolveDeploymentRuntimeStateFile()) => {
    await withStateWriteLock(async () => {
        const state = await readStateFile(filePath);
        if (!state[deploymentId]) {
            return;
        }
        delete state[deploymentId];
        const dir = path.dirname(filePath);
        await mkdir(dir, { recursive: true });
        const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(`${tempFilePath}`, `${JSON.stringify(state, null, 2)}\n`, "utf8");
        await rename(tempFilePath, filePath);
    });
};
export const resetDeploymentRuntimeStateStoreForTests = () => {
    stateWriteLock = Promise.resolve();
};

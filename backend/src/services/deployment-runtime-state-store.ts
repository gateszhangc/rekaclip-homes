import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type OpenClawRuntimeProvider,
  resolveOpenClawK8sNamespace,
} from "./runtime-provider.js";

export type DeploymentRuntimeStateRecord = {
  provider: OpenClawRuntimeProvider;
  dockerTargetHost: string | null;
  k8sNamespace: string | null;
  updatedAt: string;
};

type DeploymentRuntimeState = Record<string, DeploymentRuntimeStateRecord>;

const DEFAULT_STATE_FILE = path.resolve(
  process.cwd(),
  "state",
  "deployment-runtime-state.json"
);

let stateWriteLock: Promise<void> = Promise.resolve();

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeProvider = (value: unknown): OpenClawRuntimeProvider | null => {
  return value === "docker" || value === "k8s" ? value : null;
};

const sanitizeState = (value: unknown): DeploymentRuntimeState => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([deploymentId, record]) => {
      if (!record || typeof record !== "object") {
        return null;
      }

      const provider = normalizeProvider(
        (record as { provider?: unknown }).provider
      );
      if (!provider) {
        return null;
      }

      const dockerTargetHost = normalizeOptionalString(
        (record as { dockerTargetHost?: unknown }).dockerTargetHost
      );
      const k8sNamespace =
        normalizeOptionalString(
          (record as { k8sNamespace?: unknown }).k8sNamespace
        ) || (provider === "k8s" ? resolveOpenClawK8sNamespace() : null);
      const updatedAt =
        typeof (record as { updatedAt?: unknown }).updatedAt === "string" &&
        (record as { updatedAt: string }).updatedAt.trim()
          ? (record as { updatedAt: string }).updatedAt.trim()
          : new Date(0).toISOString();

      return [
        deploymentId,
        {
          provider,
          dockerTargetHost,
          k8sNamespace,
          updatedAt,
        },
      ] as const;
    })
    .filter(
      (
        entry
      ): entry is readonly [string, DeploymentRuntimeStateRecord] => entry !== null
    );

  return Object.fromEntries(entries);
};

const readStateFile = async (
  filePath: string = resolveDeploymentRuntimeStateFile()
): Promise<DeploymentRuntimeState> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return sanitizeState(JSON.parse(raw));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
};

const withStateWriteLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const previous = stateWriteLock.catch(() => {});
  let release = () => {};
  stateWriteLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
};

export const resolveDeploymentRuntimeStateFile = (): string => {
  const raw = process.env.OPENCLAW_RUNTIME_STATE_FILE?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_STATE_FILE;
};

export const readDeploymentRuntimeState = readStateFile;

export const getPersistedDeploymentRuntimeState = async (
  deploymentId: string,
  filePath: string = resolveDeploymentRuntimeStateFile()
): Promise<DeploymentRuntimeStateRecord | null> => {
  const state = await readStateFile(filePath);
  return state[deploymentId] || null;
};

export const persistDeploymentRuntimeState = async (
  deploymentId: string,
  record: {
    provider: OpenClawRuntimeProvider;
    dockerTargetHost?: string | null;
    k8sNamespace?: string | null;
  },
  filePath: string = resolveDeploymentRuntimeStateFile()
): Promise<void> => {
  const provider = record.provider;
  const dockerTargetHost = normalizeOptionalString(record.dockerTargetHost);
  const k8sNamespace =
    normalizeOptionalString(record.k8sNamespace) ||
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

export const removePersistedDeploymentRuntimeState = async (
  deploymentId: string,
  filePath: string = resolveDeploymentRuntimeStateFile()
): Promise<void> => {
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

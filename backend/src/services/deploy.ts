import { query } from "../db/index.js";
import {
  type DeployChannel,
} from "./docker.js";
import {
  hasDeploymentTargetHostColumn,
  persistDeploymentTargetHost,
} from "./deployment-target-host-store.js";
import { persistDeploymentRuntimeState } from "./deployment-runtime-state-store.js";
import {
  createOpenClawRuntimeForDeployment,
  inspectOpenClawRuntimeForDeployment,
  resolveDefaultOpenClawRuntimeState,
  resolveOpenClawRuntimeStateForDeployment,
} from "./runtime.js";
import { isRetryableK8sTransportError } from "./k8s.js";
import { encryptSecret, decryptSecret } from "../utils/crypto.js";
import { v4 as uuidv4 } from "uuid";
import { deployLogger } from "../utils/logger.js";

type DeploymentStatus = "provisioning" | "running" | "failed" | "stopped";
type DeploymentTier = "starter" | "pro";
type PgLikeError = {
  code?: string;
  constraint?: string;
  message?: string;
};
type DeploymentSql = {
  supportsTargetHostColumn: boolean;
  supportsChannelColumns: boolean;
  insertDeployment: string;
  selectDeployment: string;
  selectActiveDeployments: string;
  selectRuntimeDeployment: string;
};

const DEPLOYMENT_ACTIVE_SEAT_UNIQUE_INDEX =
  "uniq_public_deployments_subscription_order_active_seat";
const DEPLOYMENTS_TABLE = "easyclaw.deployments";
const DEPLOYMENTS_SCHEMA = "easyclaw";
const DEPLOYMENTS_TABLE_NAME = "deployments";
const DEPLOYMENTS_ACCOUNT_ID_COLUMN = "account_id";
const LEGACY_DEPLOY_CHANNEL: DeployChannel = "telegram";
const LEGACY_DISCORD_TOKEN_PREFIX = "discord:";
const LEGACY_TELEGRAM_TOKEN_PREFIX = "telegram:";
const LEGACY_WHATSAPP_TOKEN_PREFIX = "whatsapp:";
export const WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER =
  "__easyclaw_whatsapp_placeholder__";
export const DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE =
  "DEPLOYMENT_SEAT_UNAVAILABLE";

const DEFAULT_STALE_PROVISIONING_MS = 15 * 60 * 1000;
const DEPLOYMENT_ERROR_MESSAGE_MAX_CHARS = Number(
  process.env.DEPLOYMENT_ERROR_MESSAGE_MAX_CHARS || 8000
);

const buildDeploymentSeatUnavailableError = () =>
  new Error(DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE);

const isActiveDeploymentSeatUniqueViolation = (error: unknown): boolean => {
  const pgError = error as PgLikeError;
  if (pgError?.code !== "23505") {
    return false;
  }

  if (pgError.constraint === DEPLOYMENT_ACTIVE_SEAT_UNIQUE_INDEX) {
    return true;
  }

  return (pgError.message || "").includes(DEPLOYMENT_ACTIVE_SEAT_UNIQUE_INDEX);
};

const getStaleProvisioningMs = (): number => {
  const raw = process.env.DEPLOYMENT_STALE_PROVISIONING_MS;
  if (!raw) return DEFAULT_STALE_PROVISIONING_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_PROVISIONING_MS;
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const describeUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

export const isRecoverableDeploymentRuntimeError = (
  error?: unknown
): boolean => {
  const message = describeUnknownError(error).trim();
  if (!message) {
    return false;
  }

  if (isRetryableK8sTransportError(message)) {
    return true;
  }

  const normalized = message.toLowerCase();
  return ["unknown error", "deployment failed"].some((pattern) =>
    normalized.includes(pattern)
  );
};

export const shouldPromoteFailedDeploymentToRunning = ({
  errorMessage,
  runtimeInspection,
}: {
  errorMessage?: unknown;
  runtimeInspection?:
    | {
        exists?: boolean;
        running?: boolean;
      }
    | null
    | undefined;
}): boolean =>
  Boolean(
    runtimeInspection?.exists &&
      runtimeInspection.running &&
      isRecoverableDeploymentRuntimeError(errorMessage)
  );

const getStoredEncryptedToken = (row: {
  channel_token_encrypted?: string | null;
  telegram_token_encrypted?: string | null;
}): string | null => {
  if (typeof row.channel_token_encrypted === "string" && row.channel_token_encrypted) {
    return row.channel_token_encrypted;
  }
  if (typeof row.telegram_token_encrypted === "string" && row.telegram_token_encrypted) {
    return row.telegram_token_encrypted;
  }
  return null;
};

const buildUnsupportedChannelError = (channel: DeployChannel) =>
  new Error(`UNSUPPORTED_CHANNEL: ${channel}`);

const isDeployChannel = (value: unknown): value is DeployChannel =>
  value === "telegram" || value === "discord" || value === "whatsapp";

const resolveStoredDeployChannel = (value: unknown): DeployChannel => {
  if (typeof value !== "string") {
    return LEGACY_DEPLOY_CHANNEL;
  }

  const normalized = value.trim().toLowerCase();
  return isDeployChannel(normalized) ? normalized : LEGACY_DEPLOY_CHANNEL;
};

export const encodeStoredChannelTokenForPersistence = ({
  channel,
  channelToken,
  supportsChannelColumns,
}: {
  channel: DeployChannel;
  channelToken: string;
  supportsChannelColumns: boolean;
}): string => {
  const normalizedToken = channelToken.trim();
  if (supportsChannelColumns || channel === LEGACY_DEPLOY_CHANNEL) {
    return normalizedToken;
  }

  return `${channel}:${normalizedToken}`;
};

export const resolveDeploymentChannelTokenForPersistence = ({
  channel,
  channelToken,
}: {
  channel: DeployChannel;
  channelToken?: string | null;
}): string => {
  if (channel === "whatsapp") {
    return WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER;
  }

  const normalizedToken = channelToken?.trim();
  if (!normalizedToken) {
    throw new Error("Deployment missing channel token");
  }

  return normalizedToken;
};

export const decodeStoredChannelToken = ({
  storedChannel,
  storedToken,
}: {
  storedChannel?: unknown;
  storedToken: string;
}): {
  channel: DeployChannel;
  channelToken: string;
} => {
  const normalizedToken = storedToken.trim();
  if (normalizedToken.startsWith(LEGACY_DISCORD_TOKEN_PREFIX)) {
    return {
      channel: "discord",
      channelToken: normalizedToken.slice(LEGACY_DISCORD_TOKEN_PREFIX.length),
    };
  }

  if (normalizedToken.startsWith(LEGACY_TELEGRAM_TOKEN_PREFIX)) {
    return {
      channel: "telegram",
      channelToken: normalizedToken.slice(LEGACY_TELEGRAM_TOKEN_PREFIX.length),
    };
  }

  if (normalizedToken.startsWith(LEGACY_WHATSAPP_TOKEN_PREFIX)) {
    return {
      channel: "whatsapp",
      channelToken: normalizedToken.slice(LEGACY_WHATSAPP_TOKEN_PREFIX.length),
    };
  }

  return {
    channel: resolveStoredDeployChannel(storedChannel),
    channelToken: normalizedToken,
  };
};

export const assertChannelSupportedByPersistence = (
  channel: DeployChannel,
  supportsChannelColumns: boolean
) => {
  if (
    !supportsChannelColumns &&
    channel !== LEGACY_DEPLOY_CHANNEL &&
    channel !== "discord" &&
    channel !== "whatsapp"
  ) {
    throw buildUnsupportedChannelError(channel);
  }
};

const buildChannelAwareDeploymentSql = (
  supportsTargetHostColumn: boolean
): DeploymentSql => ({
  supportsTargetHostColumn,
  supportsChannelColumns: true,
  insertDeployment: supportsTargetHostColumn
    ? `insert into ${DEPLOYMENTS_TABLE} (
         id,
         user_id,
         status,
         channel_type,
         channel_token_encrypted,
         telegram_token_encrypted,
         target_host,
         requested_model,
         resolved_model,
         subscription_order_no,
         consumed_success
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`
    : `insert into ${DEPLOYMENTS_TABLE} (
         id,
         user_id,
         status,
         channel_type,
         channel_token_encrypted,
         telegram_token_encrypted,
         requested_model,
         resolved_model,
         subscription_order_no,
         consumed_success
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)`,
  selectDeployment: `select id,
       user_id,
       status,
       channel_type,
       ${supportsTargetHostColumn ? "target_host" : "null::text as target_host"},
       error_message,
       requested_model,
       resolved_model,
       created_at,
       updated_at
     from ${DEPLOYMENTS_TABLE}
     where id = $1`,
  selectActiveDeployments: `select id,
       status,
       channel_type,
       channel_token_encrypted,
       telegram_token_encrypted,
       subscription_order_no,
       error_message,
       ${supportsTargetHostColumn ? "target_host" : "null::text as target_host"},
       created_at,
       updated_at
     from ${DEPLOYMENTS_TABLE}
     where user_id = $1 and status in ('provisioning', 'running', 'failed')
     order by created_at desc
     limit 25`,
  selectRuntimeDeployment: `select channel_type,
       channel_token_encrypted,
       telegram_token_encrypted,
       user_id,
       ${supportsTargetHostColumn ? "target_host" : "null::text as target_host"}
     from ${DEPLOYMENTS_TABLE}
     where id = $1`,
});

const buildLegacyTelegramMvpDeploymentSql = (
  supportsTargetHostColumn: boolean
): DeploymentSql => ({
  supportsTargetHostColumn,
  supportsChannelColumns: false,
  insertDeployment: supportsTargetHostColumn
    ? `insert into ${DEPLOYMENTS_TABLE} (
         id,
         user_id,
         status,
         telegram_token_encrypted,
         target_host,
         requested_model,
         resolved_model,
         subscription_order_no,
         consumed_success
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, false)`
    : `insert into ${DEPLOYMENTS_TABLE} (
         id,
         user_id,
         status,
         telegram_token_encrypted,
         requested_model,
         resolved_model,
         subscription_order_no,
         consumed_success
       )
       values ($1, $2, $3, $4, $5, $6, $7, false)`,
  selectDeployment: `select id,
       user_id,
       status,
       '${LEGACY_DEPLOY_CHANNEL}'::text as channel_type,
       telegram_token_encrypted,
       ${supportsTargetHostColumn ? "target_host" : "null::text as target_host"},
       error_message,
       requested_model,
       resolved_model,
       created_at,
       updated_at
     from ${DEPLOYMENTS_TABLE}
     where id = $1`,
  selectActiveDeployments: `select id,
       status,
       telegram_token_encrypted,
       null::text as subscription_order_no,
       error_message,
       ${supportsTargetHostColumn ? "target_host" : "null::text as target_host"},
       created_at,
       updated_at
     from ${DEPLOYMENTS_TABLE}
     where user_id = $1 and status in ('provisioning', 'running', 'failed')
     order by created_at desc
     limit 25`,
  selectRuntimeDeployment: `select telegram_token_encrypted,
       user_id,
       ${supportsTargetHostColumn ? "target_host" : "null::text as target_host"}
     from ${DEPLOYMENTS_TABLE}
     where id = $1`,
});

export const channelAwareDeploymentSql = buildChannelAwareDeploymentSql(true);
export const legacyChannelAwareDeploymentSql = buildChannelAwareDeploymentSql(false);
export const legacyTelegramMvpDeploymentSql =
  buildLegacyTelegramMvpDeploymentSql(false);

let hasChannelColumnsPromise: Promise<boolean> | null = null;
let hasAccountIdColumnPromise: Promise<boolean> | null = null;

const hasDeploymentChannelColumns = async (): Promise<boolean> => {
  if (!hasChannelColumnsPromise) {
    hasChannelColumnsPromise = query(
      `select
         exists (
           select 1
           from information_schema.columns
           where table_schema = $1
             and table_name = $2
             and column_name = 'channel_type'
         ) as channel_type_present,
         exists (
           select 1
           from information_schema.columns
           where table_schema = $1
             and table_name = $2
             and column_name = 'channel_token_encrypted'
         ) as channel_token_present`,
      [DEPLOYMENTS_SCHEMA, DEPLOYMENTS_TABLE_NAME]
    ).then(
      (result) =>
        result.rows[0]?.channel_type_present === true &&
        result.rows[0]?.channel_token_present === true
    );
  }

  return hasChannelColumnsPromise;
};

export const hasDeploymentAccountIdColumn = async (): Promise<boolean> => {
  if (!hasAccountIdColumnPromise) {
    hasAccountIdColumnPromise = query(
      `select exists (
         select 1
         from information_schema.columns
         where table_schema = $1
           and table_name = $2
           and column_name = $3
       ) as present`,
      [
        DEPLOYMENTS_SCHEMA,
        DEPLOYMENTS_TABLE_NAME,
        DEPLOYMENTS_ACCOUNT_ID_COLUMN,
      ]
    ).then((result) => result.rows[0]?.present === true);
  }

  return hasAccountIdColumnPromise;
};

export const persistDeploymentAccountId = async (
  deploymentId: string,
  accountPoolId?: string | null
): Promise<void> => {
  const normalizedAccountPoolId = accountPoolId?.trim();
  if (!normalizedAccountPoolId) {
    return;
  }

  if (!(await hasDeploymentAccountIdColumn())) {
    return;
  }

  await query(
    `update ${DEPLOYMENTS_TABLE}
     set account_id = $2,
         updated_at = now()
     where id = $1`,
    [deploymentId, normalizedAccountPoolId]
  );
};

export const resetDeploymentAccountIdColumnSupportForTests = () => {
  hasAccountIdColumnPromise = null;
};

export const setDeploymentAccountIdColumnSupportForTests = (
  supported: boolean | null
) => {
  hasAccountIdColumnPromise =
    supported === null ? null : Promise.resolve(supported);
};

const getDeploymentSql = async (): Promise<DeploymentSql> => {
  const [supportsTargetHostColumn, supportsChannelColumns] = await Promise.all([
    hasDeploymentTargetHostColumn(),
    hasDeploymentChannelColumns(),
  ]);

  if (supportsChannelColumns) {
    return supportsTargetHostColumn
      ? channelAwareDeploymentSql
      : legacyChannelAwareDeploymentSql;
  }

  return supportsTargetHostColumn
    ? {
        ...buildLegacyTelegramMvpDeploymentSql(true),
      }
    : legacyTelegramMvpDeploymentSql;
};

type CreateDeploymentInput = {
  userId: string;
  channel: DeployChannel;
  channelToken?: string | null;
  requestedModel?: string;
  subscriptionOrderNo: string;
};

export const createDeployment = async ({
  userId,
  channel,
  channelToken,
  requestedModel,
  subscriptionOrderNo,
}: CreateDeploymentInput) => {
  const deploymentId = uuidv4();
  const runtimeState = await resolveDefaultOpenClawRuntimeState();
  const targetHost =
    runtimeState.provider === "docker" ? runtimeState.dockerTargetHost : null;
  const deploymentSql = await getDeploymentSql();
  assertChannelSupportedByPersistence(
    channel,
    deploymentSql.supportsChannelColumns
  );
  const tokenForPersistence = resolveDeploymentChannelTokenForPersistence({
    channel,
    channelToken,
  });
  const encryptedToken = encryptSecret(
    encodeStoredChannelTokenForPersistence({
      channel,
      channelToken: tokenForPersistence,
      supportsChannelColumns: deploymentSql.supportsChannelColumns,
    })
  );
  const log = deployLogger(deploymentId);

  log.info({ userId, channel, targetHost: targetHost || "<local>" }, "Creating deployment record");

  try {
    await query(
      deploymentSql.insertDeployment,
      deploymentSql.supportsChannelColumns
        ? deploymentSql.supportsTargetHostColumn
          ? [
              deploymentId,
              userId,
              "provisioning",
              channel,
              encryptedToken,
              encryptedToken,
              targetHost,
              requestedModel?.trim() || null,
              null,
              subscriptionOrderNo,
            ]
          : [
              deploymentId,
              userId,
              "provisioning",
              channel,
              encryptedToken,
              encryptedToken,
              requestedModel?.trim() || null,
              null,
              subscriptionOrderNo,
            ]
        : deploymentSql.supportsTargetHostColumn
          ? [
              deploymentId,
              userId,
              "provisioning",
              encryptedToken,
              targetHost,
              requestedModel?.trim() || null,
              null,
              subscriptionOrderNo,
            ]
          : [
              deploymentId,
              userId,
              "provisioning",
              encryptedToken,
              requestedModel?.trim() || null,
              null,
              subscriptionOrderNo,
            ]
    );
  } catch (error) {
    if (isActiveDeploymentSeatUniqueViolation(error)) {
      throw buildDeploymentSeatUnavailableError();
    }
    throw error;
  }

  if (!deploymentSql.supportsTargetHostColumn && targetHost) {
    try {
      await persistDeploymentTargetHost(deploymentId, targetHost);
    } catch (error) {
      await query(`delete from ${DEPLOYMENTS_TABLE} where id = $1`, [deploymentId]).catch(
        () => undefined
      );
      throw error;
    }
  }

  try {
    await persistDeploymentRuntimeState(deploymentId, {
      provider: runtimeState.provider,
      dockerTargetHost: runtimeState.dockerTargetHost,
      k8sNamespace: runtimeState.k8sNamespace,
    });
  } catch (error) {
    await query(`delete from ${DEPLOYMENTS_TABLE} where id = $1`, [deploymentId]).catch(
      () => undefined
    );
    throw error;
  }

  log.info("Deployment record created with status 'provisioning'");
  return deploymentId;
};

export const updateDeploymentStatus = async (
  deploymentId: string,
  status: DeploymentStatus,
  errorMessage?: string | null
) => {
  const log = deployLogger(deploymentId);
  const sanitizedErrorMessage = sanitizeDeploymentErrorMessage(errorMessage);
  
  log.info({ status, errorMessage: sanitizedErrorMessage }, "Updating deployment status");

  if (status === "running") {
    await query(
      `update ${DEPLOYMENTS_TABLE}
       set status = $2,
           error_message = $3,
           consumed_success = true,
           consumed_at = coalesce(consumed_at, now()),
           updated_at = now()
       where id = $1`,
      [deploymentId, status, sanitizedErrorMessage]
    );
    return;
  }

  await query(
    `update ${DEPLOYMENTS_TABLE}
     set status = $2,
         error_message = $3,
         updated_at = now()
     where id = $1`,
    [deploymentId, status, sanitizedErrorMessage]
  );
};

export const updateDeploymentModelResolution = async (
  deploymentId: string,
  requestedModel?: string | null,
  resolvedModel?: string | null
) => {
  await query(
    `update ${DEPLOYMENTS_TABLE}
     set requested_model = $2,
         resolved_model = $3,
         updated_at = now()
     where id = $1`,
    [deploymentId, requestedModel?.trim() || null, resolvedModel?.trim() || null]
  );
};

const sanitizeDeploymentErrorMessage = (value?: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.length <= DEPLOYMENT_ERROR_MESSAGE_MAX_CHARS) {
    return cleaned;
  }

  const omitted = cleaned.length - DEPLOYMENT_ERROR_MESSAGE_MAX_CHARS;
  return `${cleaned.slice(0, DEPLOYMENT_ERROR_MESSAGE_MAX_CHARS)}... [truncated ${omitted} chars]`;
};

export const getDeployment = async (deploymentId: string) => {
  const log = deployLogger(deploymentId);

  const deploymentSql = await getDeploymentSql();
  const result = await query(deploymentSql.selectDeployment, [deploymentId]);
  
  const deployment = result.rows[0] || null;
  if (deployment) {
    if (!deploymentSql.supportsChannelColumns) {
      const encryptedToken = getStoredEncryptedToken(deployment);
      if (encryptedToken) {
        try {
          const { channel } = decodeStoredChannelToken({
            storedChannel: deployment.channel_type,
            storedToken: decryptSecret(encryptedToken),
          });
          deployment.channel_type = channel;
        } catch {
          deployment.channel_type = resolveStoredDeployChannel(
            deployment.channel_type
          );
        }
      }
    }
    delete deployment.channel_token_encrypted;
    delete deployment.telegram_token_encrypted;
    const runtime = await resolveOpenClawRuntimeStateForDeployment(
      deploymentId,
      deployment.target_host
    );
    deployment.target_host =
      runtime.provider === "docker" ? runtime.dockerTargetHost : null;
    const status = deployment.status as DeploymentStatus;

    // Keep DB state consistent with the real runtime state.
    if (status === "running") {
      const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
        deploymentId,
        deployment.target_host
      );
      if (!runtimeInspection.exists || !runtimeInspection.running) {
        const details = !runtimeInspection.exists
          ? `${runtime.provider} runtime not found`
          : `${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"})`;
        const message = `OpenClaw ${details}. Please deploy again.`;

        log.warn(
          { runtime: runtimeInspection, provider: runtime.provider },
          "Running deployment is out of sync with the runtime; marking failed"
        );
        await updateDeploymentStatus(deploymentId, "failed", message);

        deployment.status = "failed";
        deployment.error_message = message;
      }
    }

    if (
      status === "failed" &&
      isRecoverableDeploymentRuntimeError(deployment.error_message)
    ) {
      const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
        deploymentId,
        deployment.target_host
      );
      if (
        shouldPromoteFailedDeploymentToRunning({
          errorMessage: deployment.error_message,
          runtimeInspection,
        })
      ) {
        log.warn(
          {
            runtime: runtimeInspection,
            provider: runtime.provider,
            errorMessage: deployment.error_message,
          },
          "Failed deployment has a running runtime; promoting to running"
        );
        await updateDeploymentStatus(deploymentId, "running", null);
        deployment.status = "running";
        deployment.error_message = null;
      }
    }

    if (status === "provisioning") {
      const staleProvisioningMs = getStaleProvisioningMs();
      const createdAt = parseDate(deployment.created_at);
      const updatedAt = parseDate(deployment.updated_at);
      const lastTouchedAt = updatedAt || createdAt;
      const ageMs = lastTouchedAt ? Date.now() - lastTouchedAt.getTime() : null;

      if (ageMs !== null && ageMs > staleProvisioningMs) {
        const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
          deploymentId,
          deployment.target_host
        );
        if (runtimeInspection.exists && runtimeInspection.running) {
          log.warn(
            { ageMs, staleProvisioningMs, runtime: runtimeInspection },
            "Stale provisioning deployment has a running runtime; promoting to running"
          );
          await updateDeploymentStatus(deploymentId, "running", null);
          deployment.status = "running";
          deployment.error_message = null;
        } else {
          const details = !runtimeInspection.exists
            ? `${runtime.provider} runtime not found`
            : `${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"})`;
          const message = `Deployment stalled for >${Math.round(staleProvisioningMs / 60_000)} minutes (${details}). Please deploy again.`;
          log.warn(
            { ageMs, staleProvisioningMs, runtime: runtimeInspection },
            "Stale provisioning deployment requested; marking failed"
          );
          await updateDeploymentStatus(deploymentId, "failed", message);
          deployment.status = "failed";
          deployment.error_message = message;
        }
      }
    }

    log.debug({ status: deployment.status }, "Deployment found");
  } else {
    log.warn("Deployment not found in database");
  }
  
  return deployment;
};

export const findActiveDeploymentByUserAndChannelToken = async ({
  userId,
  channel,
  channelToken,
}: {
  userId: string;
  channel: DeployChannel;
  channelToken: string;
}): Promise<{ id: string; status: DeploymentStatus } | null> => {
  const staleProvisioningMs = getStaleProvisioningMs();

  const deploymentSql = await getDeploymentSql();
  const result = await query(deploymentSql.selectActiveDeployments, [userId]);

  for (const row of result.rows) {
    try {
      const encryptedToken = getStoredEncryptedToken(row);
      if (!encryptedToken) {
        continue;
      }
      const { channel: storedChannel, channelToken: existingToken } =
        decodeStoredChannelToken({
          storedChannel: row.channel_type,
          storedToken: decryptSecret(encryptedToken),
        });
      if (storedChannel !== channel) {
        continue;
      }

      if (existingToken === channelToken) {
        const log = deployLogger(row.id);
        const status = row.status as DeploymentStatus;
        const runtime = await resolveOpenClawRuntimeStateForDeployment(
          row.id,
          row.target_host
        );

        if (status === "running") {
          const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
            row.id,
            row.target_host
          );
          if (!runtimeInspection.exists || !runtimeInspection.running) {
            const details = !runtimeInspection.exists
              ? `${runtime.provider} runtime not found`
              : `${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"})`;
            log.warn(
              { userId, runtime: runtimeInspection, provider: runtime.provider },
              "Found running deployment without a running runtime; marking as failed"
            );
            await updateDeploymentStatus(
              row.id,
              "failed",
              `OpenClaw ${details}. Please deploy again.`
            );
            continue;
          }
        }

        if (status === "failed") {
          const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
            row.id,
            row.target_host
          );

          if (
            shouldPromoteFailedDeploymentToRunning({
              errorMessage: row.error_message,
              runtimeInspection,
            })
          ) {
            log.warn(
              {
                userId,
                runtime: runtimeInspection,
                provider: runtime.provider,
                errorMessage: row.error_message,
              },
              "Found recoverable failed deployment with a running runtime; promoting to running"
            );
            await updateDeploymentStatus(row.id, "running", null);
            return { id: row.id, status: "running" };
          }

          continue;
        }

        // If a provisioning deployment got stuck (e.g. server restart after responding),
        // don't keep reusing it forever. Mark it failed so a new deploy can start.
        if (status === "provisioning") {
          const createdAt = parseDate(row.created_at);
          const updatedAt = parseDate(row.updated_at);
          const lastTouchedAt = updatedAt || createdAt;
          const ageMs = lastTouchedAt ? Date.now() - lastTouchedAt.getTime() : null;

          const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
            row.id,
            row.target_host
          );
          if (runtimeInspection.exists && !runtimeInspection.running) {
            const message = `OpenClaw ${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"}). Please deploy again.`;
            log.warn(
              { userId, runtime: runtimeInspection, provider: runtime.provider },
              "Provisioning deployment has a non-running runtime; marking as failed"
            );
            await updateDeploymentStatus(row.id, "failed", message);
            continue;
          }

          if (ageMs !== null && ageMs > staleProvisioningMs) {
            if (runtimeInspection.exists && runtimeInspection.running) {
              log.warn(
                { userId, ageMs, staleProvisioningMs, runtime: runtimeInspection },
                "Found stale provisioning deployment with running runtime; promoting to running"
              );
              await updateDeploymentStatus(row.id, "running", null);
              return { id: row.id, status: "running" };
            }

            const details = !runtimeInspection.exists
              ? `${runtime.provider} runtime not found`
              : `${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"})`;
            log.warn(
              { userId, ageMs, staleProvisioningMs, runtime: runtimeInspection },
              "Found stale provisioning deployment; marking as failed"
            );
            await updateDeploymentStatus(
              row.id,
              "failed",
              `Deployment stalled for >${Math.round(staleProvisioningMs / 60_000)} minutes (${details}). Please deploy again.`
            );
            continue;
          }
        }

        log.info({ userId, status }, "Found existing active deployment");
        return { id: row.id, status };
      }
    } catch {
      // Ignore rows that don't have a decryptable token payload.
      // This keeps deploy idempotency robust even if legacy rows exist.
    }
  }

  return null;
};

export const findReusableWhatsAppDeploymentBySubscriptionOrder = async ({
  userId,
  subscriptionOrderNo,
}: {
  userId: string;
  subscriptionOrderNo: string;
}): Promise<{ id: string; status: DeploymentStatus } | null> => {
  const normalizedOrderNo = subscriptionOrderNo.trim();
  if (!normalizedOrderNo) {
    return null;
  }

  const staleProvisioningMs = getStaleProvisioningMs();
  const deploymentSql = await getDeploymentSql();
  const result = await query(deploymentSql.selectActiveDeployments, [userId]);

  for (const row of result.rows) {
    const encryptedToken = getStoredEncryptedToken(row);
    const rowChannel = encryptedToken
      ? (() => {
          try {
            return decodeStoredChannelToken({
              storedChannel: row.channel_type,
              storedToken: decryptSecret(encryptedToken),
            }).channel;
          } catch {
            return resolveStoredDeployChannel(row.channel_type);
          }
        })()
      : resolveStoredDeployChannel(row.channel_type);

    if (
      rowChannel !== "whatsapp" ||
      row.subscription_order_no !== normalizedOrderNo
    ) {
      continue;
    }

    const log = deployLogger(row.id);
    const status = row.status as DeploymentStatus;
    const runtime = await resolveOpenClawRuntimeStateForDeployment(
      row.id,
      row.target_host
    );

    if (status === "running") {
      const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
        row.id,
        row.target_host
      );
      if (!runtimeInspection.exists || !runtimeInspection.running) {
        const details = !runtimeInspection.exists
          ? `${runtime.provider} runtime not found`
          : `${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"})`;
        log.warn(
          { userId, runtime: runtimeInspection, provider: runtime.provider },
          "Found running WhatsApp deployment without a running runtime; marking as failed"
        );
        await updateDeploymentStatus(
          row.id,
          "failed",
          `OpenClaw ${details}. Please deploy again.`
        );
        continue;
      }

      return { id: row.id, status };
    }

    if (status !== "provisioning") {
      continue;
    }

    const createdAt = parseDate(row.created_at);
    const updatedAt = parseDate(row.updated_at);
    const lastTouchedAt = updatedAt || createdAt;
    const ageMs = lastTouchedAt ? Date.now() - lastTouchedAt.getTime() : null;
    const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
      row.id,
      row.target_host
    );

    if (runtimeInspection.exists && !runtimeInspection.running) {
      const message = `OpenClaw ${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"}). Please deploy again.`;
      log.warn(
        { userId, runtime: runtimeInspection, provider: runtime.provider },
        "Provisioning WhatsApp deployment has a non-running runtime; marking as failed"
      );
      await updateDeploymentStatus(row.id, "failed", message);
      continue;
    }

    if (ageMs !== null && ageMs > staleProvisioningMs) {
      if (runtimeInspection.exists && runtimeInspection.running) {
        log.warn(
          { userId, ageMs, staleProvisioningMs, runtime: runtimeInspection },
          "Found stale provisioning WhatsApp deployment with running runtime; reusing it"
        );
        return { id: row.id, status };
      }

      const details = !runtimeInspection.exists
        ? `${runtime.provider} runtime not found`
        : `${runtime.provider} runtime not running (status=${runtimeInspection.status || "unknown"}, exit=${runtimeInspection.exitCode ?? "unknown"})`;
      log.warn(
        { userId, ageMs, staleProvisioningMs, runtime: runtimeInspection },
        "Found stale provisioning WhatsApp deployment; marking as failed"
      );
      await updateDeploymentStatus(
        row.id,
        "failed",
        `Deployment stalled for >${Math.round(staleProvisioningMs / 60_000)} minutes (${details}). Please deploy again.`
      );
      continue;
    }

    return { id: row.id, status };
  }

  return null;
};

export const runDeployment = async (
  deploymentId: string,
  model: string | undefined,
  tier: DeploymentTier
) => {
  const log = deployLogger(deploymentId);

  const deploymentSql = await getDeploymentSql();
  const result = await query(deploymentSql.selectRuntimeDeployment, [deploymentId]);

  const row = result.rows[0];
  if (!row) {
    log.error("Deployment record not found in database");
    throw new Error("Deployment not found");
  }

  const encryptedToken = getStoredEncryptedToken(row);
  if (!encryptedToken) {
    throw new Error("Deployment missing channel token");
  }
  const { channel, channelToken } = decodeStoredChannelToken({
    storedChannel: row.channel_type,
    storedToken: decryptSecret(encryptedToken),
  });
  const userId = row.user_id;
  const runtime = await resolveOpenClawRuntimeStateForDeployment(
    deploymentId,
    row.target_host
  );

  log.info(
    {
      userId,
      channel,
      model: model || "<not specified>",
      tier,
      provider: runtime.provider,
      targetHost: runtime.dockerTargetHost || "<none>",
      namespace: runtime.k8sNamespace || "<none>",
    },
    "Starting OpenClaw deployment"
  );

  try {
    await updateDeploymentModelResolution(deploymentId, model || null, null);

    const container = await createOpenClawRuntimeForDeployment({
      channel,
      channelToken,
      model,
      deploymentId,
      databaseTargetHost: row.target_host,
      userId,
      tier,
    });
    await updateDeploymentModelResolution(
      deploymentId,
      container.requestedModel || model || null,
      container.resolvedModel || null
    );
    await persistDeploymentAccountId(deploymentId, container.accountPoolId);
    await updateDeploymentStatus(deploymentId, "running");
    log.info(
      {
        accountPoolId: container.accountPoolId || null,
        provider: container.provider || null,
        requestedModel: container.requestedModel,
        resolvedModel: container.resolvedModel,
        podName: container.containerId,
      },
      "Deployment completed successfully"
    );
  } catch (error) {
    const errorMessage = describeUnknownError(error);
    log.error({ error: errorMessage, stack: error instanceof Error ? error.stack : undefined }, "Deployment failed");

    if (isRecoverableDeploymentRuntimeError(errorMessage)) {
      try {
        const runtimeInspection = await inspectOpenClawRuntimeForDeployment(
          deploymentId,
          row.target_host
        );
        if (
          shouldPromoteFailedDeploymentToRunning({
            errorMessage,
            runtimeInspection,
          })
        ) {
          log.warn(
            { runtime: runtimeInspection, error: errorMessage },
            "Deployment hit a recoverable control-plane error after the runtime came up; promoting to running"
          );
          await updateDeploymentStatus(deploymentId, "running", null);
          return;
        }
      } catch (runtimeError) {
        log.warn(
          { error: describeUnknownError(runtimeError) },
          "Failed to inspect runtime while recovering deployment failure"
        );
      }
    }

    await updateDeploymentStatus(deploymentId, "failed", errorMessage);
    throw error;
  }
};

import { Writable } from "node:stream";
import type WebSocket from "isomorphic-ws";
import {
  AppsV1Api,
  CoreV1Api,
  Exec,
  KubeConfig,
  type V1Deployment,
  type V1Pod,
  type V1Secret,
  type V1Status,
} from "@kubernetes/client-node";
import { v4 as uuidv4 } from "uuid";
import { assignFreshAccount } from "./account-pool.js";
import {
  type CreateContainerResult,
  type DeployChannel,
  type OpenClawChannelStatus,
  DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE,
  type OpenClawContainerStatus,
  KIE_CLAUDE_PROVIDER,
  KIE_CLAUDE_OPUS_4_6_MODEL,
  KIE_CODEX_PROVIDER,
  KIE_GEMINI_PROVIDER,
  KIE_GEMINI_3_1_PRO_MODEL,
  KIE_GPT_5_4_MODEL,
  KIE_PROVIDER,
  assertModelProviderConsistency,
  buildOpenClawVolumePrepScript,
  canBypassRuntimeCatalogLookup,
  getModelAuthProviderId,
  inferRequiredProvider,
  parseOpenClawChannelStatus,
  resolveModelFromRuntimeCatalog,
  resolveOpenClawModel,
} from "./docker.js";
import {
  KIE_CLAUDE_AUTH_PROXY_BASE_URL,
  KIE_CLAUDE_AUTH_PROXY_PORT,
  buildKieClaudeAuthProxyRuntimeScript,
  buildKieGatewaySmokeArgs,
  extractOpenClawAgentTextFromJson,
} from "./openclaw/kie-claude-auth-proxy.js";
import { resolveOpenClawK8sNamespace } from "./runtime-provider.js";
import { deployLogger, dockerLogger } from "../utils/logger.js";
import { WHATSAPP_LOGIN_COMMAND } from "./whatsapp-login/config.js";

const READY_WAIT_MS = Number(
  process.env.OPENCLAW_READY_WAIT_MS ||
    process.env.OPENCLAW_CONFIG_WAIT_MS ||
    300_000
);
const CHANNEL_READY_STABILITY_MS = Number(
  process.env.OPENCLAW_CHANNEL_READY_STABILITY_MS ||
    process.env.OPENCLAW_TELEGRAM_READY_STABILITY_MS ||
    1500
);
const OPENCLAW_CLI_TIMEOUT_MS = Number(
  process.env.OPENCLAW_CLI_TIMEOUT_MS || 300_000
);
/** mkdir/chown/config write in pod; slow on NFS or busy nodes (was 10s, too tight). */
const OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS = Number(
  process.env.OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS || 120_000
);
const OPENCLAW_UPDATE_TIMEOUT_MS = Number(
  process.env.OPENCLAW_UPDATE_TIMEOUT_MS || 600_000
);
const OPENCLAW_CHANNEL_STATUS_TIMEOUT_MS = Number(
  process.env.OPENCLAW_CHANNEL_STATUS_TIMEOUT_MS || 15_000
);
const OPENCLAW_KIE_PREFLIGHT_TIMEOUT_MS = Number(
  process.env.OPENCLAW_KIE_PREFLIGHT_TIMEOUT_MS || 20_000
);
const OPENCLAW_KIE_GATEWAY_SMOKE_TIMEOUT_MS = Number(
  process.env.OPENCLAW_KIE_GATEWAY_SMOKE_TIMEOUT_MS || 90_000
);
export const resolveOpenClawK8sAutoUpdateForOpenRouter = (): boolean =>
  process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER === "true";

const OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER =
  resolveOpenClawK8sAutoUpdateForOpenRouter();
const OPENCLAW_STRICT_MODEL_MATCH =
  process.env.OPENCLAW_STRICT_MODEL_MATCH !== "false";
const OPENCLAW_K8S_REQUEST_CPU =
  process.env.OPENCLAW_K8S_REQUEST_CPU?.trim() || "500m";
const OPENCLAW_K8S_REQUEST_MEMORY =
  process.env.OPENCLAW_K8S_REQUEST_MEMORY?.trim() || "1Gi";
const OPENCLAW_K8S_LIMIT_CPU =
  process.env.OPENCLAW_K8S_LIMIT_CPU?.trim() || "2";
const OPENCLAW_K8S_LIMIT_MEMORY =
  process.env.OPENCLAW_K8S_LIMIT_MEMORY?.trim() || "4Gi";
const OPENCLAW_K8S_IMAGE_PULL_POLICY =
  process.env.OPENCLAW_K8S_IMAGE_PULL_POLICY?.trim() || "IfNotPresent";
const IMAGE_NAME =
  process.env.OPENCLAW_IMAGE || "fourplayers/openclaw:2026.3.23-2";
const OPENCLAW_HOME_DIR = "/home/node/.openclaw";
const OPENCLAW_CONFIG_FILE = `${OPENCLAW_HOME_DIR}/openclaw.json`;
const OPENCLAW_WORKSPACE_DIR = `${OPENCLAW_HOME_DIR}/workspace`;
const OPENCLAW_K8S_CONFIG_READY_FILE = `${OPENCLAW_HOME_DIR}/.easyclaw-config-ready`;
const OPENCLAW_K8S_CONFIG_FINGERPRINT_FILE = `${OPENCLAW_HOME_DIR}/.easyclaw-config-fingerprint`;
const GATEWAY_MODE = process.env.OPENCLAW_GATEWAY_MODE || "local";
const OPENCLAW_K8S_CONFIG_FINGERPRINT_VERSION = 2;
export const OPENCLAW_GATEWAY_PORT = 18_789;
const WHATSAPP_RUNTIME_READY_LOG_LINE =
  "Listening for personal WhatsApp inbound messages.";
const KIE_CREDIT_ENDPOINT = "https://api.kie.ai/api/v1/chat/credit";
const KIE_SMOKE_PROMPT = "Reply with exactly OK.";
const KIE_POD_LOCAL_API_KEY_PLACEHOLDER = "__KIE_API_KEY__";
const KIE_K8S_SUPPORTED_MODELS = new Set([
  KIE_GPT_5_4_MODEL,
  KIE_CLAUDE_OPUS_4_6_MODEL,
  KIE_GEMINI_3_1_PRO_MODEL,
]);
const KIE_K8S_GATEWAY_SMOKE_MODELS = new Set([
  KIE_CLAUDE_OPUS_4_6_MODEL,
  KIE_GEMINI_3_1_PRO_MODEL,
]);

export const TELEGRAM_UNAUTHORIZED_ERROR_CODE = "TELEGRAM_UNAUTHORIZED";
export const WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE =
  "WHATSAPP_SESSION_UNAUTHORIZED";
export const KIE_CREDIT_EXHAUSTED_ERROR_CODE = "KIE_CREDIT_EXHAUSTED";
export const KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE = "KIE_UPSTREAM_UNAVAILABLE";
export const KIE_MODEL_PRECHECK_FAILED_ERROR_CODE =
  "KIE_MODEL_PRECHECK_FAILED";

type K8sClients = {
  core: CoreV1Api;
  apps: AppsV1Api;
  exec: Exec;
};

type ExecResult = {
  stdout: string;
  stderr: string;
  status: V1Status | null;
};

type CreateK8sRuntimeInput = {
  channel: DeployChannel;
  channelToken: string;
  model?: string;
  deploymentId: string;
  namespace?: string | null;
  userId?: string;
  tier?: "starter" | "pro";
};

export type OpenClawK8sRuntimeStatus = OpenClawContainerStatus & {
  namespace: string;
  podName?: string;
};

type PodIdentity = {
  name: string;
  namespace: string;
  containerName: string;
};

export type OpenClawK8sWhatsAppLoginTarget = {
  namespace: string;
  pod: string;
  container: string;
  command: string[];
};

export type OpenClawK8sDashboardTarget = {
  namespace: string;
  deployment: string;
  pod: string;
  container: string;
  gatewayPort: number;
};

const isNoAvailablePoolAccountError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message === "NO_AVAILABLE_PRO_ACCOUNT" ||
    error.message === "NO_AVAILABLE_STARTER_ACCOUNT" ||
    error.message.startsWith("NO_AVAILABLE_ACCOUNT_FOR_PROVIDER")
  );
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeDateString = (value: Date | string | undefined): string | undefined => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseNodeSelector = (): Record<string, string> => {
  const raw = process.env.OPENCLAW_K8S_NODE_SELECTOR_JSON?.trim();
  if (!raw) {
    return { "easyclaw-role": "openclaw-worker" };
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OPENCLAW_K8S_NODE_SELECTOR_JSON must be a JSON object");
  }

  const selector = Object.fromEntries(
    Object.entries(parsed)
      .map(([key, value]) => [String(key).trim(), String(value).trim()] as const)
      .filter(([key, value]) => key && value)
  );

  if (Object.keys(selector).length === 0) {
    throw new Error("OPENCLAW_K8S_NODE_SELECTOR_JSON resolved to an empty selector");
  }

  return selector;
};

const parseJsonObjectFromOutput = (output: string): any => {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("Empty JSON output");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error(`Invalid JSON output: ${trimmed.slice(0, 200)}`);
    }
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
  }
};

const parseModelKeysFromCatalog = (output: string): string[] => {
  const parsed = parseJsonObjectFromOutput(output);
  const models = parsed?.models;
  if (!Array.isArray(models)) {
    return [];
  }

  const keys = new Set<string>();
  for (const item of models) {
    if (typeof item?.key === "string" && item.key.trim()) {
      keys.add(item.key.trim());
    }
  }
  return Array.from(keys);
};

type OpenClawModelsStatusOutput = {
  defaultModel?: string | null;
  resolvedDefault?: string | null;
  auth?: {
    missingProvidersInUse?: string[];
    providers?: Array<{
      provider?: string;
    }>;
  };
};

type OpenClawHealthChannelOutput = {
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  lastError?: string | null;
  probe?: {
    ok?: boolean;
    status?: number | null;
    error?: string | null;
  };
};

type OpenClawHealthOutput = {
  ok?: boolean;
  channels?: Partial<Record<DeployChannel, OpenClawHealthChannelOutput>>;
};

type KieSmokeRequest = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

const describeUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`.trim();
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

const truncateForError = (value: string, maxChars: number = 300): string =>
  value.length <= maxChars ? value : `${value.slice(0, maxChars)}...`;

const buildDeploymentError = (code: string, detail: string): Error =>
  new Error(`${code}: ${detail}`);

const parseJsonSafely = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const parseKieCreditBalance = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const rootPayload = payload as Record<string, unknown>;
  const rootData = toFiniteNumber(rootPayload.data);
  if (rootData !== null) {
    return rootData;
  }

  const rootCredits = toFiniteNumber(rootPayload.credits);
  if (rootCredits !== null) {
    return rootCredits;
  }

  const rootCredit = toFiniteNumber(rootPayload.credit);
  if (rootCredit !== null) {
    return rootCredit;
  }

  const visited = new Set<unknown>();
  const queue: unknown[] = Object.values(rootPayload);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const normalizedKey = key.trim().toLowerCase();
      if (normalizedKey === "credits" || normalizedKey === "credit") {
        const parsed = toFiniteNumber(value);
        if (parsed !== null) {
          return parsed;
        }
      }

      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
};

const parseKieBodyCode = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return toFiniteNumber((payload as { code?: unknown }).code);
};

const assertKieBodyCodeSuccess = ({
  stage,
  resolvedModel,
  payload,
  bodyText,
}: {
  stage: "credit" | "smoke";
  resolvedModel: string;
  payload: unknown;
  bodyText: string;
}): void => {
  const code = parseKieBodyCode(payload);
  if (code === null || code === 200) {
    return;
  }

  const detail = [
    `stage=${stage}`,
    `status=200`,
    `code=${code}`,
    `model=${resolvedModel}`,
    bodyText.trim() ? `body=${truncateForError(bodyText.trim())}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (code === 402) {
    throw buildDeploymentError(KIE_CREDIT_EXHAUSTED_ERROR_CODE, detail);
  }

  if (code >= 500) {
    throw buildDeploymentError(KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE, detail);
  }

  throw buildDeploymentError(KIE_MODEL_PRECHECK_FAILED_ERROR_CODE, detail);
};

const extractTextFromContentValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = extractTextFromContentValue(entry);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const directText = extractTextFromContentValue(
    (value as { text?: unknown }).text
  );
  if (directText) {
    return directText;
  }

  return extractTextFromContentValue((value as { content?: unknown }).content);
};

export const extractKieAssistantText = (
  resolvedModel: string,
  payload: unknown
): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (resolvedModel === KIE_GPT_5_4_MODEL) {
    const outputText = extractTextFromContentValue(
      (payload as { output_text?: unknown }).output_text
    );
    if (outputText) {
      return outputText;
    }

    return extractTextFromContentValue(
      (payload as { output?: unknown }).output
    );
  }

  if (resolvedModel === KIE_CLAUDE_OPUS_4_6_MODEL) {
    return extractTextFromContentValue(
      (payload as { content?: unknown }).content
    );
  }

  if (resolvedModel === KIE_GEMINI_3_1_PRO_MODEL) {
    const choices = (payload as { choices?: unknown }).choices;
    if (Array.isArray(choices)) {
      for (const choice of choices) {
        const text =
          extractTextFromContentValue(
            (choice as { message?: unknown }).message
          ) ||
          extractTextFromContentValue((choice as { text?: unknown }).text) ||
          extractTextFromContentValue(
            (choice as { delta?: unknown }).delta
          );
        if (text) {
          return text;
        }
      }
    }
  }

  return null;
};

export const buildKieModelPreflightRequest = (
  resolvedModel: string,
  apiKey: string
): KieSmokeRequest => {
  const authorization = `Bearer ${apiKey}`;

  if (resolvedModel === KIE_GPT_5_4_MODEL) {
    return {
      url: "https://api.kie.ai/codex/v1/responses",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: {
        model: "gpt-5-4",
        input: KIE_SMOKE_PROMPT,
        max_output_tokens: 16,
        stream: false,
      },
    };
  }

  if (resolvedModel === KIE_CLAUDE_OPUS_4_6_MODEL) {
    return {
      url: "https://api.kie.ai/claude/v1/messages",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: "claude-opus-4-6",
        max_tokens: 16,
        messages: [
          {
            role: "user",
            content: KIE_SMOKE_PROMPT,
          },
        ],
      },
    };
  }

  if (resolvedModel === KIE_GEMINI_3_1_PRO_MODEL) {
    return {
      url: "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: {
        model: "gemini-3.1-pro",
        messages: [
          {
            role: "user",
            content: KIE_SMOKE_PROMPT,
          },
        ],
        max_tokens: 16,
        temperature: 0,
      },
    };
  }

  throw buildDeploymentError(
    KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
    `unsupported KIE model: ${resolvedModel || "<unset>"}`
  );
};

export const classifyKiePreflightHttpFailure = ({
  stage,
  status,
  resolvedModel,
  bodyText,
}: {
  stage: "credit" | "smoke";
  status: number;
  resolvedModel: string;
  bodyText: string;
}): Error => {
  const detail = [
    `stage=${stage}`,
    `status=${status}`,
    `model=${resolvedModel}`,
    bodyText.trim() ? `body=${truncateForError(bodyText.trim())}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (status === 402) {
    return buildDeploymentError(KIE_CREDIT_EXHAUSTED_ERROR_CODE, detail);
  }

  if (status === 429 || status >= 500) {
    return buildDeploymentError(KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE, detail);
  }

  return buildDeploymentError(KIE_MODEL_PRECHECK_FAILED_ERROR_CODE, detail);
};

export const performKieLivePreflight = async ({
  apiKey,
  resolvedModel,
  fetchImpl = fetch,
}: {
  apiKey: string;
  resolvedModel: string;
  fetchImpl?: FetchLike;
}): Promise<{ credits: number; text: string }> => {
  const runFetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    try {
      return await fetchImpl(input, {
        ...init,
        signal: AbortSignal.timeout(OPENCLAW_KIE_PREFLIGHT_TIMEOUT_MS),
      });
    } catch (error) {
      throw buildDeploymentError(
        KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE,
        `network failure while contacting KIE: ${describeUnknownError(error)}`
      );
    }
  };

  const creditResponse = await runFetch(KIE_CREDIT_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const creditText = await creditResponse.text();
  if (!creditResponse.ok) {
    throw classifyKiePreflightHttpFailure({
      stage: "credit",
      status: creditResponse.status,
      resolvedModel,
      bodyText: creditText,
    });
  }

  const creditPayload = parseJsonSafely(creditText);
  assertKieBodyCodeSuccess({
    stage: "credit",
    resolvedModel,
    payload: creditPayload,
    bodyText: creditText,
  });
  const credits = parseKieCreditBalance(creditPayload);
  if (credits === null) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `stage=credit, model=${resolvedModel}, credits missing`
    );
  }
  if (credits <= 0) {
    throw buildDeploymentError(
      KIE_CREDIT_EXHAUSTED_ERROR_CODE,
      `stage=credit, model=${resolvedModel}, credits=${credits}`
    );
  }

  const smokeRequest = buildKieModelPreflightRequest(resolvedModel, apiKey);
  const smokeResponse = await runFetch(smokeRequest.url, {
    method: "POST",
    headers: smokeRequest.headers,
    body: JSON.stringify(smokeRequest.body),
  });
  const smokeText = await smokeResponse.text();
  if (!smokeResponse.ok) {
    throw classifyKiePreflightHttpFailure({
      stage: "smoke",
      status: smokeResponse.status,
      resolvedModel,
      bodyText: smokeText,
    });
  }

  const smokePayload = parseJsonSafely(smokeText);
  assertKieBodyCodeSuccess({
    stage: "smoke",
    resolvedModel,
    payload: smokePayload,
    bodyText: smokeText,
  });
  if (!smokePayload) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `stage=smoke, model=${resolvedModel}, invalid JSON body`
    );
  }
  const assistantText = extractKieAssistantText(resolvedModel, smokePayload);
  if (!assistantText) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `stage=smoke, model=${resolvedModel}, empty assistant text`
    );
  }

  return {
    credits,
    text: assistantText,
  };
};

const extractKiePreflightCodeMessage = (value: string): string | null => {
  const normalized = value.match(
    /(KIE_CREDIT_EXHAUSTED|KIE_UPSTREAM_UNAVAILABLE|KIE_MODEL_PRECHECK_FAILED):[^\n\r]*/
  );
  return normalized?.[0]?.trim() || null;
};

type KiePodLocalPreflightMode = "full" | "credit-only";

const buildKiePodLocalPreflightScript = (
  resolvedModel: string,
  mode: KiePodLocalPreflightMode = "full"
): string => {
  const smokeRequest = buildKieModelPreflightRequest(
    resolvedModel,
    KIE_POD_LOCAL_API_KEY_PLACEHOLDER
  );

  return [
    `const CREDIT_URL = ${JSON.stringify(KIE_CREDIT_ENDPOINT)};`,
    `const MODEL = ${JSON.stringify(resolvedModel)};`,
    `const TIMEOUT_MS = ${OPENCLAW_KIE_PREFLIGHT_TIMEOUT_MS};`,
    `const CREDIT_EXHAUSTED = ${JSON.stringify(KIE_CREDIT_EXHAUSTED_ERROR_CODE)};`,
    `const UPSTREAM_UNAVAILABLE = ${JSON.stringify(KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE)};`,
    `const MODEL_PRECHECK_FAILED = ${JSON.stringify(KIE_MODEL_PRECHECK_FAILED_ERROR_CODE)};`,
    `const MODE = ${JSON.stringify(mode)};`,
    `const API_KEY_PLACEHOLDER = ${JSON.stringify(KIE_POD_LOCAL_API_KEY_PLACEHOLDER)};`,
    `const SMOKE_REQUEST = ${JSON.stringify(smokeRequest)};`,
    "const truncate = (value, maxChars = 300) => value.length <= maxChars ? value : `${value.slice(0, maxChars)}...`;",
    "const describe = (error) => { if (error instanceof Error) return `${error.name} ${error.message}`.trim(); if (typeof error === 'string') return error; if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) return error.message.trim(); try { return JSON.stringify(error); } catch { return String(error); } };",
    "const fail = (code, detail) => { console.error(`${code}: ${detail}`); process.exit(1); };",
    "const parseJson = (value) => { const trimmed = String(value || '').trim(); if (!trimmed) return null; try { return JSON.parse(trimmed); } catch { return null; } };",
    "const toNumber = (value) => { if (typeof value === 'number' && Number.isFinite(value)) return value; if (typeof value === 'string' && value.trim()) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; } return null; };",
    "const parseBodyCode = (payload) => (!payload || typeof payload !== 'object' ? null : toNumber(payload.code));",
    "const parseCreditBalance = (payload) => { if (!payload || typeof payload !== 'object') return null; const rootData = toNumber(payload.data); if (rootData !== null) return rootData; const rootCredits = toNumber(payload.credits); if (rootCredits !== null) return rootCredits; const rootCredit = toNumber(payload.credit); if (rootCredit !== null) return rootCredit; const visited = new Set(); const queue = Object.values(payload); while (queue.length > 0) { const current = queue.shift(); if (!current || typeof current !== 'object' || visited.has(current)) continue; visited.add(current); if (Array.isArray(current)) { queue.push(...current); continue; } for (const [key, value] of Object.entries(current)) { const normalizedKey = key.trim().toLowerCase(); if (normalizedKey === 'credit' || normalizedKey === 'credits') { const parsed = toNumber(value); if (parsed !== null) return parsed; } if (value && typeof value === 'object') queue.push(value); } } return null; };",
    "const extractText = (value) => { if (typeof value === 'string') { const normalized = value.trim(); return normalized ? normalized : null; } if (Array.isArray(value)) { for (const entry of value) { const parsed = extractText(entry); if (parsed) return parsed; } return null; } if (!value || typeof value !== 'object') return null; const directText = extractText(value.text); if (directText) return directText; return extractText(value.content); };",
    "const extractAssistantText = (model, payload) => { if (!payload || typeof payload !== 'object') return null; if (model === 'kie-gpt/gpt-5-4') { return extractText(payload.output_text) || extractText(payload.output); } if (model === 'kie-claude/claude-opus-4-6') { return extractText(payload.content); } if (model === 'kie-gemini/gemini-3.1-pro') { const choices = payload.choices; if (Array.isArray(choices)) { for (const choice of choices) { const text = extractText(choice.message) || extractText(choice.text) || extractText(choice.delta); if (text) return text; } } return null; } return null; };",
    "const classifyFailure = (stage, status, bodyText) => { const detail = [`stage=${stage}`, `status=${status}`, `model=${MODEL}`, String(bodyText || '').trim() ? `body=${truncate(String(bodyText).trim())}` : null].filter(Boolean).join(', '); if (status === 402) fail(CREDIT_EXHAUSTED, detail); if (status === 429 || status >= 500) fail(UPSTREAM_UNAVAILABLE, detail); fail(MODEL_PRECHECK_FAILED, detail); };",
    "const assertBodyCodeSuccess = (stage, payload, bodyText) => { const code = parseBodyCode(payload); if (code === null || code === 200) return; const detail = [`stage=${stage}`, 'status=200', `code=${code}`, `model=${MODEL}`, String(bodyText || '').trim() ? `body=${truncate(String(bodyText).trim())}` : null].filter(Boolean).join(', '); if (code === 402) fail(CREDIT_EXHAUSTED, detail); if (code >= 500) fail(UPSTREAM_UNAVAILABLE, detail); fail(MODEL_PRECHECK_FAILED, detail); };",
    "const runFetch = async (input, init) => { try { return await fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }); } catch (error) { fail(UPSTREAM_UNAVAILABLE, `network failure while contacting KIE: ${describe(error)}`); } };",
    "const main = async () => { const apiKey = (process.env.KIE_API_KEY || '').trim(); if (!apiKey) fail(MODEL_PRECHECK_FAILED, 'missing KIE_API_KEY'); const smokeRequest = JSON.parse(JSON.stringify(SMOKE_REQUEST)); for (const header of Object.keys(smokeRequest.headers || {})) { smokeRequest.headers[header] = String(smokeRequest.headers[header]).split(API_KEY_PLACEHOLDER).join(apiKey); } const creditResponse = await runFetch(CREDIT_URL, { method: 'GET', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } }); const creditText = await creditResponse.text(); if (!creditResponse.ok) classifyFailure('credit', creditResponse.status, creditText); const creditPayload = parseJson(creditText); assertBodyCodeSuccess('credit', creditPayload, creditText); const credits = parseCreditBalance(creditPayload); if (credits === null) fail(MODEL_PRECHECK_FAILED, `stage=credit, model=${MODEL}, credits missing`); if (credits <= 0) fail(CREDIT_EXHAUSTED, `stage=credit, model=${MODEL}, credits=${credits}`); if (MODE === 'credit-only') { process.stdout.write(JSON.stringify({ credits }) + '\\n'); return; } const smokeResponse = await runFetch(smokeRequest.url, { method: 'POST', headers: smokeRequest.headers, body: JSON.stringify(smokeRequest.body) }); const smokeText = await smokeResponse.text(); if (!smokeResponse.ok) classifyFailure('smoke', smokeResponse.status, smokeText); const smokePayload = parseJson(smokeText); assertBodyCodeSuccess('smoke', smokePayload, smokeText); if (!smokePayload) fail(MODEL_PRECHECK_FAILED, `stage=smoke, model=${MODEL}, invalid JSON body`); const assistantText = extractAssistantText(MODEL, smokePayload); if (!assistantText) fail(MODEL_PRECHECK_FAILED, `stage=smoke, model=${MODEL}, empty assistant text`); process.stdout.write(JSON.stringify({ credits, text: assistantText }) + '\\n'); };",
    "main().catch((error) => { const detail = describe(error); if (/timed out|timeout|abort/i.test(detail)) fail(UPSTREAM_UNAVAILABLE, detail); fail(MODEL_PRECHECK_FAILED, detail); });",
  ].join("\n");
};

const parseKiePodLocalCreditCheckSuccess = (
  output: string,
  resolvedModel: string
): { credits: number } => {
  const payload = parseJsonSafely(output);
  const credits =
    payload && typeof payload === "object"
      ? toFiniteNumber((payload as { credits?: unknown }).credits)
      : null;

  if (credits === null) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `pod-local credit check returned invalid payload for model=${resolvedModel}`
    );
  }

  return { credits };
};

const parseKiePodLocalPreflightSuccess = (
  output: string,
  resolvedModel: string
): { credits: number; text: string } => {
  const payload = parseJsonSafely(output);
  const credits =
    payload && typeof payload === "object"
      ? toFiniteNumber((payload as { credits?: unknown }).credits)
      : null;
  const text =
    payload && typeof payload === "object"
      ? extractTextFromContentValue((payload as { text?: unknown }).text)
      : null;

  if (credits === null || !text) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `pod-local preflight returned invalid payload for model=${resolvedModel}`
    );
  }

  return { credits, text };
};

const runKiePodLocalScript = async ({
  resolvedModel,
  mode,
  exec,
  pod,
  runScriptInPod,
  retryDelaysMs,
}: {
  resolvedModel: string;
  mode: KiePodLocalPreflightMode;
  exec?: Exec;
  pod?: { name: string; namespace: string; containerName: string };
  runScriptInPod?: (script: string) => Promise<{ stdout: string; stderr?: string }>;
  retryDelaysMs?: number[];
}): Promise<{ stdout: string; stderr?: string }> => {
  const script = buildKiePodLocalPreflightScript(resolvedModel, mode);
  const runner =
    runScriptInPod ||
    (async (nodeScript: string) => {
      if (!exec || !pod) {
        throw new Error("missing exec context for KIE pod-local preflight");
      }

      const result = await execInPod(exec, pod, {
        cmd: ["node", "-e", nodeScript],
        timeoutMs: OPENCLAW_KIE_PREFLIGHT_TIMEOUT_MS + 5_000,
      });
      return {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    });

  try {
    return await withRetryableK8sControlPlaneCall({
      operation: pod
        ? `kie.pod-local-${mode}:${pod.namespace}/${pod.name}:${resolvedModel}`
        : `kie.pod-local-${mode}:${resolvedModel}`,
      retryDelaysMs,
      isRetryable: isRetryableK8sPodExecControlPlaneError,
      fn: async () => await runner(script),
    });
  } catch (error) {
    const message = describeUnknownError(error);
    const codeMessage = extractKiePreflightCodeMessage(message);
    if (codeMessage) {
      throw new Error(codeMessage);
    }

    if (isRetryableK8sPodExecControlPlaneError(error)) {
      throw buildDeploymentError(
        KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE,
        `pod-local preflight failed due to K8s transport error for model=${resolvedModel}: ${truncateForError(
          message
        )}`
      );
    }

    if (/timed out|timeout|abort/i.test(message)) {
      throw buildDeploymentError(
        KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE,
        `pod-local ${mode} timed out for model=${resolvedModel}`
      );
    }

    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `pod-local ${mode} failed for model=${resolvedModel}: ${truncateForError(
        message
      )}`
    );
  }
};

export const performKiePodLocalCreditCheck = async ({
  resolvedModel,
  exec,
  pod,
  runScriptInPod,
  retryDelaysMs,
}: {
  resolvedModel: string;
  exec?: Exec;
  pod?: { name: string; namespace: string; containerName: string };
  runScriptInPod?: (script: string) => Promise<{ stdout: string; stderr?: string }>;
  retryDelaysMs?: number[];
}): Promise<{ credits: number }> => {
  const result = await runKiePodLocalScript({
    resolvedModel,
    mode: "credit-only",
    exec,
    pod,
    runScriptInPod,
    retryDelaysMs,
  });
  return parseKiePodLocalCreditCheckSuccess(result.stdout, resolvedModel);
};

export const performKiePodLocalPreflight = async ({
  resolvedModel,
  exec,
  pod,
  runScriptInPod,
  retryDelaysMs,
}: {
  resolvedModel: string;
  exec?: Exec;
  pod?: { name: string; namespace: string; containerName: string };
  runScriptInPod?: (script: string) => Promise<{ stdout: string; stderr?: string }>;
  retryDelaysMs?: number[];
}): Promise<{ credits: number; text: string }> => {
  const result = await runKiePodLocalScript({
    resolvedModel,
    mode: "full",
    exec,
    pod,
    runScriptInPod,
    retryDelaysMs,
  });
  return parseKiePodLocalPreflightSuccess(result.stdout, resolvedModel);
};

const parseKieGatewaySmokeSuccess = (
  output: string,
  resolvedModel: string
): string => {
  const assistantText = extractOpenClawAgentTextFromJson(output);
  if (!assistantText) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `gateway smoke returned invalid payload for model=${resolvedModel}`
    );
  }

  if (assistantText !== "OK") {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `gateway smoke returned unexpected assistant text for model=${resolvedModel}: ${truncateForError(
        assistantText
      )}`
    );
  }

  return assistantText;
};

const performKieGatewaySmokeInPod = async ({
  resolvedModel,
  exec,
  pod,
}: {
  resolvedModel: string;
  exec: Exec;
  pod: PodIdentity;
}): Promise<string> => {
  try {
    const result = await withRetryableK8sControlPlaneCall({
      operation: `kie.gateway-smoke:${pod.namespace}/${pod.name}:${resolvedModel}`,
      isRetryable: isRetryableK8sPodExecControlPlaneError,
      fn: async () =>
        await execInPod(exec, pod, {
          cmd: buildOpenClawK8sCliCommand(
            buildKieGatewaySmokeArgs(),
            KIE_PROVIDER
          ),
          timeoutMs: OPENCLAW_KIE_GATEWAY_SMOKE_TIMEOUT_MS,
        }),
    });

    return parseKieGatewaySmokeSuccess(result.stdout, resolvedModel);
  } catch (error) {
    const message = describeUnknownError(error);

    if (isRetryableK8sPodExecControlPlaneError(error)) {
      throw buildDeploymentError(
        KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE,
        `gateway smoke failed due to K8s transport error for model=${resolvedModel}: ${truncateForError(
          message
        )}`
      );
    }

    if (/timed out|timeout|abort|request ended without sending any chunks/i.test(message)) {
      throw buildDeploymentError(
        KIE_UPSTREAM_UNAVAILABLE_ERROR_CODE,
        `gateway smoke failed for model=${resolvedModel}: ${truncateForError(
          message
        )}`
      );
    }

    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `gateway smoke failed for model=${resolvedModel}: ${truncateForError(
        message
      )}`
    );
  }
};

const isTelegramUnauthorizedSignal = (
  lastError?: string | null,
  probeStatus?: number | null
): boolean =>
  probeStatus === 401 ||
  /unauthorized|invalid token|not authorized/i.test(lastError || "");

const isWhatsAppUnauthorizedSignal = ({
  lastError,
  probeStatus,
  logs,
}: {
  lastError?: string | null;
  probeStatus?: number | null;
  logs?: string | null;
}): boolean =>
  probeStatus === 401 ||
  /401|unauthorized|connection failure/i.test(lastError || "") ||
  /whatsapp[\s\S]{0,200}(401|unauthorized|connection failure)/i.test(logs || "");

const parseOpenClawModelsStatus = (
  output: string
): OpenClawModelsStatusOutput => {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("OPENCLAW_MODELS_STATUS_EMPTY");
  }

  try {
    return JSON.parse(trimmed) as OpenClawModelsStatusOutput;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`OPENCLAW_MODELS_STATUS_INVALID_JSON: ${trimmed}`);
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as OpenClawModelsStatusOutput;
  }
};

const parseOpenClawHealth = (output: string): OpenClawHealthOutput => {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("OPENCLAW_HEALTH_EMPTY");
  }

  try {
    return JSON.parse(trimmed) as OpenClawHealthOutput;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`OPENCLAW_HEALTH_INVALID_JSON: ${trimmed}`);
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as OpenClawHealthOutput;
  }
};

export const isOpenClawHealthReadyForChannel = (
  health: OpenClawHealthOutput,
  channel: DeployChannel
): boolean => {
  const channelHealth = health.channels?.[channel];
  if (!health.ok || !channelHealth?.configured || channelHealth.lastError) {
    return false;
  }

  if (
    channel === "telegram" &&
    isTelegramUnauthorizedSignal(
      channelHealth.lastError || channelHealth.probe?.error || null,
      channelHealth.probe?.status ?? null
    )
  ) {
    return false;
  }

  if (channel === "telegram") {
    return channelHealth.probe?.ok === true;
  }

  return channelHealth.running === true || channelHealth.probe?.ok === true;
};

export const isWhatsAppRuntimeReadyFromLogs = (logs: string): boolean =>
  logs.includes(WHATSAPP_RUNTIME_READY_LOG_LINE);

const composeRuntimeModelIdentityNote = (resolvedModel: string): string =>
  [
    "## Runtime model truth source",
    `The authoritative runtime model for this deployment is \`${resolvedModel}\`.`,
    'If asked "what model are you", answer with exactly this runtime model key.',
    "Do not claim Gemini 1.5 Pro unless the runtime model key is actually that model.",
  ].join("\n");

const modelKeyFingerprint = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9/]/g, "");

const isGemini3ProFamilyModel = (value: string): boolean =>
  /gemini-3(?:\.1)?-pro(?:-preview)?/.test(value.toLowerCase());

const isStrictModelFamilyModel = (value: string): boolean =>
  OPENCLAW_STRICT_MODEL_MATCH && isGemini3ProFamilyModel(value);

const extractExecExitCode = (status: V1Status | null): number => {
  if (!status) {
    return 0;
  }

  if (status.status === "Success") {
    return 0;
  }

  const causes = status.details?.causes || [];
  for (const cause of causes) {
    if (cause.reason === "ExitCode") {
      const parsed = Number(cause.message);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 1;
};

const shellEscape = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

export const buildOpenClawK8sCliCommand = (
  args: string[],
  _provider?: string
): string[] => ["env", "HOME=/home/node", "openclaw", ...args];

const buildOpenClawKieProvidersConfig = () => ({
  [KIE_CODEX_PROVIDER]: {
    api: "openai-responses",
    auth: "token",
    baseUrl: "https://api.kie.ai/codex/v1",
    apiKey: "${KIE_API_KEY}",
    models: [
      {
        id: "gpt-5-4",
        name: "GPT-5.4 (Kie)",
      },
    ],
  },
  [KIE_CLAUDE_PROVIDER]: {
    api: "anthropic-messages",
    auth: "token",
    authHeader: true,
    baseUrl: KIE_CLAUDE_AUTH_PROXY_BASE_URL,
    apiKey: "${KIE_API_KEY}",
    headers: {
      "anthropic-version": "2023-06-01",
    },
    models: [
      {
        id: "claude-opus-4-6",
        name: "Claude Opus 4.6 (Kie)",
      },
    ],
  },
  [KIE_GEMINI_PROVIDER]: {
    api: "openai-completions",
    auth: "token",
    baseUrl: "https://api.kie.ai/gemini-3.1-pro/v1",
    apiKey: "${KIE_API_KEY}",
    models: [
      {
        id: "gemini-3.1-pro",
        name: "Gemini 3.1 Pro (Kie)",
      },
    ],
  },
});

export const buildOpenClawKieConfigJson = (): string =>
  `${JSON.stringify(
    {
      models: {
        mode: "merge",
        providers: buildOpenClawKieProvidersConfig(),
      },
    },
    null,
    2
  )}\n`;

export const resolveKieRuntimeModelForK8s = (
  requestedModel: string | undefined
): string => {
  const normalizedModel = requestedModel?.trim();
  if (!normalizedModel || !KIE_K8S_SUPPORTED_MODELS.has(normalizedModel)) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      `unsupported KIE model for K8s deploy: ${normalizedModel || "<unset>"}`
    );
  }

  return normalizedModel;
};

export const buildRenderedOpenClawConfigForK8s = ({
  channel,
  provider,
  resolvedModel,
}: {
  channel: DeployChannel;
  provider?: string | null;
  resolvedModel?: string | null;
}): string => {
  const normalizedProvider = provider?.trim().toLowerCase() || "openai";
  if (normalizedProvider !== KIE_PROVIDER) {
    throw new Error(
      `buildRenderedOpenClawConfigForK8s only supports provider=${KIE_PROVIDER}`
    );
  }

  const runtimeModel = resolveKieRuntimeModelForK8s(resolvedModel || undefined);
  const channels: Record<string, unknown> = {};

  if (channel === "telegram") {
    channels.telegram = {
      enabled: true,
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "allowlist",
      streaming: "partial",
    };
  }

  if (channel === "discord") {
    channels.discord = {
      enabled: true,
      allowFrom: ["*"],
      dmPolicy: "open",
      groupPolicy: "open",
    };
  }

  if (channel === "whatsapp") {
    channels.whatsapp = {
      enabled: true,
      allowFrom: ["*"],
      dmPolicy: "open",
      groupPolicy: "disabled",
    };
  }

  return `${JSON.stringify(
    {
      gateway: {
        mode: "local",
        controlUi: {
          dangerouslyDisableDeviceAuth: true,
          dangerouslyAllowHostHeaderOriginFallback: true,
        },
      },
      models: {
        mode: "merge",
        providers: buildOpenClawKieProvidersConfig(),
      },
      agents: {
        defaults: {
          model: {
            primary: runtimeModel,
          },
        },
      },
      channels,
    },
    null,
    2
  )}\n`;
};

export const buildOpenClawWorkspaceMemorySeedScript = (
  referenceDate: Date = new Date()
): string => {
  const normalizedReferenceDate = new Date(referenceDate);
  const today = normalizedReferenceDate.toISOString().slice(0, 10);
  const yesterday = new Date(
    normalizedReferenceDate.getTime() - 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  return [
    `WORKSPACE_DIR=${shellEscape(OPENCLAW_WORKSPACE_DIR)}`,
    'MEMORY_DIR="$WORKSPACE_DIR/memory"',
    'mkdir -p "$MEMORY_DIR"',
    '[ -f "$WORKSPACE_DIR/MEMORY.md" ] || printf "# MEMORY.md\\n\\nPersistent notes for the assistant.\\n" > "$WORKSPACE_DIR/MEMORY.md"',
    `for day in ${shellEscape(today)} ${shellEscape(yesterday)}; do`,
    '  file="$MEMORY_DIR/$day.md"',
    '  [ -f "$file" ] || printf "# %s\\n\\n" "$day" > "$file"',
    "done",
    'if [ "$(id -u)" = "0" ]; then chown -R node:node "$WORKSPACE_DIR/MEMORY.md" "$MEMORY_DIR"; fi',
  ].join("\n");
};

const buildOpenClawK8sGatewayWaitScript = (): string =>
  [
    "set -eu",
    `READY_FILE=${shellEscape(OPENCLAW_K8S_CONFIG_READY_FILE)}`,
    'while [ ! -f "$READY_FILE" ]; do sleep 1; done',
    "exec env HOME=/home/node openclaw gateway run",
  ].join("\n");

export const buildOpenClawK8sConfigFingerprint = ({
  channel,
  provider,
  model,
}: {
  channel: DeployChannel;
  provider?: string | null;
  model?: string | null;
}): string =>
  Buffer.from(
    JSON.stringify({
      version: OPENCLAW_K8S_CONFIG_FINGERPRINT_VERSION,
      gatewayMode:
        provider?.trim().toLowerCase() === KIE_PROVIDER ? "local" : GATEWAY_MODE,
      image: IMAGE_NAME,
      channel,
      provider: provider?.trim().toLowerCase() || null,
      model: model?.trim() || null,
      kieClaudeProxyRevision:
        provider?.trim().toLowerCase() === KIE_PROVIDER ? 1 : 0,
    }),
    "utf8"
  ).toString("base64url");

const buildRenderedOpenClawConfigWriteScript = ({
  renderedConfig,
  configFingerprint,
}: {
  renderedConfig: string;
  configFingerprint: string;
}): string => {
  const renderedConfigBase64 = Buffer.from(renderedConfig, "utf8").toString("base64");
  const tempConfigFile = `${OPENCLAW_CONFIG_FILE}.tmp`;

  return [
    "set -eu",
    `CONFIG_FILE=${shellEscape(OPENCLAW_CONFIG_FILE)}`,
    `TEMP_FILE=${shellEscape(tempConfigFile)}`,
    `PAIRING_FILE=${shellEscape(
      `${OPENCLAW_HOME_DIR}/credentials/telegram-pairing.json`
    )}`,
    `FINGERPRINT_FILE=${shellEscape(OPENCLAW_K8S_CONFIG_FINGERPRINT_FILE)}`,
    `READY_FILE=${shellEscape(OPENCLAW_K8S_CONFIG_READY_FILE)}`,
    `printf '%s' ${shellEscape(renderedConfigBase64)} | base64 -d > "$TEMP_FILE"`,
    'mv "$TEMP_FILE" "$CONFIG_FILE"',
    'rm -f "$PAIRING_FILE"',
    `printf '%s' ${shellEscape(configFingerprint)} > "$FINGERPRINT_FILE"`,
    'touch "$READY_FILE"',
  ].join("\n");
};

export const buildOpenClawK8sVolumePrepScript = (
  configFingerprint: string
): string => {
  const baseScript = buildOpenClawVolumePrepScript();
  return [
    baseScript,
    `READY_FILE=${shellEscape(OPENCLAW_K8S_CONFIG_READY_FILE)}`,
    `FINGERPRINT_FILE=${shellEscape(OPENCLAW_K8S_CONFIG_FINGERPRINT_FILE)}`,
    `EXPECTED_FINGERPRINT=${shellEscape(configFingerprint)}`,
    'rm -f "$READY_FILE"',
    'if [ -f "$FINGERPRINT_FILE" ] && [ "$(cat "$FINGERPRINT_FILE")" = "$EXPECTED_FINGERPRINT" ]; then',
    '  touch "$READY_FILE"',
    '  chown node:node "$READY_FILE"',
    "fi",
  ].join("\n");
};

const isNotFoundError = (error: unknown): boolean => {
  const statusCode =
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { statusCode?: number } })?.response?.statusCode ??
    (error as { body?: { code?: number } })?.body?.code;
  if (statusCode === 404) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /404|not found/i.test(message);
};

const isAlreadyExistsError = (error: unknown): boolean => {
  const statusCode =
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { statusCode?: number } })?.response?.statusCode ??
    (error as { body?: { code?: number } })?.body?.code;
  if (statusCode === 409) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /already exists|409/i.test(message);
};

export const isRetryableK8sTransportError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  const message = describeUnknownError(error);
  if (!message) {
    return false;
  }

  return [
    /econnreset/i,
    /etimedout/i,
    /econnrefused/i,
    /socket hang up/i,
    /fetch failed/i,
    /network socket disconnected/i,
    /secure tls connection was established/i,
    /connection terminated unexpectedly/i,
    /timeout/i,
    /abort/i,
    /^eof$/i,
  ].some((pattern) => pattern.test(message));
};

type RetryableK8sControlPlaneCallInput<T> = {
  operation: string;
  fn: () => Promise<T>;
  retryDelaysMs?: number[];
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (input: {
    operation: string;
    attempt: number;
    maxAttempts: number;
    error: unknown;
  }) => void;
};

export const withRetryableK8sControlPlaneCall = async <T>({
  operation,
  fn,
  retryDelaysMs = [500, 1000, 2000],
  isRetryable = isRetryableK8sTransportError,
  onRetry,
}: RetryableK8sControlPlaneCallInput<T>): Promise<T> => {
  const maxAttempts = retryDelaysMs.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const retryable = isRetryable(error);
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      onRetry?.({ operation, attempt, maxAttempts, error });
      dockerLogger.warn(
        {
          operation,
          attempt,
          maxAttempts,
          error: describeUnknownError(error),
        },
        "Retrying K8s control-plane call after transport error"
      );
      await sleep(retryDelaysMs[attempt - 1] || 0);
    }
  }

  throw new Error(`K8S_CONTROL_PLANE_RETRY_EXHAUSTED: ${operation}`);
};

const isRetryableK8sPodExecControlPlaneError = (error: unknown): boolean => {
  const message = describeUnknownError(error);
  if (!message) {
    return false;
  }

  if (/\bPod exec failed \(exit=\d+\):/i.test(message)) {
    return false;
  }

  if (/\bPod exec timed out after \d+ms:/i.test(message)) {
    return false;
  }

  return isRetryableK8sTransportError(error);
};

type KubeConfigLoader = Pick<
  KubeConfig,
  "loadFromString" | "loadFromFile" | "loadFromDefault"
>;

const decodeOpenClawK8sKubeconfigB64 = (encoded: string): string => {
  const normalized = encoded.replace(/\s+/g, "");
  if (
    !normalized ||
    normalized.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
  ) {
    throw new Error("invalid OPENCLAW_K8S_KUBECONFIG_B64");
  }

  const decoded = Buffer.from(normalized, "base64").toString("utf8");
  if (!decoded.trim()) {
    throw new Error("invalid OPENCLAW_K8S_KUBECONFIG_B64");
  }

  return decoded;
};

export const loadOpenClawKubeConfig = (
  kubeConfig: KubeConfigLoader
): void => {
  const encoded = process.env.OPENCLAW_K8S_KUBECONFIG_B64?.trim();
  if (encoded) {
    const decoded = decodeOpenClawK8sKubeconfigB64(encoded);
    try {
      kubeConfig.loadFromString(decoded);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`invalid OPENCLAW_K8S_KUBECONFIG_B64: ${message}`);
    }
    return;
  }

  const explicitPath = process.env.OPENCLAW_K8S_KUBECONFIG?.trim();
  if (explicitPath) {
    kubeConfig.loadFromFile(explicitPath);
  } else {
    kubeConfig.loadFromDefault();
  }
};

const createK8sClients = (): K8sClients => {
  const kubeConfig = new KubeConfig();
  loadOpenClawKubeConfig(kubeConfig);
  return {
    core: kubeConfig.makeApiClient(CoreV1Api),
    apps: kubeConfig.makeApiClient(AppsV1Api),
    exec: new Exec(kubeConfig),
  };
};

export const buildOpenClawK8sLabels = (
  deploymentId: string
): Record<string, string> => ({
  "app.kubernetes.io/name": "openclaw",
  "app.kubernetes.io/instance": `openclaw-${deploymentId}`,
  "app.kubernetes.io/managed-by": "easyclaw-backend",
  "easyclaw/deployment-id": deploymentId,
});

export const buildOpenClawK8sDeploymentName = (
  deploymentId: string
): string => `openclaw-${deploymentId}`;

export const buildOpenClawK8sHostname = (deploymentId: string): string => {
  const normalized = deploymentId.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const suffix = normalized.slice(0, 12) || "runtime";
  return `oc-${suffix}`;
};

export const buildOpenClawK8sSecretName = (
  deploymentId: string
): string => `openclaw-secret-${deploymentId}`;

export const buildOpenClawK8sSecretManifest = ({
  deploymentId,
  channel,
  channelToken,
  gatewayToken,
  apiKey,
  provider,
}: {
  deploymentId: string;
  channel: DeployChannel;
  channelToken: string;
  gatewayToken: string;
  apiKey: string;
  provider: string;
}): V1Secret => {
  const stringData: Record<string, string> = {
    OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    [getApiKeyEnvVar(provider)]: apiKey,
  };

  if (channel === "telegram") {
    stringData.TELEGRAM_BOT_TOKEN = channelToken;
    stringData.TELEGRAM_TOKEN = channelToken;
  } else if (channel === "discord") {
    stringData.DISCORD_BOT_TOKEN = channelToken;
  }

  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: buildOpenClawK8sSecretName(deploymentId),
      labels: buildOpenClawK8sLabels(deploymentId),
    },
    type: "Opaque",
    stringData,
  };
};

export const buildOpenClawK8sDeploymentManifest = ({
  deploymentId,
  image,
  secretName,
  provider,
  configFingerprint,
  modelEnv,
}: {
  deploymentId: string;
  image: string;
  secretName: string;
  provider?: string | null;
  configFingerprint: string;
  modelEnv?: string | null;
}): V1Deployment => {
  const labels = buildOpenClawK8sLabels(deploymentId);
  const normalizedProvider = provider?.trim().toLowerCase() || null;
  const nodeSelector = parseNodeSelector();
  const nodeExpressions = Object.entries(nodeSelector).map(([key, value]) => ({
    key,
    operator: "In",
    values: [value],
  }));
  const env = [
    { name: "HOME", value: "/home/node" },
    { name: "OPENCLAW_GATEWAY_MODE", value: GATEWAY_MODE },
    { name: "OPENCLAW_ALLOW_UNCONFIGURED", value: "true" },
    { name: "OPENCLAW_SKIP_ONBOARD", value: "true" },
    ...(modelEnv ? [{ name: "OPENCLAW_MODEL", value: modelEnv }] : []),
  ];
  const containers = [
    {
      name: "openclaw",
      image,
      imagePullPolicy: OPENCLAW_K8S_IMAGE_PULL_POLICY,
      command: ["sh", "-lc", buildOpenClawK8sGatewayWaitScript()],
      env,
      envFrom: [
        {
          secretRef: {
            name: secretName,
          },
        },
      ],
      resources: {
        requests: {
          cpu: OPENCLAW_K8S_REQUEST_CPU,
          memory: OPENCLAW_K8S_REQUEST_MEMORY,
        },
        limits: {
          cpu: OPENCLAW_K8S_LIMIT_CPU,
          memory: OPENCLAW_K8S_LIMIT_MEMORY,
        },
      },
      securityContext: {
        runAsUser: 1000,
        runAsGroup: 1000,
        runAsNonRoot: true,
      },
      volumeMounts: [
        {
          name: "openclaw-data",
          mountPath: OPENCLAW_HOME_DIR,
        },
      ],
    },
    ...(normalizedProvider === KIE_PROVIDER
      ? [
          {
            name: "kie-claude-auth-proxy",
            image,
            imagePullPolicy: OPENCLAW_K8S_IMAGE_PULL_POLICY,
            command: ["node", "-e", buildKieClaudeAuthProxyRuntimeScript()],
            ports: [
              {
                name: "kie-claude",
                containerPort: KIE_CLAUDE_AUTH_PROXY_PORT,
              },
            ],
            securityContext: {
              runAsUser: 1000,
              runAsGroup: 1000,
              runAsNonRoot: true,
            },
          },
        ]
      : []),
  ];

  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: buildOpenClawK8sDeploymentName(deploymentId),
      labels,
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: labels,
      },
      template: {
        metadata: {
          labels,
        },
        spec: {
          hostname: buildOpenClawK8sHostname(deploymentId),
          initContainers: [
            {
              name: "openclaw-volume-prep",
              image,
              imagePullPolicy: OPENCLAW_K8S_IMAGE_PULL_POLICY,
              command: ["sh", "-lc", buildOpenClawK8sVolumePrepScript(configFingerprint)],
              securityContext: {
                runAsUser: 0,
                runAsGroup: 0,
              },
              volumeMounts: [
                {
                  name: "openclaw-data",
                  mountPath: OPENCLAW_HOME_DIR,
                },
              ],
            },
          ],
          containers,
          volumes: [
            {
              name: "openclaw-data",
              emptyDir: {},
            },
          ],
          affinity: {
            nodeAffinity: {
              requiredDuringSchedulingIgnoredDuringExecution: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: nodeExpressions,
                  },
                ],
              },
            },
            podAntiAffinity: {
              preferredDuringSchedulingIgnoredDuringExecution: [
                {
                  weight: 100,
                  podAffinityTerm: {
                    topologyKey: "kubernetes.io/hostname",
                    labelSelector: {
                      matchLabels: {
                        "app.kubernetes.io/name": "openclaw",
                      },
                    },
                  },
                },
              ],
            },
          },
          topologySpreadConstraints: [
            {
              maxSkew: 1,
              topologyKey: "kubernetes.io/hostname",
              whenUnsatisfiable: "ScheduleAnyway",
              labelSelector: {
                matchLabels: {
                  "app.kubernetes.io/name": "openclaw",
                },
              },
            },
          ],
          terminationGracePeriodSeconds: 30,
        },
      },
    },
  };
};

const upsertSecret = async (
  core: CoreV1Api,
  namespace: string,
  secret: V1Secret
): Promise<void> => {
  const name = secret.metadata?.name;
  if (!name) {
    throw new Error("Secret name is required");
  }

  try {
    const existing = await withRetryableK8sControlPlaneCall({
      operation: `secret.read:${name}`,
      fn: () => core.readNamespacedSecret({ name, namespace }),
    });
    secret.metadata = {
      ...(secret.metadata || {}),
      resourceVersion: existing.metadata?.resourceVersion,
    };
    await withRetryableK8sControlPlaneCall({
      operation: `secret.replace:${name}`,
      fn: () => core.replaceNamespacedSecret({ name, namespace, body: secret }),
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      await withRetryableK8sControlPlaneCall({
        operation: `secret.create:${name}`,
        fn: () => core.createNamespacedSecret({ namespace, body: secret }),
      });
      return;
    }
    throw error;
  }
};

const upsertDeployment = async (
  apps: AppsV1Api,
  namespace: string,
  deployment: V1Deployment
): Promise<void> => {
  const name = deployment.metadata?.name;
  if (!name) {
    throw new Error("Deployment name is required");
  }

  try {
    const existing = await withRetryableK8sControlPlaneCall({
      operation: `deployment.read:${name}`,
      fn: () => apps.readNamespacedDeployment({ name, namespace }),
    });
    deployment.metadata = {
      ...(deployment.metadata || {}),
      resourceVersion: existing.metadata?.resourceVersion,
    };
    await withRetryableK8sControlPlaneCall({
      operation: `deployment.replace:${name}`,
      fn: () =>
        apps.replaceNamespacedDeployment({
          name,
          namespace,
          body: deployment,
        }),
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      await withRetryableK8sControlPlaneCall({
        operation: `deployment.create:${name}`,
        fn: () => apps.createNamespacedDeployment({ namespace, body: deployment }),
      });
      return;
    }
    throw error;
  }
};

const getDeploymentPods = async (
  core: CoreV1Api,
  namespace: string,
  deploymentId: string
): Promise<V1Pod[]> => {
  const podList = await core.listNamespacedPod({
    namespace,
    labelSelector: `easyclaw/deployment-id=${deploymentId}`,
  });
  return [...(podList.items || [])].sort((left, right) =>
    String(normalizeDateString(right.metadata?.creationTimestamp) || "").localeCompare(
      String(normalizeDateString(left.metadata?.creationTimestamp) || "")
    )
  );
};

const getMostRecentPod = async (
  core: CoreV1Api,
  namespace: string,
  deploymentId: string
): Promise<V1Pod | null> => {
  const pods = await getDeploymentPods(core, namespace, deploymentId);
  return pods[0] || null;
};

const waitForPodRunning = async ({
  core,
  namespace,
  deploymentId,
  timeoutMs,
}: {
  core: CoreV1Api;
  namespace: string;
  deploymentId: string;
  timeoutMs: number;
}): Promise<PodIdentity> => {
  const deadline = Date.now() + timeoutMs;
  const deploymentName = buildOpenClawK8sDeploymentName(deploymentId);

  while (Date.now() < deadline) {
    let pod: V1Pod | null;
    try {
      pod = await getMostRecentPod(core, namespace, deploymentId);
    } catch (error) {
      if (isRetryableK8sTransportError(error)) {
        await sleep(1000);
        continue;
      }
      throw error;
    }

    if (!pod) {
      await sleep(1000);
      continue;
    }

    const podName = pod.metadata?.name;
    const container = pod.spec?.containers?.find(
      ({ name }) => name === "openclaw"
    );
    if (!podName || !container?.name) {
      await sleep(1000);
      continue;
    }

    const phase = pod.status?.phase;
    const waiting = pod.status?.containerStatuses?.[0]?.state?.waiting;
    const terminated = pod.status?.containerStatuses?.[0]?.state?.terminated;
    if (phase === "Running") {
      return {
        name: podName,
        namespace,
        containerName: container.name,
      };
    }

    if (waiting?.reason && /imagepull|backoff|crash/i.test(waiting.reason)) {
      throw new Error(
        `OpenClaw pod ${podName} is not healthy (${waiting.reason}: ${waiting.message || "no details"})`
      );
    }

    if (terminated) {
      throw new Error(
        `OpenClaw pod ${podName} terminated while starting (exit=${terminated.exitCode}, reason=${terminated.reason || "unknown"})`
      );
    }

    await sleep(1000);
  }

  throw new Error(
    `Timed out waiting for OpenClaw pod in deployment ${deploymentName} to start`
  );
};

const execInPod = async (
  exec: Exec,
  pod: PodIdentity,
  input: { cmd: string[]; timeoutMs?: number }
): Promise<ExecResult> =>
  await new Promise(async (resolve, reject) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const stdout = new Writable({
      write(chunk, _encoding, callback) {
        stdoutChunks.push(Buffer.from(chunk).toString("utf8"));
        callback();
      },
    });
    const stderr = new Writable({
      write(chunk, _encoding, callback) {
        stderrChunks.push(Buffer.from(chunk).toString("utf8"));
        callback();
      },
    });

    let status: V1Status | null = null;
    let finished = false;
    let ws: WebSocket | null = null;
    const timeout = setTimeout(() => {
      ws?.close();
      if (!finished) {
        finished = true;
        reject(
          new Error(
            `Pod exec timed out after ${input.timeoutMs}ms: ${input.cmd.join(" ")}`
          )
        );
      }
    }, input.timeoutMs || OPENCLAW_CLI_TIMEOUT_MS);
    timeout.unref();

    const finalize = () => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);

      const stdoutText = stdoutChunks.join("");
      const stderrText = stderrChunks.join("");
      const exitCode = extractExecExitCode(status);
      if (exitCode !== 0) {
        reject(
          new Error(
            `Pod exec failed (exit=${exitCode}): ${input.cmd.join(" ")}${
              `${stdoutText}${stderrText}`.trim()
                ? `\n${`${stdoutText}${stderrText}`.trim()}`
                : ""
            }`
          )
        );
        return;
      }

      resolve({
        stdout: stdoutText,
        stderr: stderrText,
        status,
      });
    };

    try {
      ws = await exec.exec(
        pod.namespace,
        pod.name,
        pod.containerName,
        input.cmd,
        stdout,
        stderr,
        null,
        false,
        (receivedStatus) => {
          status = receivedStatus;
        }
      );
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
      return;
    }

    ws.once("close", finalize);
    ws.once("error", (error: Error) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);
      reject(error);
    });
  });

const readPodLogs = async (
  core: CoreV1Api,
  pod: PodIdentity,
  tailLines: number
): Promise<string> =>
  await core.readNamespacedPodLog({
    name: pod.name,
    namespace: pod.namespace,
    container: pod.containerName,
    follow: false,
    previous: false,
    tailLines,
    timestamps: false,
  });

const ensureOpenClawWorkspaceMemoryFiles = async (
  exec: Exec,
  pod: PodIdentity
): Promise<void> => {
  await execInPod(exec, pod, {
    cmd: ["sh", "-lc", buildOpenClawWorkspaceMemorySeedScript()],
    timeoutMs: OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS,
  });
};

const resolveRequestedRuntimeModelInPod = async (
  exec: Exec,
  pod: PodIdentity,
  input: { model?: string; provider?: string }
): Promise<string | undefined> => {
  if (!input.model) {
    return undefined;
  }

  if (canBypassRuntimeCatalogLookup(input.model)) {
    return input.model;
  }

  const catalogResult = await execOpenClaw(
    exec,
    pod,
    ["models", "list", "--all", "--json"],
    OPENCLAW_CLI_TIMEOUT_MS,
    input.provider
  );
  const catalogKeys = parseModelKeysFromCatalog(
    `${catalogResult.stdout}\n${catalogResult.stderr}`
  );

  return (
    (catalogKeys.length > 0
      ? resolveModelFromRuntimeCatalog(input.model, catalogKeys)
      : input.model) ?? undefined
  );
};

const assertConfiguredRuntimeModelInPod = async (
  exec: Exec,
  pod: PodIdentity,
  input: { runtimeModel?: string; provider?: string }
): Promise<string | undefined> => {
  if (!input.runtimeModel) {
    return undefined;
  }

  const modelsStatusCommand = await execOpenClaw(
    exec,
    pod,
    ["models", "status", "--json"],
    OPENCLAW_CLI_TIMEOUT_MS,
    input.provider
  );
  const modelsStatus = parseOpenClawModelsStatus(
    `${modelsStatusCommand.stdout}\n${modelsStatusCommand.stderr}`
  );
  const configuredModel =
    modelsStatus.resolvedDefault?.trim() || modelsStatus.defaultModel?.trim();
  if (!configuredModel) {
    throw new Error(
      `OPENCLAW_MODEL_STATUS_MISSING_DEFAULT: requested=${input.runtimeModel}`
    );
  }
  if (configuredModel !== input.runtimeModel) {
    throw new Error(
      `OPENCLAW_MODEL_STATUS_MISMATCH: requested=${input.runtimeModel}, actual=${configuredModel}`
    );
  }
  const expectedAuthProvider = getModelAuthProviderId(input.runtimeModel);
  if (expectedAuthProvider) {
    const hasExpectedAuthProvider = (modelsStatus.auth?.providers || []).some(
      (providerStatus) => providerStatus.provider === expectedAuthProvider
    );
    if (!hasExpectedAuthProvider) {
      throw new Error(
        `OPENCLAW_AUTH_PROVIDER_MISSING: provider=${expectedAuthProvider}, model=${input.runtimeModel}`
      );
    }
    if (
      (modelsStatus.auth?.missingProvidersInUse || []).includes(
        expectedAuthProvider
      )
    ) {
      throw new Error(
        `OPENCLAW_AUTH_PROVIDER_UNUSABLE: provider=${expectedAuthProvider}, model=${input.runtimeModel}`
      );
    }
  }

  return configuredModel;
};

const isOpenClawK8sConfigFingerprintApplied = async (
  exec: Exec,
  pod: PodIdentity,
  configFingerprint: string
): Promise<boolean> => {
  const result = await execInPod(exec, pod, {
    cmd: [
      "sh",
      "-lc",
      [
        `FINGERPRINT_FILE=${shellEscape(OPENCLAW_K8S_CONFIG_FINGERPRINT_FILE)}`,
        `EXPECTED_FINGERPRINT=${shellEscape(configFingerprint)}`,
        'if [ -f "$FINGERPRINT_FILE" ] && [ "$(cat "$FINGERPRINT_FILE")" = "$EXPECTED_FINGERPRINT" ]; then',
        '  printf "true"',
        "else",
        '  printf "false"',
        "fi",
      ].join("\n"),
    ],
    timeoutMs: OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS,
  });

  return result.stdout.trim() === "true";
};

const injectRuntimeModelIdentityHint = async (
  exec: Exec,
  pod: PodIdentity,
  resolvedModel: string
): Promise<void> => {
  const note = composeRuntimeModelIdentityNote(resolvedModel);
  const noteBase64 = Buffer.from(note, "utf8").toString("base64");
  const script = [
    `NOTE="$(printf '%s' ${shellEscape(noteBase64)} | base64 -d)"`,
    "for file in /home/node/.openclaw/workspace/AGENTS.md /home/node/.openclaw/workspace/BOOTSTRAP.md; do",
    '  [ -f "$file" ] || continue',
    '  if grep -q "## Runtime model truth source" "$file"; then',
    "    continue",
    "  fi",
    '  printf "\\n%s\\n" "$NOTE" >> "$file"',
    "done",
  ].join("\n");

  await execInPod(exec, pod, {
    cmd: ["sh", "-lc", script],
    timeoutMs: OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS,
  });
};

const execOpenClaw = async (
  exec: Exec,
  pod: PodIdentity,
  args: string[],
  timeoutMs: number = OPENCLAW_CLI_TIMEOUT_MS,
  provider?: string
): Promise<ExecResult> =>
  await execInPod(exec, pod, {
    cmd: buildOpenClawK8sCliCommand(args, provider),
    timeoutMs,
  });

export const restartOpenClawGatewayInPod = async (
  exec: Exec,
  pod: PodIdentity
): Promise<void> => {
  await execInPod(exec, pod, {
    cmd: [
      "sh",
      "-lc",
      `pkill -f '[o]penclaw-gateway' || true; pkill -f 'openclaw [g]ateway' || true`,
    ],
    timeoutMs: OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS,
  });
};

export const configureOpenClawInPod = async (
  exec: Exec,
  pod: PodIdentity,
  input: {
    channel: DeployChannel;
    model?: string;
    provider?: string;
    configFingerprint: string;
  }
): Promise<string | undefined> => {
  const configDir = "/home/node/.openclaw";
  const agentDir = `${configDir}/agents/main/agent`;
  const ensureConfigFileOwnership = async (): Promise<void> => {
    await execInPod(exec, pod, {
      cmd: [
        "sh",
        "-lc",
        [
          `chown 1000:1000 ${shellEscape(`${configDir}/openclaw.json`)} ${shellEscape(
            `${configDir}/openclaw.json.bak`
          )} ${shellEscape(`${configDir}/openclaw.json.bak.1`)} ${shellEscape(
            `${configDir}/openclaw.json.bak.2`
          )} ${shellEscape(`${configDir}/openclaw.json.bak.3`)} 2>/dev/null || true`,
        ].join("\n"),
      ],
      timeoutMs: OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS,
    });
  };
  const normalizedProvider = input.provider?.trim().toLowerCase() || "openai";
  const execPodCommand = async (
    cmd: string[],
    timeoutMs: number
  ): Promise<ExecResult> =>
    await execInPod(exec, pod, {
      cmd,
      timeoutMs,
    });
  const execProviderOpenClaw = async (
    args: string[],
    timeoutMs: number = OPENCLAW_CLI_TIMEOUT_MS
  ): Promise<ExecResult> =>
    await execOpenClaw(exec, pod, args, timeoutMs, input.provider);

  await execPodCommand(
    ["mkdir", "-p", configDir, agentDir],
    OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS
  );
  await ensureOpenClawWorkspaceMemoryFiles(exec, pod);

  if (normalizedProvider === KIE_PROVIDER) {
    const runtimeModel = resolveKieRuntimeModelForK8s(input.model);
    const renderedConfig = buildRenderedOpenClawConfigForK8s({
      channel: input.channel,
      provider: normalizedProvider,
      resolvedModel: runtimeModel,
    });

    await execInPod(exec, pod, {
      cmd: [
        "sh",
        "-lc",
        buildRenderedOpenClawConfigWriteScript({
          renderedConfig,
          configFingerprint: input.configFingerprint,
        }),
      ],
      timeoutMs: OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS,
    });
    await ensureConfigFileOwnership();

    return runtimeModel;
  }

  await execProviderOpenClaw(["config", "set", "gateway.mode", GATEWAY_MODE]);
  await execProviderOpenClaw([
    "config",
    "set",
    "--strict-json",
    "gateway.controlUi.dangerouslyDisableDeviceAuth",
    "true",
  ]);
  await execProviderOpenClaw([
    "config",
    "set",
    "--strict-json",
    "gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback",
    "true",
  ]);
  if (input.channel === "telegram") {
    await execProviderOpenClaw([
      "config",
      "set",
      "--json",
      "channels.telegram.allowFrom",
      `["*"]`,
    ]);
    await execProviderOpenClaw([
      "config",
      "set",
      "channels.telegram.dmPolicy",
      "open",
    ]);
    await execPodCommand(
      ["rm", "-f", `${configDir}/credentials/telegram-pairing.json`],
      OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS
    );
  }

  if (input.channel === "discord") {
    await execProviderOpenClaw([
      "config",
      "set",
      "channels.discord.enabled",
      "true",
    ]);
    await execProviderOpenClaw([
      "config",
      "set",
      "--json",
      "channels.discord.allowFrom",
      `["*"]`,
    ]);
    await execProviderOpenClaw([
      "config",
      "set",
      "channels.discord.dmPolicy",
      "open",
    ]);
    await execProviderOpenClaw([
      "config",
      "set",
      "channels.discord.groupPolicy",
      "open",
    ]);
  }

  if (input.channel === "whatsapp") {
    await execProviderOpenClaw([
      "config",
      "set",
      "channels.whatsapp.enabled",
      "true",
    ]);
    await execProviderOpenClaw([
      "config",
      "set",
      "--json",
      "channels.whatsapp.allowFrom",
      `["*"]`,
    ]);
    await execProviderOpenClaw([
      "config",
      "set",
      "channels.whatsapp.dmPolicy",
      "open",
    ]);
    await execProviderOpenClaw([
      "config",
      "set",
      "channels.whatsapp.groupPolicy",
      "disabled",
    ]);
  }

  if (
    input.provider?.toLowerCase() === "openrouter" &&
    OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER
  ) {
    try {
      await execProviderOpenClaw(
        ["update", "--yes", "--no-restart"],
        OPENCLAW_UPDATE_TIMEOUT_MS
      );
    } catch (error: unknown) {
      dockerLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "OpenClaw update failed inside K8s runtime (continuing without update)"
      );
    }
  }

  const runtimeModel = await resolveRequestedRuntimeModelInPod(exec, pod, input);
  if (input.model) {
    if (!runtimeModel) {
      throw new Error(
        `MODEL_NOT_AVAILABLE: requested=${input.model}, strict=${
          isStrictModelFamilyModel(input.model) ? "true" : "false"
        }`
      );
    }

    await execProviderOpenClaw(["models", "set", runtimeModel]);
    await assertConfiguredRuntimeModelInPod(exec, pod, {
      runtimeModel,
      provider: input.provider,
    });
  }

  if (runtimeModel) {
    try {
      await injectRuntimeModelIdentityHint(exec, pod, runtimeModel);
    } catch (error) {
      dockerLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to inject runtime model identity hint into K8s runtime"
      );
    }
  }

  await execInPod(exec, pod, {
    cmd: [
      "sh",
      "-lc",
      [
        `printf '%s' ${shellEscape(input.configFingerprint)} > ${shellEscape(
          OPENCLAW_K8S_CONFIG_FINGERPRINT_FILE
        )}`,
        `touch ${shellEscape(OPENCLAW_K8S_CONFIG_READY_FILE)}`,
      ].join("\n"),
    ],
    timeoutMs: OPENCLAW_K8S_QUICK_EXEC_TIMEOUT_MS,
  });
  await ensureConfigFileOwnership();

  return runtimeModel;
};

const readOpenClawHealth = async (
  exec: Exec,
  pod: PodIdentity
): Promise<OpenClawHealthOutput> => {
  const result = await execOpenClaw(
    exec,
    pod,
    ["health", "--json"],
    OPENCLAW_CHANNEL_STATUS_TIMEOUT_MS
  );

  return parseOpenClawHealth(`${result.stdout}\n${result.stderr}`);
};

const readOpenClawChannelStatus = async (
  exec: Exec,
  pod: PodIdentity,
  channel: DeployChannel
): Promise<OpenClawChannelStatus> => {
  const result = await execOpenClaw(
    exec,
    pod,
    ["channels", "status", "--json"],
    OPENCLAW_CHANNEL_STATUS_TIMEOUT_MS
  );

  return parseOpenClawChannelStatus(`${result.stdout}\n${result.stderr}`, channel);
};

export const waitForOpenClawReady = async ({
  core,
  exec,
  pod,
  channel,
  deploymentId,
}: {
  core: CoreV1Api;
  exec: Exec;
  pod: PodIdentity;
  channel: DeployChannel;
  deploymentId: string;
}): Promise<void> => {
  const log = deployLogger(deploymentId);
  const deadline = Date.now() + READY_WAIT_MS;
  let readySince: number | null = null;
  let lastHealth: OpenClawHealthOutput | null = null;
  let lastChannelStatus: OpenClawChannelStatus | null = null;

  while (Date.now() < deadline) {
    let inspectedPod: V1Pod;
    try {
      inspectedPod = await core.readNamespacedPod({
        name: pod.name,
        namespace: pod.namespace,
      });
    } catch (error) {
      if (isRetryableK8sTransportError(error)) {
        readySince = null;
        log.debug(
          {
            channel,
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to inspect K8s pod during readiness check (waiting)"
        );
        await sleep(2000);
        continue;
      }
      throw error;
    }

    const phase = inspectedPod.status?.phase;
    if (phase !== "Running") {
      const containerStatus = inspectedPod.status?.containerStatuses?.[0];
      const terminated = containerStatus?.state?.terminated;
      const waiting = containerStatus?.state?.waiting;
      if (terminated) {
        const recentLogs = await readPodLogs(core, pod, 120).catch(() => "");
        throw new Error(
          `OpenClaw pod exited while waiting for readiness (status=${phase || "unknown"}, exit=${terminated.exitCode}). ${recentLogs}`
        );
      }
      if (waiting?.reason && /backoff|crash|imagepull/i.test(waiting.reason)) {
        throw new Error(
          `OpenClaw pod is not healthy while waiting for readiness (${waiting.reason}: ${waiting.message || "no details"})`
        );
      }
      await sleep(2000);
      continue;
    }

    let channelReady = false;
    try {
      lastHealth = await readOpenClawHealth(exec, pod);
      channelReady = isOpenClawHealthReadyForChannel(lastHealth, channel);
    } catch (error) {
      readySince = null;
      log.debug(
        {
          channel,
          error: describeUnknownError(error),
        },
        "Failed to read health status from K8s runtime (waiting)"
      );
      await sleep(2000);
      continue;
    }

    if (channel === "discord") {
      try {
        lastChannelStatus = await readOpenClawChannelStatus(exec, pod, channel);
      } catch (error) {
        readySince = null;
        log.debug(
          {
            channel,
            error: describeUnknownError(error),
          },
          "Failed to read channels status from K8s runtime (waiting)"
        );
        await sleep(2000);
        continue;
      }
    } else {
      lastChannelStatus = null;
    }

    const recentLogs = await readPodLogs(core, pod, 120).catch(() => "");
    const channelHealth = lastHealth?.channels?.[channel];
    if (
      !channelReady &&
      channel === "whatsapp" &&
      channelHealth?.linked === true &&
      !channelHealth.lastError &&
      isWhatsAppRuntimeReadyFromLogs(recentLogs)
    ) {
      channelReady = true;
    }
    if (recentLogs.includes("Unknown model:")) {
      throw new Error(
        `OpenClaw reported unknown model during readiness check. Logs:\n${recentLogs.slice(-1200)}`
      );
    }
    if (
      channel === "telegram" &&
      channelHealth &&
      isTelegramUnauthorizedSignal(
        channelHealth.lastError || channelHealth.probe?.error || null,
        channelHealth.probe?.status ?? null
      )
    ) {
      throw buildDeploymentError(
        TELEGRAM_UNAUTHORIZED_ERROR_CODE,
        `telegram channel unauthorized during readiness check: ${
          channelHealth.lastError ||
          channelHealth.probe?.error ||
          `probe status ${channelHealth.probe?.status ?? "unknown"}`
        }`
      );
    }

    if (
      channel === "whatsapp" &&
      channelHealth &&
      isWhatsAppUnauthorizedSignal({
        lastError: channelHealth.lastError || channelHealth.probe?.error || null,
        probeStatus: channelHealth.probe?.status ?? null,
        logs: recentLogs,
      })
    ) {
      throw buildDeploymentError(
        WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE,
        `whatsapp session unauthorized during readiness check: ${
          channelHealth.lastError ||
          channelHealth.probe?.error ||
          "runtime reported 401/connection failure"
        }`
      );
    }

    if (
      channel === "discord" &&
      lastChannelStatus?.messageContentIntent?.toLowerCase() === "disabled"
    ) {
      throw buildDeploymentError(
        DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE,
        "Discord Message Content Intent is disabled. Enable it in Discord Developer Portal (Bot -> Privileged Gateway Intents) before deploying."
      );
    }

    if (channelReady) {
      if (readySince === null) {
        readySince = Date.now();
      }
      if (Date.now() - readySince >= CHANNEL_READY_STABILITY_MS) {
        return;
      }
    } else {
      readySince = null;
    }

    await sleep(2000);
  }

  const logs = await readPodLogs(core, pod, 200).catch(() => "");
  const whatsappHealth = lastHealth?.channels?.whatsapp;
  if (
    channel === "whatsapp" &&
    whatsappHealth &&
    isWhatsAppUnauthorizedSignal({
      lastError: whatsappHealth.lastError || whatsappHealth.probe?.error || null,
      probeStatus: whatsappHealth.probe?.status ?? null,
      logs,
    })
  ) {
    throw buildDeploymentError(
      WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE,
      `whatsapp session unauthorized while waiting for readiness: ${
        whatsappHealth.lastError ||
        whatsappHealth.probe?.error ||
        "runtime reported 401/connection failure"
      }`
    );
  }
  throw new Error(
    `OpenClaw did not become ready within ${READY_WAIT_MS}ms. Last ${channel} health: ${JSON.stringify(
      lastHealth
    )}. Last logs:\n${logs}`
  );
};

export const runKieLivePreflightIfNeeded = async ({
  deploymentId,
  provider,
  resolvedModel,
  exec,
  pod,
}: {
  deploymentId: string;
  provider: string;
  resolvedModel?: string | null;
  exec: Exec;
  pod: PodIdentity;
}): Promise<void> => {
  if (provider !== KIE_PROVIDER) {
    return;
  }

  const normalizedResolvedModel = resolvedModel?.trim();
  if (!normalizedResolvedModel) {
    throw buildDeploymentError(
      KIE_MODEL_PRECHECK_FAILED_ERROR_CODE,
      "resolved model missing after KIE runtime configuration"
    );
  }

  const log = deployLogger(deploymentId);
  if (KIE_K8S_GATEWAY_SMOKE_MODELS.has(normalizedResolvedModel)) {
    const creditResult = await performKiePodLocalCreditCheck({
      resolvedModel: normalizedResolvedModel,
      exec,
      pod,
    });
    const assistantText = await performKieGatewaySmokeInPod({
      resolvedModel: normalizedResolvedModel,
      exec,
      pod,
    });

    log.info(
      {
        provider,
        resolvedModel: normalizedResolvedModel,
        podName: pod.name,
        credits: creditResult.credits,
        responseChars: assistantText.length,
      },
      "KIE live preflight passed"
    );
    return;
  }

  const result = await performKiePodLocalPreflight({
    resolvedModel: normalizedResolvedModel,
    exec,
    pod,
  });

  log.info(
    {
      provider,
      resolvedModel: normalizedResolvedModel,
      podName: pod.name,
      credits: result.credits,
      responseChars: result.text.length,
    },
    "KIE live preflight passed"
  );
};

export const inspectOpenClawK8sRuntime = async (
  deploymentId: string,
  namespace: string = resolveOpenClawK8sNamespace()
): Promise<OpenClawK8sRuntimeStatus> => {
  const { core, apps } = createK8sClients();
  const name = buildOpenClawK8sDeploymentName(deploymentId);

  try {
    await apps.readNamespacedDeployment({ name, namespace });
  } catch (error) {
    if (isNotFoundError(error)) {
      return {
        exists: false,
        name,
        namespace,
      };
    }
    throw error;
  }

  const pod = await getMostRecentPod(core, namespace, deploymentId);
  const podName = pod?.metadata?.name;
  const containerStatus = pod?.status?.containerStatuses?.[0];
  const terminated = containerStatus?.state?.terminated;

  return {
    exists: true,
    name,
    namespace,
    podName,
    id: pod?.metadata?.uid,
    status: pod?.status?.phase || "unknown",
    running: pod?.status?.phase === "Running",
    exitCode: terminated?.exitCode,
    startedAt: normalizeDateString(containerStatus?.state?.running?.startedAt),
    finishedAt: normalizeDateString(terminated?.finishedAt),
  };
};

export const resolveOpenClawK8sWhatsAppLoginTarget = async (
  deploymentId: string,
  namespace: string = resolveOpenClawK8sNamespace()
): Promise<OpenClawK8sWhatsAppLoginTarget> => {
  const { core } = createK8sClients();
  const pod = await getMostRecentPod(core, namespace, deploymentId);
  const podName = pod?.metadata?.name?.trim();
  const phase = pod?.status?.phase;
  const containerName =
    pod?.spec?.containers?.find(({ name }) => name === "openclaw")?.name || null;

  if (!podName || !containerName || phase !== "Running") {
    throw new Error(
      `OpenClaw pod is not ready for WhatsApp login (deployment=${deploymentId}, pod=${podName || "missing"}, phase=${phase || "unknown"})`
    );
  }

  return {
    namespace,
    pod: podName,
    container: containerName,
    command: [...WHATSAPP_LOGIN_COMMAND],
  };
};

export const resolveOpenClawK8sDashboardTarget = async (
  deploymentId: string,
  namespace: string = resolveOpenClawK8sNamespace()
): Promise<OpenClawK8sDashboardTarget> => {
  const { core } = createK8sClients();
  const pod = await getMostRecentPod(core, namespace, deploymentId);
  const podName = pod?.metadata?.name?.trim();
  const phase = pod?.status?.phase;
  const containerName =
    pod?.spec?.containers?.find(({ name }) => name === "openclaw")?.name || null;

  if (!podName || !containerName || phase !== "Running") {
    throw new Error(
      `OpenClaw pod is not ready for Gateway Dashboard (deployment=${deploymentId}, pod=${podName || "missing"}, phase=${phase || "unknown"})`
    );
  }

  return {
    namespace,
    deployment: buildOpenClawK8sDeploymentName(deploymentId),
    pod: podName,
    container: containerName,
    gatewayPort: OPENCLAW_GATEWAY_PORT,
  };
};

export const activateOpenClawWhatsAppRuntime = async ({
  deploymentId,
  namespace,
  pod,
  container,
}: {
  deploymentId: string;
  namespace: string;
  pod: string;
  container: string;
}): Promise<void> => {
  const { core, exec } = createK8sClients();
  const podIdentity: PodIdentity = {
    name: pod,
    namespace,
    containerName: container,
  };

  await restartOpenClawGatewayInPod(exec, podIdentity);
  await waitForOpenClawReady({
    core,
    exec,
    pod: podIdentity,
    channel: "whatsapp",
    deploymentId,
  });
};

export const createOpenClawK8sRuntime = async ({
  channel,
  channelToken,
  model,
  deploymentId,
  namespace,
  userId,
  tier,
}: CreateK8sRuntimeInput): Promise<CreateContainerResult> => {
  const resolvedNamespace =
    normalizeOptionalString(namespace) || resolveOpenClawK8sNamespace();
  const log = deployLogger(deploymentId);
  const normalizedTier = tier === "pro" ? "pro" : "starter";
  const selectedModel = model?.trim();
  const envDefaultModel = process.env.OPENCLAW_MODEL?.trim();
  const requiredProvider = inferRequiredProvider(selectedModel || envDefaultModel);

  let account: {
    id: string;
    apiKey: string;
    provider: string;
    model?: string;
    thingLevel?: string;
  } | undefined;

  if (userId) {
    let poolAccount: Awaited<ReturnType<typeof assignFreshAccount>>;
    try {
      poolAccount = await assignFreshAccount(
        userId,
        normalizedTier,
        requiredProvider
      );
    } catch (error) {
      if (requiredProvider && isNoAvailablePoolAccountError(error)) {
        const modelForError = selectedModel || envDefaultModel || "<unset>";
        throw new Error(
          `NO_AVAILABLE_ACCOUNT_FOR_PROVIDER: tier=${normalizedTier}, provider=${requiredProvider}, model=${modelForError}`
        );
      }
      throw error;
    }

    account = {
      id: poolAccount.id,
      apiKey: poolAccount.apiKey,
      provider: poolAccount.provider,
      model: poolAccount.model,
      thingLevel: poolAccount.thingLevel,
    };
  }

  if (!account?.apiKey) {
    throw new Error(`NO_AVAILABLE_ACCOUNT: tier=${normalizedTier}`);
  }

  const provider = account.provider?.toLowerCase() || "openai";
  if (requiredProvider && provider !== requiredProvider) {
    throw new Error(
      `ACCOUNT_PROVIDER_MISMATCH: required=${requiredProvider}, actual=${provider}, tier=${normalizedTier}`
    );
  }

  const accountModel = account.model?.trim();
  const sourceModel = selectedModel || accountModel || envDefaultModel;
  const openclawModel = resolveOpenClawModel(sourceModel, provider);
  assertModelProviderConsistency(openclawModel, provider);
  const desiredRuntimeModel =
    provider === KIE_PROVIDER
      ? resolveKieRuntimeModelForK8s(openclawModel)
      : openclawModel;

  const gatewayToken = deploymentId || uuidv4();
  const secretName = buildOpenClawK8sSecretName(deploymentId);
  const deploymentName = buildOpenClawK8sDeploymentName(deploymentId);
  const { core, apps, exec } = createK8sClients();

  const secret = buildOpenClawK8sSecretManifest({
    deploymentId,
    channel,
    channelToken,
    gatewayToken,
    apiKey: account.apiKey,
    provider,
  });
  const configFingerprint = buildOpenClawK8sConfigFingerprint({
    channel,
    provider,
    model: desiredRuntimeModel,
  });
  const deployment = buildOpenClawK8sDeploymentManifest({
    deploymentId,
    image: IMAGE_NAME,
    secretName,
    provider,
    configFingerprint,
    modelEnv:
      desiredRuntimeModel && provider !== "openrouter" && provider !== "kie"
        ? desiredRuntimeModel
        : null,
  });

  log.info(
    {
      deploymentId,
      namespace: resolvedNamespace,
      deploymentName,
      model: desiredRuntimeModel || "<unset>",
      provider,
    },
    "Creating OpenClaw K8s runtime"
  );

  await upsertSecret(core, resolvedNamespace, secret);
  await upsertDeployment(apps, resolvedNamespace, deployment);

  const pod = await waitForPodRunning({
    core,
    namespace: resolvedNamespace,
    deploymentId,
    timeoutMs: READY_WAIT_MS,
  });

  let configuredRuntimeModel: string | undefined;
  if (
    await isOpenClawK8sConfigFingerprintApplied(exec, pod, configFingerprint)
  ) {
    configuredRuntimeModel =
      provider === KIE_PROVIDER
        ? desiredRuntimeModel
        : await assertConfiguredRuntimeModelInPod(exec, pod, {
            runtimeModel: await resolveRequestedRuntimeModelInPod(exec, pod, {
              model: desiredRuntimeModel,
              provider,
            }),
            provider,
          });
  } else {
    configuredRuntimeModel = await configureOpenClawInPod(exec, pod, {
      channel,
      model: desiredRuntimeModel,
      provider,
      configFingerprint,
    });
  }

  if (channel !== "whatsapp") {
    await waitForOpenClawReady({
      core,
      exec,
      pod,
      channel,
      deploymentId,
    });
  }

  const resolvedRuntimeModel = configuredRuntimeModel || desiredRuntimeModel;
  await runKieLivePreflightIfNeeded({
    deploymentId,
    provider,
    resolvedModel: resolvedRuntimeModel,
    exec,
    pod,
  });

  log.info(
    {
      namespace: resolvedNamespace,
      podName: pod.name,
      accountPoolId: account.id,
      provider,
      resolvedModel: resolvedRuntimeModel || "<unset>",
    },
    "OpenClaw K8s runtime deployment completed successfully"
  );

  return {
    containerId: pod.name,
    accountPoolId: account.id,
    provider,
    requestedModel: selectedModel,
    resolvedModel: resolvedRuntimeModel,
  };
};

function getApiKeyEnvVar(provider: string): string {
  const mapping: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
    kie: "KIE_API_KEY",
  };
  return mapping[provider.toLowerCase()] || `${provider.toUpperCase()}_API_KEY`;
}

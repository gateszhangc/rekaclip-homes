import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/verify.js";
import {
  createDeployment,
  DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE,
  findActiveDeploymentByUserAndChannelToken,
  findReusableWhatsAppDeploymentBySubscriptionOrder,
  getDeployment,
  runDeployment,
  updateDeploymentStatus,
} from "../services/deploy.js";
import {
  NO_AVAILABLE_NODE_ERROR_CODE,
  WHATSAPP_K8S_ONLY_ERROR_CODE,
} from "../services/docker.js";
import { resolveDefaultOpenClawRuntimeState, resolveOpenClawRuntimeStateForDeployment } from "../services/runtime.js";
import {
  cancelCurrentDeploymentWhatsAppLogin,
  getDeploymentWhatsAppLoginSnapshot,
  restartDeploymentWhatsAppLogin,
  startOrReuseDeploymentWhatsAppLogin,
} from "../services/whatsapp-login/index.js";
import {
  getDeploymentOpenClawDashboardSnapshot,
  startOrReuseDeploymentOpenClawDashboard,
  stopDeploymentOpenClawDashboard,
} from "../services/openclaw-dashboard/index.js";
import {
  resolveOpenClawK8sDashboardTarget,
  resolveOpenClawK8sWhatsAppLoginTarget,
  WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE,
} from "../services/k8s.js";
import { logger, deployLogger } from "../utils/logger.js";

const router = Router();
const deployChannelSchema = z.enum(["telegram", "discord", "whatsapp"]);
const tierSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.toLowerCase() : value),
  z.enum(["starter", "pro"])
);

const deploySchema = z.object({
  channel: z.string().optional(),
  channel_token: z.string().trim().min(1).optional(),
  telegram_token: z.string().trim().min(1).optional(),
  model: z.string().optional(),
  tier: tierSchema.optional(),
  subscription_order_no: z.string().trim().min(1).optional(),
});

type SubscriptionTier = "starter" | "pro";
type DeploymentErrorCode =
  | "DEPLOYMENT_SEAT_UNAVAILABLE"
  | "NO_AVAILABLE_NODE"
  | "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER"
  | "DATABASE_UNAVAILABLE"
  | "SUBSCRIPTION_REQUIRED"
  | "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED"
  | "TELEGRAM_UNAUTHORIZED"
  | "WHATSAPP_SESSION_UNAUTHORIZED"
  | "KIE_CREDIT_EXHAUSTED"
  | "KIE_UPSTREAM_UNAVAILABLE"
  | "KIE_MODEL_PRECHECK_FAILED"
  | "WHATSAPP_K8S_ONLY";

const DEPLOYMENT_SEAT_UNAVAILABLE_MESSAGE =
  "Another deployment is already using your remaining active seat. Please wait for it to finish or stop it before deploying again.";
const NO_AVAILABLE_NODE_MESSAGE =
  "No available node right now. Please try again later.";
const WHATSAPP_K8S_ONLY_MESSAGE =
  "WhatsApp deployments currently require the k8s runtime.";
const GATEWAY_DASHBOARD_K8S_ONLY_MESSAGE =
  "Gateway Dashboard fallback currently requires the k8s runtime.";

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

function parseSubscriptionTier(
  raw: string | string[] | undefined
): SubscriptionTier | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  const parsed = tierSchema.safeParse(raw);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}

function parseSubscriptionOrderNo(
  raw: string | string[] | undefined
): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  const value = raw.trim();
  return value || undefined;
}

export function inferDeploymentErrorCode(
  raw?: string | null
): DeploymentErrorCode | null {
  const normalized = (raw || "").toUpperCase();
  if (normalized.includes("NO_AVAILABLE_ACCOUNT_FOR_PROVIDER")) {
    return "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER";
  }
  if (normalized.includes(DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE)) {
    return DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE;
  }
  if (normalized.includes(NO_AVAILABLE_NODE_ERROR_CODE)) {
    return NO_AVAILABLE_NODE_ERROR_CODE;
  }
  if (normalized.includes("SUBSCRIPTION_REQUIRED")) {
    return "SUBSCRIPTION_REQUIRED";
  }
  if (normalized.includes("DISCORD_MESSAGE_CONTENT_INTENT_DISABLED")) {
    return "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED";
  }
  if (normalized.includes("TELEGRAM_UNAUTHORIZED")) {
    return "TELEGRAM_UNAUTHORIZED";
  }
  if (normalized.includes(WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE)) {
    return WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE;
  }
  if (normalized.includes("KIE_CREDIT_EXHAUSTED")) {
    return "KIE_CREDIT_EXHAUSTED";
  }
  if (normalized.includes("KIE_UPSTREAM_UNAVAILABLE")) {
    return "KIE_UPSTREAM_UNAVAILABLE";
  }
  if (normalized.includes("KIE_MODEL_PRECHECK_FAILED")) {
    return "KIE_MODEL_PRECHECK_FAILED";
  }
  if (normalized.includes(WHATSAPP_K8S_ONLY_ERROR_CODE)) {
    return WHATSAPP_K8S_ONLY_ERROR_CODE;
  }
  if (
    normalized.includes("CONNECT_TIMEOUT") ||
    normalized.includes("CONNECTION TERMINATED") ||
    normalized.includes("CONNECTION_TIMEOUT") ||
    normalized.includes("ETIMEDOUT") ||
    normalized.includes("ECONNREFUSED")
  ) {
    return "DATABASE_UNAVAILABLE";
  }
  return null;
}

export type NormalizedDeployRequest = {
  channel: z.infer<typeof deployChannelSchema>;
  channelToken?: string;
  model?: string;
  tier?: SubscriptionTier;
  subscriptionOrderNo?: string;
};

export function normalizeDeployRequestPayload(
  body: unknown
): NormalizedDeployRequest {
  const parsed = deploySchema.parse(body);
  const inferredChannel =
    parsed.channel ||
    (parsed.telegram_token ? "telegram" : undefined);
  const channelParsed = deployChannelSchema.safeParse(inferredChannel);
  if (!channelParsed.success) {
    throw new Error(`UNSUPPORTED_CHANNEL: ${String(parsed.channel || "") || "missing"}`);
  }

  const channelToken = (parsed.channel_token || parsed.telegram_token || "").trim();
  if (channelParsed.data !== "whatsapp" && !channelToken) {
    throw new Error("MISSING_CHANNEL_TOKEN");
  }

  return {
    channel: channelParsed.data,
    channelToken: channelToken || undefined,
    model: parsed.model,
    tier: parsed.tier,
    subscriptionOrderNo: parsed.subscription_order_no,
  };
}

export const isDeploymentOwnedByUser = (
  deployment: { user_id?: unknown } | null | undefined,
  userId: string
): boolean => deployment?.user_id === userId;

const buildDeploymentResponse = async (
  deploymentId: string,
  fallback: {
    status: string;
    channel: z.infer<typeof deployChannelSchema>;
    model?: string;
    reused?: boolean;
  }
) => {
  const deployment = await getDeployment(deploymentId);
  return {
    deployment_id: deploymentId,
    status: deployment?.status || fallback.status,
    channel_type: deployment?.channel_type || fallback.channel,
    requested_model: deployment?.requested_model || fallback.model || null,
    resolved_model: deployment?.resolved_model || null,
    requestedModel: deployment?.requested_model || fallback.model || null,
    resolvedModel: deployment?.resolved_model || null,
    ...(fallback.reused ? { reused: true } : {}),
  };
};

const resolveDeploymentWhatsAppLoginTarget = async ({
  deploymentId,
}: {
  deploymentId: string;
}) => {
  const runtime = await resolveOpenClawRuntimeStateForDeployment(
    deploymentId,
    null
  );
  if (runtime.provider !== "k8s") {
    return {
      error: {
        status: 400,
        body: {
          error: WHATSAPP_K8S_ONLY_MESSAGE,
          error_code: WHATSAPP_K8S_ONLY_ERROR_CODE,
          errorCode: WHATSAPP_K8S_ONLY_ERROR_CODE,
        },
      },
      target: null,
    };
  }

  const loginTarget = await resolveOpenClawK8sWhatsAppLoginTarget(
    deploymentId,
    runtime.k8sNamespace || undefined
  );

  return {
    error: null,
    target: {
      namespace: loginTarget.namespace,
      pod: loginTarget.pod,
      container: loginTarget.container,
    },
  };
};

const resolveDeploymentOpenClawDashboardTarget = async ({
  deploymentId,
}: {
  deploymentId: string;
}) => {
  const runtime = await resolveOpenClawRuntimeStateForDeployment(
    deploymentId,
    null
  );
  if (runtime.provider !== "k8s") {
    return {
      error: {
        status: 400,
        body: {
          error: GATEWAY_DASHBOARD_K8S_ONLY_MESSAGE,
          error_code: WHATSAPP_K8S_ONLY_ERROR_CODE,
          errorCode: WHATSAPP_K8S_ONLY_ERROR_CODE,
        },
      },
      target: null,
    };
  }

  const dashboardTarget = await resolveOpenClawK8sDashboardTarget(
    deploymentId,
    runtime.k8sNamespace || undefined
  );

  return {
    error: null,
    target: dashboardTarget,
  };
};

const buildDashboardProxyBody = (req: any): BodyInit | undefined => {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  if (req.body === undefined || req.body === null) {
    return undefined;
  }

  if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
    return req.body;
  }

  if (req.body instanceof Uint8Array) {
    return req.body;
  }

  return JSON.stringify(req.body);
};

const buildDashboardProxyHeaders = (
  req: any,
  localPort: number
): Headers => {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }

    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === "host" ||
      normalizedKey === "connection" ||
      normalizedKey === "content-length" ||
      normalizedKey === "origin" ||
      normalizedKey === "referer"
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(key, entry);
      }
      continue;
    }

    headers.set(key, String(value));
  }

  headers.set("host", `127.0.0.1:${localPort}`);
  return headers;
};

const proxyOpenClawDashboardRequest = async (
  req: any,
  res: any,
  deploymentId: string
) => {
  const log = deployLogger(deploymentId);

  try {
    const snapshot = getDeploymentOpenClawDashboardSnapshot(deploymentId);
    if (
      !snapshot ||
      snapshot.status !== "ready" ||
      !snapshot.localPort
    ) {
      return res.status(409).json({
        error: "Gateway Dashboard session is not ready",
      });
    }

    const rawPath = req.params[0] ? `/${req.params[0]}` : "/";
    const queryIndex = req.originalUrl.indexOf("?");
    const search = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
    const upstreamResponse = await fetch(
      `http://127.0.0.1:${snapshot.localPort}${rawPath}${search}`,
      {
        method: req.method,
        headers: buildDashboardProxyHeaders(req, snapshot.localPort),
        body: buildDashboardProxyBody(req),
      }
    );

    res.status(upstreamResponse.status);
    for (const [key, value] of upstreamResponse.headers.entries()) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey === "connection" ||
        normalizedKey === "transfer-encoding"
      ) {
        continue;
      }
      res.setHeader(key, value);
    }

    if (req.method === "HEAD") {
      return res.end();
    }

    const payload = Buffer.from(await upstreamResponse.arrayBuffer());
    return res.send(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to proxy Gateway Dashboard request";
    log.error({ error: message }, "Gateway Dashboard proxy request failed");
    return res.status(502).json({ error: message });
  }
};

router.post("/", requireAuth, async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const parsed = normalizeDeployRequestPayload(req.body);
    const userId = req.auth?.userId || "test-user";
    const tierFromHeader = parseSubscriptionTier(req.headers["x-subscription-tier"]);
    const subscriptionTier = parsed.tier || tierFromHeader;
    const orderNoFromHeader = parseSubscriptionOrderNo(
      req.headers["x-subscription-order-no"]
    );
    const subscriptionOrderNo = parsed.subscriptionOrderNo || orderNoFromHeader;

    if (!subscriptionTier || !subscriptionOrderNo) {
      return res.status(403).json({
        error: "SUBSCRIPTION_REQUIRED",
        error_code: "SUBSCRIPTION_REQUIRED",
        errorCode: "SUBSCRIPTION_REQUIRED",
      });
    }

    if (parsed.channel === "whatsapp") {
      const runtime = await resolveDefaultOpenClawRuntimeState();
      if (runtime.provider !== "k8s") {
        return res.status(400).json({
          error: WHATSAPP_K8S_ONLY_MESSAGE,
          error_code: WHATSAPP_K8S_ONLY_ERROR_CODE,
          errorCode: WHATSAPP_K8S_ONLY_ERROR_CODE,
        });
      }
    }

    const existingDeployment =
      parsed.channel === "whatsapp"
        ? await findReusableWhatsAppDeploymentBySubscriptionOrder({
            userId,
            subscriptionOrderNo,
          })
        : await findActiveDeploymentByUserAndChannelToken({
            userId,
            channel: parsed.channel,
            channelToken: parsed.channelToken || "",
          });
    if (existingDeployment) {
      return res.json(
        await buildDeploymentResponse(existingDeployment.id, {
          status: existingDeployment.status,
          channel: parsed.channel,
          model: parsed.model,
          reused: true,
        })
      );
    }

    logger.info(
      {
        requestId,
        userId,
        channel: parsed.channel,
        model: parsed.model,
        tier: subscriptionTier,
        subscriptionOrderNo,
      },
      "Deployment request received"
    );
    let deploymentId: string;
    try {
      deploymentId = await createDeployment({
        userId,
        channel: parsed.channel,
        channelToken: parsed.channelToken,
        requestedModel: parsed.model,
        subscriptionOrderNo,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE
      ) {
        const concurrentDeployment =
          parsed.channel === "whatsapp"
            ? await findReusableWhatsAppDeploymentBySubscriptionOrder({
                userId,
                subscriptionOrderNo,
              })
            : await findActiveDeploymentByUserAndChannelToken({
                userId,
                channel: parsed.channel,
                channelToken: parsed.channelToken || "",
              });
        if (concurrentDeployment) {
          return res.json(
            await buildDeploymentResponse(concurrentDeployment.id, {
              status: concurrentDeployment.status,
              channel: parsed.channel,
              model: parsed.model,
              reused: true,
            })
          );
        }

        return res.status(409).json({
          error: DEPLOYMENT_SEAT_UNAVAILABLE_MESSAGE,
          error_code: DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE,
          errorCode: DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE,
        });
      }
      if (error instanceof Error && error.message === NO_AVAILABLE_NODE_ERROR_CODE) {
        return res.status(503).json({
          error: NO_AVAILABLE_NODE_MESSAGE,
          error_code: NO_AVAILABLE_NODE_ERROR_CODE,
          errorCode: NO_AVAILABLE_NODE_ERROR_CODE,
        });
      }
      throw error;
    }

    logger.info({ requestId, deploymentId }, "Deployment created, starting async deployment");

    setImmediate(async () => {
      const log = deployLogger(deploymentId);
      try {
        log.info("Async deployment started");
        await runDeployment(deploymentId, parsed.model, subscriptionTier);
        log.info("Async deployment completed");
      } catch (error) {
        const errorMessage = describeUnknownError(error);
        log.error({ error: errorMessage, stack: error instanceof Error ? error.stack : undefined }, "Deployment failed");
        await updateDeploymentStatus(deploymentId, "failed", errorMessage);
      }
    });

    res.json({
      deployment_id: deploymentId,
      status: "provisioning",
      channel_type: parsed.channel,
      requested_model: parsed.model || null,
      resolved_model: null,
      requestedModel: parsed.model || null,
      resolvedModel: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
    if (message.toUpperCase().includes(DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE)) {
      return res.status(409).json({
        error: DEPLOYMENT_SEAT_UNAVAILABLE_MESSAGE,
        error_code: DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE,
        errorCode: DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE,
      });
    }
    if (message.toUpperCase().includes(WHATSAPP_K8S_ONLY_ERROR_CODE)) {
      return res.status(400).json({
        error: WHATSAPP_K8S_ONLY_MESSAGE,
        error_code: WHATSAPP_K8S_ONLY_ERROR_CODE,
        errorCode: WHATSAPP_K8S_ONLY_ERROR_CODE,
      });
    }
    if (message.toUpperCase().includes("SUBSCRIPTION_REQUIRED")) {
      return res.status(403).json({
        error: "SUBSCRIPTION_REQUIRED",
        error_code: "SUBSCRIPTION_REQUIRED",
        errorCode: "SUBSCRIPTION_REQUIRED",
      });
    }
    if (message.toUpperCase().includes(NO_AVAILABLE_NODE_ERROR_CODE)) {
      return res.status(503).json({
        error: NO_AVAILABLE_NODE_MESSAGE,
        error_code: NO_AVAILABLE_NODE_ERROR_CODE,
        errorCode: NO_AVAILABLE_NODE_ERROR_CODE,
      });
    }

    const inferredCode = inferDeploymentErrorCode(message);
    if (inferredCode === "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER") {
      return res.status(409).json({
        error: message,
        error_code: inferredCode,
        errorCode: inferredCode,
      });
    }
    if (inferredCode === "DATABASE_UNAVAILABLE") {
      return res.status(503).json({
        error: message,
        error_code: inferredCode,
        errorCode: inferredCode,
      });
    }
    if (inferredCode) {
      return res.status(400).json({
        error: message,
        error_code: inferredCode,
        errorCode: inferredCode,
      });
    }

    logger.error({ requestId, error: message }, "Deployment request failed");
    res.status(400).json({ error: message });
  }
});

router.post("/:id/whatsapp-login/start", async (req, res) => {
  const deploymentId = req.params.id;
  const log = deployLogger(deploymentId);

  try {
    const resolvedTarget = await resolveDeploymentWhatsAppLoginTarget({
      deploymentId,
    });
    if (resolvedTarget.error) {
      return res
        .status(resolvedTarget.error.status)
        .json(resolvedTarget.error.body);
    }
    if (!resolvedTarget.target) {
      return res.status(409).json({
        error: "WhatsApp login target is not ready yet",
      });
    }

    const snapshot = await startOrReuseDeploymentWhatsAppLogin({
      deploymentId,
      target: resolvedTarget.target,
    });

    return res.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start WhatsApp login";
    const status = /pod is not ready for WhatsApp login/i.test(message) ? 409 : 500;
    log.error({ error: message }, "WhatsApp login start failed");
    return res.status(status).json({
      error: message,
      error_code: inferDeploymentErrorCode(message),
      errorCode: inferDeploymentErrorCode(message),
    });
  }
});

router.get("/:id/whatsapp-login/current", async (req, res) => {
  const deploymentId = req.params.id;
  const log = deployLogger(deploymentId);

  try {
    const snapshot = getDeploymentWhatsAppLoginSnapshot(deploymentId);
    if (!snapshot) {
      return res.status(204).end();
    }

    return res.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get current WhatsApp login session";
    log.error({ error: message }, "WhatsApp login current session error");
    return res.status(500).json({ error: message });
  }
});

router.post("/:id/whatsapp-login/current/cancel", async (req, res) => {
  const deploymentId = req.params.id;
  const log = deployLogger(deploymentId);

  try {
    const snapshot = cancelCurrentDeploymentWhatsAppLogin(deploymentId);
    if (!snapshot) {
      return res.status(204).end();
    }

    return res.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel WhatsApp login";
    log.error({ error: message }, "WhatsApp login cancel failed");
    return res.status(500).json({ error: message });
  }
});

router.post("/:id/whatsapp-login/restart", async (req, res) => {
  const deploymentId = req.params.id;
  const log = deployLogger(deploymentId);

  try {
    const resolvedTarget = await resolveDeploymentWhatsAppLoginTarget({
      deploymentId,
    });
    if (resolvedTarget.error) {
      return res
        .status(resolvedTarget.error.status)
        .json(resolvedTarget.error.body);
    }
    if (!resolvedTarget.target) {
      return res.status(409).json({
        error: "WhatsApp login target is not ready yet",
      });
    }

    const snapshot = await restartDeploymentWhatsAppLogin({
      deploymentId,
      target: resolvedTarget.target,
    });

    return res.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restart WhatsApp login";
    const status = /pod is not ready for WhatsApp login/i.test(message) ? 409 : 500;
    log.error({ error: message }, "WhatsApp login restart failed");
    return res.status(status).json({
      error: message,
      error_code: inferDeploymentErrorCode(message),
      errorCode: inferDeploymentErrorCode(message),
    });
  }
});

router.post("/:id/openclaw-dashboard/start", async (req, res) => {
  const deploymentId = req.params.id;
  const log = deployLogger(deploymentId);

  try {
    const resolvedTarget = await resolveDeploymentOpenClawDashboardTarget({
      deploymentId,
    });
    if (resolvedTarget.error) {
      return res
        .status(resolvedTarget.error.status)
        .json(resolvedTarget.error.body);
    }
    if (!resolvedTarget.target) {
      return res.status(409).json({
        error: "Gateway Dashboard target is not ready yet",
      });
    }

    const snapshot = await startOrReuseDeploymentOpenClawDashboard({
      deploymentId,
      target: resolvedTarget.target,
    });

    return res.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start Gateway Dashboard";
    const status = /Gateway Dashboard/i.test(message) ? 409 : 500;
    log.error({ error: message }, "Gateway Dashboard start failed");
    return res.status(status).json({
      error: message,
      error_code: inferDeploymentErrorCode(message),
      errorCode: inferDeploymentErrorCode(message),
    });
  }
});

router.get("/:id/openclaw-dashboard/current", async (req, res) => {
  const deploymentId = req.params.id;
  const log = deployLogger(deploymentId);

  try {
    const snapshot = getDeploymentOpenClawDashboardSnapshot(deploymentId);
    if (!snapshot) {
      return res.status(204).end();
    }

    return res.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get current Gateway Dashboard session";
    log.error({ error: message }, "Gateway Dashboard current session error");
    return res.status(500).json({ error: message });
  }
});

router.post("/:id/openclaw-dashboard/stop", async (req, res) => {
  const deploymentId = req.params.id;
  const log = deployLogger(deploymentId);

  try {
    const stopped = await stopDeploymentOpenClawDashboard(deploymentId);
    if (!stopped) {
      return res.status(204).end();
    }

    return res.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to stop Gateway Dashboard";
    log.error({ error: message }, "Gateway Dashboard stop failed");
    return res.status(500).json({ error: message });
  }
});

router.all("/:id/openclaw-dashboard/proxy", async (req, res) => {
  await proxyOpenClawDashboardRequest(req, res, req.params.id);
});

router.all("/:id/openclaw-dashboard/proxy/*", async (req, res) => {
  await proxyOpenClawDashboardRequest(req, res, req.params.id);
});

router.get("/:id", requireAuth, async (req, res) => {
  const deploymentId = req.params.id;
  const userId = req.auth?.userId || "test-user";
  const log = deployLogger(deploymentId);

  try {
    log.debug("Status check requested");
    const deployment = await getDeployment(deploymentId);
    if (!deployment || !isDeploymentOwnedByUser(deployment, userId)) {
      log.warn("Status check for non-existent deployment");
      return res.status(404).json({ error: "Deployment not found" });
    }

    log.debug({ status: deployment.status }, "Status check response");
    const errorCode = inferDeploymentErrorCode(deployment.error_message);
    res.json({
      status: deployment.status,
      channel_type: deployment.channel_type || "telegram",
      error_message: deployment.error_message,
      error_code: errorCode,
      errorCode: errorCode,
      requested_model: deployment.requested_model || null,
      resolved_model: deployment.resolved_model || null,
      requestedModel: deployment.requested_model || null,
      resolvedModel: deployment.resolved_model || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get deployment";
    log.error({ error: message }, "Status check error");
    res.status(500).json({ error: message });
  }
});

export default router;

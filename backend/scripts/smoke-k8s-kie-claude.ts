import { execFile } from "node:child_process";
import { promisify } from "node:util";
import "../src/load-env.js";

process.env.OPENCLAW_RUNTIME_PROVIDER = "k8s";

const execFileAsync = promisify(execFile);
const startedAt = Date.now();
const timestamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");

const telegramBotToken = process.env.SMOKE_TELEGRAM_BOT_TOKEN?.trim();
if (!telegramBotToken) {
  throw new Error("SMOKE_TELEGRAM_BOT_TOKEN is not set");
}

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is not set");
}

if (!process.env.ENCRYPTION_KEY?.trim()) {
  throw new Error("ENCRYPTION_KEY is not set");
}

const [
  { unbindAccount },
  { query },
  { createDeployment, runDeployment },
  {
    KIE_CLAUDE_OPUS_4_6_MODEL,
    KIE_GEMINI_3_1_PRO_MODEL,
  },
  {
    buildOpenClawK8sCliCommand,
    buildOpenClawK8sDeploymentName,
    inspectOpenClawK8sRuntime,
  },
  {
    buildKieGatewaySmokeArgs,
    extractOpenClawAgentTextFromJson,
  },
] = await Promise.all([
  import("../src/services/account-pool.js"),
  import("../src/db/index.js"),
  import("../src/services/deploy.js"),
  import("../src/services/docker.js"),
  import("../src/services/k8s.js"),
  import("../src/services/openclaw/kie-claude-auth-proxy.js"),
]);

const allowedModels = new Set([
  KIE_CLAUDE_OPUS_4_6_MODEL,
  KIE_GEMINI_3_1_PRO_MODEL,
]);
const requestedModel =
  process.env.SMOKE_KIE_MODEL?.trim() || KIE_CLAUDE_OPUS_4_6_MODEL;

if (!allowedModels.has(requestedModel)) {
  throw new Error(
    `SMOKE_KIE_MODEL must be one of ${Array.from(allowedModels).join(", ")}`
  );
}

const modelSlug = requestedModel
  .split("/")
  .join("-")
  .replace(/[^a-z0-9-]/gi, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase();
const smokeNamespace = `easyclaw-kie-smoke-${modelSlug}-${timestamp.toLowerCase()}`.slice(
  0,
  63
);
const smokeUserId = `smoke-kie-${modelSlug}-${startedAt}`;
const smokeSubscriptionOrderNo = `smoke-kie-${modelSlug}-${startedAt}`;

process.env.OPENCLAW_K8S_NAMESPACE = smokeNamespace;

const runKubectl = async (args: string[]): Promise<string> => {
  const result = await execFileAsync("kubectl", args, {
    cwd: process.cwd(),
    maxBuffer: 16 * 1024 * 1024,
  });
  return `${result.stdout || ""}${result.stderr || ""}`.trim();
};

const logJson = (payload: Record<string, unknown>): void => {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
};

const findBoundAccountPoolId = async (): Promise<string | null> => {
  const result = await query(
    `SELECT id
     FROM account_pool
     WHERE bound_user_id = $1
       AND is_bound = true
     ORDER BY bound_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [smokeUserId]
  );

  return typeof result.rows[0]?.id === "string" ? result.rows[0].id : null;
};

let deploymentId: string | null = null;

const cleanup = async (): Promise<void> => {
  const cleanupErrors: string[] = [];

  try {
    const accountPoolId = await findBoundAccountPoolId();
    if (accountPoolId) {
      await unbindAccount(accountPoolId, {
        stopDeployment: true,
        reason: `K8s KIE smoke cleanup for ${requestedModel}`,
      });
    }
  } catch (error) {
    cleanupErrors.push(
      `unbindAccount failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    await runKubectl([
      "delete",
      "namespace",
      smokeNamespace,
      "--ignore-not-found=true",
      "--wait=false",
    ]);
  } catch (error) {
    cleanupErrors.push(
      `kubectl delete namespace failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (cleanupErrors.length > 0) {
    process.stderr.write(`${cleanupErrors.join("\n")}\n`);
  }
};

try {
  const currentContext = await runKubectl(["config", "current-context"]);
  const currentServer = await runKubectl([
    "config",
    "view",
    "--minify",
    "-o",
    "jsonpath={.clusters[0].cluster.server}",
  ]);
  logJson({
    step: "kube-context",
    context: currentContext,
    server: currentServer,
    namespace: smokeNamespace,
    model: requestedModel,
  });

  await runKubectl(["create", "namespace", smokeNamespace]);
  logJson({ step: "namespace-created", namespace: smokeNamespace });

  deploymentId = await createDeployment({
    userId: smokeUserId,
    channel: "telegram",
    channelToken: telegramBotToken,
    requestedModel,
    subscriptionOrderNo: smokeSubscriptionOrderNo,
  });
  logJson({
    step: "deployment-created",
    deploymentId,
    namespace: smokeNamespace,
    model: requestedModel,
  });

  await runDeployment(deploymentId, requestedModel, "starter");
  logJson({ step: "deployment-running", deploymentId });

  const runtime = await inspectOpenClawK8sRuntime(deploymentId, smokeNamespace);
  if (!runtime.exists || !runtime.podName) {
    throw new Error(
      `runtime pod not found for deployment ${deploymentId} in namespace ${smokeNamespace}`
    );
  }

  const kubectlArgs = [
    "exec",
    "-n",
    smokeNamespace,
    runtime.podName,
    "-c",
    "openclaw",
    "--",
    ...buildOpenClawK8sCliCommand(
      buildKieGatewaySmokeArgs(),
      "kie"
    ),
  ];
  const rawOutput = await runKubectl(kubectlArgs);
  const assistantText = extractOpenClawAgentTextFromJson(rawOutput);

  if (assistantText !== "OK") {
    throw new Error(
      `unexpected smoke response: ${assistantText || "<empty>"}\nraw=${rawOutput}`
    );
  }

  logJson({
    ok: true,
    step: "smoke-passed",
    deploymentId,
    namespace: smokeNamespace,
    podName: runtime.podName,
    deploymentName: buildOpenClawK8sDeploymentName(deploymentId),
    assistantText,
  });
} finally {
  await cleanup();
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  default as deployRouter,
  inferDeploymentErrorCode,
  isDeploymentOwnedByUser,
  normalizeDeployRequestPayload,
} from "./deploy.js";
import { requireAuth } from "../auth/verify.js";

test("normalizeDeployRequestPayload accepts legacy telegram payload", () => {
  const normalized = normalizeDeployRequestPayload({
    telegram_token: "123456:TESTTOKEN",
    model: "gpt-5-4",
  });

  assert.deepEqual(normalized, {
    channel: "telegram",
    channelToken: "123456:TESTTOKEN",
    model: "gpt-5-4",
    tier: undefined,
    subscriptionOrderNo: undefined,
  });
});

test("normalizeDeployRequestPayload accepts discord payload", () => {
  const normalized = normalizeDeployRequestPayload({
    channel: "discord",
    channel_token: "discord-bot-token",
    model: "claude-opus-4-6",
  });

  assert.deepEqual(normalized, {
    channel: "discord",
    channelToken: "discord-bot-token",
    model: "claude-opus-4-6",
    tier: undefined,
    subscriptionOrderNo: undefined,
  });
});

test("normalizeDeployRequestPayload accepts whatsapp without a channel token", () => {
  const normalized = normalizeDeployRequestPayload({
    channel: "whatsapp",
    model: "gpt-5-4",
  });

  assert.deepEqual(normalized, {
    channel: "whatsapp",
    channelToken: undefined,
    model: "gpt-5-4",
    tier: undefined,
    subscriptionOrderNo: undefined,
  });
});

test("normalizeDeployRequestPayload rejects unsupported channels", () => {
  assert.throws(
    () =>
      normalizeDeployRequestPayload({
        channel: "slack",
        channel_token: "test-token",
      }),
    /UNSUPPORTED_CHANNEL/i
  );
});

test("normalizeDeployRequestPayload requires a channel token", () => {
  assert.throws(
    () =>
      normalizeDeployRequestPayload({
        channel: "discord",
      }),
    /MISSING_CHANNEL_TOKEN/i
  );
});

test("inferDeploymentErrorCode recognizes the standardized Telegram and Kie deployment failures", () => {
  assert.equal(
    inferDeploymentErrorCode(
      "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED: Message Content Intent missing"
    ),
    "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED"
  );
  assert.equal(
    inferDeploymentErrorCode("TELEGRAM_UNAUTHORIZED: telegram returned 401"),
    "TELEGRAM_UNAUTHORIZED"
  );
  assert.equal(
    inferDeploymentErrorCode(
      "WHATSAPP_SESSION_UNAUTHORIZED: whatsapp session unauthorized"
    ),
    "WHATSAPP_SESSION_UNAUTHORIZED"
  );
  assert.equal(
    inferDeploymentErrorCode("KIE_CREDIT_EXHAUSTED: credits=0"),
    "KIE_CREDIT_EXHAUSTED"
  );
  assert.equal(
    inferDeploymentErrorCode("KIE_UPSTREAM_UNAVAILABLE: stage=smoke, status=429"),
    "KIE_UPSTREAM_UNAVAILABLE"
  );
  assert.equal(
    inferDeploymentErrorCode("KIE_MODEL_PRECHECK_FAILED: empty assistant text"),
    "KIE_MODEL_PRECHECK_FAILED"
  );
  assert.equal(
    inferDeploymentErrorCode("WHATSAPP_K8S_ONLY: runtime provider is docker"),
    "WHATSAPP_K8S_ONLY"
  );
});

test("isDeploymentOwnedByUser only returns true for matching user ids", () => {
  assert.equal(isDeploymentOwnedByUser({ user_id: "user-1" }, "user-1"), true);
  assert.equal(isDeploymentOwnedByUser({ user_id: "user-1" }, "user-2"), false);
  assert.equal(isDeploymentOwnedByUser(null, "user-1"), false);
});

test("whatsapp second-stage and dashboard fallback routes do not require auth and remove activate", () => {
  const getRouteLayer = (path: string, method: "get" | "post") =>
    (deployRouter as any).stack.find(
      (layer: any) => layer.route?.path === path && layer.route?.methods?.[method]
    ) || null;

  for (const [path, method] of [
    ["/:id/whatsapp-login/start", "post"],
    ["/:id/whatsapp-login/current", "get"],
    ["/:id/whatsapp-login/current/cancel", "post"],
    ["/:id/whatsapp-login/restart", "post"],
    ["/:id/openclaw-dashboard/start", "post"],
    ["/:id/openclaw-dashboard/current", "get"],
    ["/:id/openclaw-dashboard/stop", "post"],
  ] as const) {
    const routeLayer = getRouteLayer(path, method);
    assert.ok(routeLayer, `expected route ${method.toUpperCase()} ${path}`);
    const handlers = routeLayer.route.stack.map((layer: any) => layer.handle);
    assert.equal(
      handlers.includes(requireAuth),
      false,
      `${method.toUpperCase()} ${path} should not require auth`
    );
  }

  assert.equal(
    getRouteLayer("/:id/whatsapp-login/activate", "post"),
    null,
    "activate route should be removed"
  );
});

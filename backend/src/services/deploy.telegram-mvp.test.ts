import test from "node:test";
import assert from "node:assert/strict";
import {
  assertChannelSupportedByPersistence,
  channelAwareDeploymentSql,
  decodeStoredChannelToken,
  encodeStoredChannelTokenForPersistence,
  isRecoverableDeploymentRuntimeError,
  legacyChannelAwareDeploymentSql,
  legacyTelegramMvpDeploymentSql,
  resolveDeploymentChannelTokenForPersistence,
  shouldPromoteFailedDeploymentToRunning,
  WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER,
} from "./deploy.js";

test("channel-aware SQL writes generic channel columns and keeps telegram token compatibility column", () => {
  assert.match(
    channelAwareDeploymentSql.insertDeployment,
    /\bchannel_type\b/i
  );
  assert.match(
    channelAwareDeploymentSql.insertDeployment,
    /\bchannel_token_encrypted\b/i
  );
  assert.match(
    channelAwareDeploymentSql.insertDeployment,
    /\btelegram_token_encrypted\b/i
  );

  assert.match(
    channelAwareDeploymentSql.insertDeployment,
    /\btarget_host\b/i
  );

  assert.match(
    channelAwareDeploymentSql.selectActiveDeployments,
    /\berror_message\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectActiveDeployments,
    /\bchannel_type\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectActiveDeployments,
    /\bchannel_token_encrypted\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectActiveDeployments,
    /\bsubscription_order_no\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectActiveDeployments,
    /\btelegram_token_encrypted\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectActiveDeployments,
    /status in \('provisioning', 'running', 'failed'\)/i
  );
  assert.match(
    channelAwareDeploymentSql.selectActiveDeployments,
    /\btarget_host\b/i
  );

  assert.match(
    channelAwareDeploymentSql.selectRuntimeDeployment,
    /\bchannel_type\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectRuntimeDeployment,
    /\bchannel_token_encrypted\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectRuntimeDeployment,
    /\btelegram_token_encrypted\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectRuntimeDeployment,
    /\btarget_host\b/i
  );
});

test("channel-aware status query reads stored channel_type", () => {
  assert.match(
    channelAwareDeploymentSql.selectDeployment,
    /\bchannel_type\b/i
  );
  assert.match(
    channelAwareDeploymentSql.selectDeployment,
    /\btarget_host\b/i
  );
});

test("channel-aware SQL can synthesize target_host without requiring the column", () => {
  assert.match(
    legacyChannelAwareDeploymentSql.insertDeployment,
    /\bchannel_type\b/i
  );
  assert.match(
    legacyChannelAwareDeploymentSql.insertDeployment,
    /\bchannel_token_encrypted\b/i
  );
  assert.match(
    legacyChannelAwareDeploymentSql.insertDeployment,
    /\btelegram_token_encrypted\b/i
  );
  assert.doesNotMatch(
    legacyChannelAwareDeploymentSql.insertDeployment,
    /\btarget_host\b/i
  );

  assert.match(
    legacyChannelAwareDeploymentSql.selectDeployment,
    /\bnull::text as target_host\b/i
  );
  assert.match(
    legacyChannelAwareDeploymentSql.selectActiveDeployments,
    /\berror_message\b/i
  );
  assert.match(
    legacyChannelAwareDeploymentSql.selectActiveDeployments,
    /status in \('provisioning', 'running', 'failed'\)/i
  );
  assert.match(
    legacyChannelAwareDeploymentSql.selectActiveDeployments,
    /\bnull::text as target_host\b/i
  );
  assert.match(
    legacyChannelAwareDeploymentSql.selectRuntimeDeployment,
    /\bnull::text as target_host\b/i
  );
});

test("legacy telegram-only SQL synthesizes channel_type without schema columns", () => {
  assert.match(
    legacyTelegramMvpDeploymentSql.selectDeployment,
    /'telegram'::text as channel_type/i
  );
  assert.match(
    legacyTelegramMvpDeploymentSql.selectDeployment,
    /\btelegram_token_encrypted\b/i
  );
  assert.doesNotMatch(
    legacyTelegramMvpDeploymentSql.insertDeployment,
    /\bchannel_type\b|\bchannel_token_encrypted\b/i
  );
  assert.match(
    legacyTelegramMvpDeploymentSql.selectActiveDeployments,
    /\berror_message\b/i
  );
  assert.match(
    legacyTelegramMvpDeploymentSql.selectActiveDeployments,
    /status in \('provisioning', 'running', 'failed'\)/i
  );
});

test("isRecoverableDeploymentRuntimeError recognizes K8s transport errors", () => {
  assert.equal(
    isRecoverableDeploymentRuntimeError(
      "request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established"
    ),
    true
  );
});

test("isRecoverableDeploymentRuntimeError ignores business failures", () => {
  assert.equal(
    isRecoverableDeploymentRuntimeError(
      "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER: tier=starter, provider=openrouter, model=gpt-5-4"
    ),
    false
  );
});

test("shouldPromoteFailedDeploymentToRunning only promotes recoverable failures with a live runtime", () => {
  assert.equal(
    shouldPromoteFailedDeploymentToRunning({
      errorMessage:
        "request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established",
      runtimeInspection: {
        exists: true,
        running: true,
      },
    }),
    true
  );

  assert.equal(
    shouldPromoteFailedDeploymentToRunning({
      errorMessage:
        "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER: tier=starter, provider=openrouter, model=gpt-5-4",
      runtimeInspection: {
        exists: true,
        running: true,
      },
    }),
    false
  );

  assert.equal(
    shouldPromoteFailedDeploymentToRunning({
      errorMessage:
        "request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established",
      runtimeInspection: {
        exists: true,
        running: false,
      },
    }),
    false
  );
});

test("legacy telegram-only persistence accepts discord via token marker compatibility", () => {
  assert.doesNotThrow(() =>
    assertChannelSupportedByPersistence("discord", false)
  );
});

test("legacy telegram-only persistence accepts whatsapp via token marker compatibility", () => {
  assert.doesNotThrow(() =>
    assertChannelSupportedByPersistence("whatsapp", false)
  );
});

test("channel-aware persistence accepts discord", () => {
  assert.doesNotThrow(() =>
    assertChannelSupportedByPersistence("discord", true)
  );
});

test("channel-aware persistence accepts whatsapp", () => {
  assert.doesNotThrow(() =>
    assertChannelSupportedByPersistence("whatsapp", true)
  );
});

test("legacy persistence keeps telegram tokens unchanged", () => {
  assert.equal(
    encodeStoredChannelTokenForPersistence({
      channel: "telegram",
      channelToken: "123456:TESTTOKEN",
      supportsChannelColumns: false,
    }),
    "123456:TESTTOKEN"
  );
});

test("legacy persistence prefixes discord tokens", () => {
  assert.equal(
    encodeStoredChannelTokenForPersistence({
      channel: "discord",
      channelToken: "discord-bot-token",
      supportsChannelColumns: false,
    }),
    "discord:discord-bot-token"
  );
});

test("legacy persistence prefixes whatsapp placeholder tokens", () => {
  assert.equal(
    encodeStoredChannelTokenForPersistence({
      channel: "whatsapp",
      channelToken: WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER,
      supportsChannelColumns: false,
    }),
    `whatsapp:${WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER}`
  );
});

test("channel-aware persistence keeps discord tokens raw", () => {
  assert.equal(
    encodeStoredChannelTokenForPersistence({
      channel: "discord",
      channelToken: "discord-bot-token",
      supportsChannelColumns: true,
    }),
    "discord-bot-token"
  );
});

test("whatsapp persistence uses an encrypted placeholder token", () => {
  assert.equal(
    resolveDeploymentChannelTokenForPersistence({
      channel: "whatsapp",
    }),
    WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER
  );
});

test("decodeStoredChannelToken preserves legacy telegram rows", () => {
  assert.deepEqual(
    decodeStoredChannelToken({
      storedToken: "123456:TESTTOKEN",
    }),
    {
      channel: "telegram",
      channelToken: "123456:TESTTOKEN",
    }
  );
});

test("decodeStoredChannelToken restores discord rows from the legacy token marker", () => {
  assert.deepEqual(
    decodeStoredChannelToken({
      storedToken: "discord:discord-bot-token",
    }),
    {
      channel: "discord",
      channelToken: "discord-bot-token",
    }
  );
});

test("decodeStoredChannelToken restores whatsapp rows from the legacy token marker", () => {
  assert.deepEqual(
    decodeStoredChannelToken({
      storedToken: `whatsapp:${WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER}`,
    }),
    {
      channel: "whatsapp",
      channelToken: WHATSAPP_CHANNEL_TOKEN_PLACEHOLDER,
    }
  );
});

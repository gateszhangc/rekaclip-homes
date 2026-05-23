import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKEND_TIMEOUT_ERROR_CODE,
  DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE,
  DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE,
  NETWORK_UNSTABLE_ERROR_CODE,
  NO_AVAILABLE_ACCOUNT_ERROR_CODE,
  NO_AVAILABLE_NODE_ERROR_CODE,
  normalizeDeploymentErrorCode,
  SUBSCRIPTION_REQUIRED_ERROR_CODE,
} from "./deploy-errors";

test("normalizeDeploymentErrorCode prefers explicit error codes", () => {
  assert.equal(
    normalizeDeploymentErrorCode(NO_AVAILABLE_NODE_ERROR_CODE, "ignored"),
    NO_AVAILABLE_NODE_ERROR_CODE
  );
  assert.equal(
    normalizeDeploymentErrorCode(NETWORK_UNSTABLE_ERROR_CODE, null),
    NETWORK_UNSTABLE_ERROR_CODE
  );
  assert.equal(
    normalizeDeploymentErrorCode(
      DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE,
      null
    ),
    DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE
  );
});

test("normalizeDeploymentErrorCode infers known deploy business errors from messages", () => {
  assert.equal(
    normalizeDeploymentErrorCode(null, `backend failed: ${NO_AVAILABLE_ACCOUNT_ERROR_CODE}`),
    NO_AVAILABLE_ACCOUNT_ERROR_CODE
  );
  assert.equal(
    normalizeDeploymentErrorCode(null, `oops ${DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE}`),
    DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE
  );
  assert.equal(
    normalizeDeploymentErrorCode(
      null,
      `boom ${DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE}`
    ),
    DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE
  );
  assert.equal(
    normalizeDeploymentErrorCode(null, `stopped: ${SUBSCRIPTION_REQUIRED_ERROR_CODE}`),
    SUBSCRIPTION_REQUIRED_ERROR_CODE
  );
  assert.equal(
    normalizeDeploymentErrorCode(null, `timeout ${BACKEND_TIMEOUT_ERROR_CODE}`),
    BACKEND_TIMEOUT_ERROR_CODE
  );
});

test("normalizeDeploymentErrorCode returns null for unknown errors", () => {
  assert.equal(normalizeDeploymentErrorCode(null, "totally unknown"), null);
});

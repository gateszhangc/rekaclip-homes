export const NO_AVAILABLE_ACCOUNT_ERROR_CODE =
  "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER";
export const NO_AVAILABLE_NODE_ERROR_CODE = "NO_AVAILABLE_NODE";
export const DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE =
  "DEPLOYMENT_SEAT_UNAVAILABLE";
export const DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE =
  "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED";
export const SUBSCRIPTION_REQUIRED_ERROR_CODE = "SUBSCRIPTION_REQUIRED";
export const NETWORK_UNSTABLE_ERROR_CODE = "NETWORK_UNSTABLE";
/** Next proxy gave up waiting for the local/backend deploy HTTP response. */
export const BACKEND_TIMEOUT_ERROR_CODE = "BACKEND_TIMEOUT";
export const WHATSAPP_K8S_ONLY_ERROR_CODE = "WHATSAPP_K8S_ONLY";
export const WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE =
  "WHATSAPP_SESSION_UNAUTHORIZED";

export const inferDeployErrorCode = (
  message?: string | null
): string | undefined => {
  const normalized = (message || "").toUpperCase();
  if (normalized.includes(NO_AVAILABLE_ACCOUNT_ERROR_CODE)) {
    return NO_AVAILABLE_ACCOUNT_ERROR_CODE;
  }
  if (normalized.includes(DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE)) {
    return DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE;
  }
  if (normalized.includes(DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE)) {
    return DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE;
  }
  if (normalized.includes(NO_AVAILABLE_NODE_ERROR_CODE)) {
    return NO_AVAILABLE_NODE_ERROR_CODE;
  }
  if (normalized.includes(SUBSCRIPTION_REQUIRED_ERROR_CODE)) {
    return SUBSCRIPTION_REQUIRED_ERROR_CODE;
  }
  if (normalized.includes(NETWORK_UNSTABLE_ERROR_CODE)) {
    return NETWORK_UNSTABLE_ERROR_CODE;
  }
  if (normalized.includes(BACKEND_TIMEOUT_ERROR_CODE)) {
    return BACKEND_TIMEOUT_ERROR_CODE;
  }
  if (normalized.includes(WHATSAPP_K8S_ONLY_ERROR_CODE)) {
    return WHATSAPP_K8S_ONLY_ERROR_CODE;
  }
  if (normalized.includes(WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE)) {
    return WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE;
  }
  return undefined;
};

export const normalizeDeploymentErrorCode = (
  rawCode?: string | null,
  rawMessage?: string | null
): string | null => {
  const code = (rawCode || "").trim().toUpperCase();
  if (code.includes(NO_AVAILABLE_ACCOUNT_ERROR_CODE)) {
    return NO_AVAILABLE_ACCOUNT_ERROR_CODE;
  }
  if (code.includes(NO_AVAILABLE_NODE_ERROR_CODE)) {
    return NO_AVAILABLE_NODE_ERROR_CODE;
  }
  if (code.includes(DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE)) {
    return DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE;
  }
  if (code.includes(DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE)) {
    return DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE;
  }
  if (code.includes(SUBSCRIPTION_REQUIRED_ERROR_CODE)) {
    return SUBSCRIPTION_REQUIRED_ERROR_CODE;
  }
  if (code.includes(NETWORK_UNSTABLE_ERROR_CODE)) {
    return NETWORK_UNSTABLE_ERROR_CODE;
  }
  if (code.includes(BACKEND_TIMEOUT_ERROR_CODE)) {
    return BACKEND_TIMEOUT_ERROR_CODE;
  }
  if (code.includes(WHATSAPP_K8S_ONLY_ERROR_CODE)) {
    return WHATSAPP_K8S_ONLY_ERROR_CODE;
  }
  if (code.includes(WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE)) {
    return WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE;
  }

  return inferDeployErrorCode(rawMessage) || null;
};

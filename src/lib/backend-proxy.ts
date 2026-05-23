import {
  backendUnavailableMessage,
  getBackendBaseUrlCandidates,
  isLocalBackendBaseUrl,
} from "@/lib/backend-base-url";

type FetchBackendJsonOptions = {
  timeoutMs?: number;
  localTimeoutMs?: number;
  remoteTimeoutMs?: number;
};

type FetchBackendJsonResult = {
  response: Response;
  payload: any;
  backendBaseUrl: string;
};

type FetchBackendResponseResult = {
  response: Response;
  backendBaseUrl: string;
};

type RetryDecisionContext = {
  path: string;
  attempt: number;
  maxAttempts: number;
  response?: Response;
  payload?: any;
  error?: unknown;
};

type FetchBackendJsonWithRetryOptions = FetchBackendJsonOptions & {
  maxAttempts?: number;
  retryBaseMs?: number;
  shouldRetry?: (context: RetryDecisionContext) => boolean;
};

const TRANSIENT_ERROR_PATTERNS = [
  /abort/i,
  /timeout/i,
  /fetch failed/i,
  /network/i,
  /econnrefused/i,
  /econntimedout/i,
  /etimedout/i,
  /econnreset/i,
  /eai_again/i,
  /enotfound/i,
];

const NON_RETRYABLE_BUSINESS_ERROR_CODES = new Set([
  "DEPLOYMENT_SEAT_UNAVAILABLE",
  "NO_AVAILABLE_NODE",
  "SUBSCRIPTION_REQUIRED",
  "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER",
]);

const asPositiveInt = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const getDefaultMaxAttempts = (): number => {
  // DEPLOY_PROXY_MAX_RETRIES represents retry count, not total attempts.
  const retries = asPositiveInt(process.env.DEPLOY_PROXY_MAX_RETRIES, 3);
  return retries + 1;
};

const getDefaultRetryBaseMs = (): number =>
  asPositiveInt(process.env.DEPLOY_PROXY_RETRY_BASE_MS, 300);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isTransientNetworkError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  if (!message) {
    return false;
  }

  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

const defaultShouldRetry = ({
  attempt,
  maxAttempts,
  response,
  payload,
  error,
}: RetryDecisionContext): boolean => {
  if (attempt >= maxAttempts) {
    return false;
  }

  const rawCode =
    typeof payload?.error_code === "string"
      ? payload.error_code
      : typeof payload?.errorCode === "string"
        ? payload.errorCode
        : undefined;
  const normalizedCode = rawCode?.trim().toUpperCase();
  if (normalizedCode && NON_RETRYABLE_BUSINESS_ERROR_CODES.has(normalizedCode)) {
    return false;
  }

  if (response) {
    return response.status >= 500;
  }

  if (error) {
    return isTransientNetworkError(error);
  }

  return false;
};

const getRetryDelayMs = (retryAttempt: number, retryBaseMs: number): number => {
  // 300 -> 900 -> 1800 when retryBaseMs=300 and retryAttempt=1..3.
  const steppedDelayMs = retryBaseMs * ((retryAttempt * (retryAttempt + 1)) / 2);
  const jitter = Math.floor(Math.random() * Math.max(25, retryBaseMs * 0.2));
  return steppedDelayMs + jitter;
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBackendJson(
  path: string,
  init: RequestInit = {},
  options: FetchBackendJsonOptions = {}
): Promise<FetchBackendJsonResult> {
  const { response, backendBaseUrl } = await fetchBackendResponse(
    path,
    init,
    options
  );
  const payload = await response.json().catch(() => ({}));
  return { response, payload, backendBaseUrl };
}

export async function fetchBackendResponse(
  path: string,
  init: RequestInit = {},
  options: FetchBackendJsonOptions = {}
): Promise<FetchBackendResponseResult> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const localTimeoutMs = options.localTimeoutMs ?? Math.max(timeoutMs, 12_000);
  const remoteTimeoutMs = options.remoteTimeoutMs ?? Math.min(timeoutMs, 3_000);
  const candidates = getBackendBaseUrlCandidates();
  let lastError: unknown = null;

  for (const backendBaseUrl of candidates) {
    const candidateTimeoutMs = isLocalBackendBaseUrl(backendBaseUrl)
      ? localTimeoutMs
      : remoteTimeoutMs;

    try {
      const response = await fetchWithTimeout(
        `${backendBaseUrl}${path}`,
        init,
        candidateTimeoutMs
      );
      return { response, backendBaseUrl };
    } catch (error) {
      lastError = error;
    }
  }

  const [primaryBaseUrl, ...fallbackBaseUrls] = candidates;
  const fallbackMessage = backendUnavailableMessage(
    primaryBaseUrl,
    fallbackBaseUrls
  );
  const details =
    lastError instanceof Error && lastError.message
      ? `${fallbackMessage} (${lastError.message})`
      : fallbackMessage;
  throw new Error(details);
}

export async function fetchBackendJsonWithRetry(
  path: string,
  init: RequestInit = {},
  options: FetchBackendJsonWithRetryOptions = {}
): Promise<FetchBackendJsonResult> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? getDefaultMaxAttempts());
  const retryBaseMs = Math.max(50, options.retryBaseMs ?? getDefaultRetryBaseMs());
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  const fetchOptions: FetchBackendJsonOptions = {
    timeoutMs: options.timeoutMs,
    localTimeoutMs: options.localTimeoutMs,
    remoteTimeoutMs: options.remoteTimeoutMs,
  };

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await fetchBackendJson(path, init, fetchOptions);
      const retryable = shouldRetry({
        path,
        attempt,
        maxAttempts,
        response: result.response,
        payload: result.payload,
      });

      if (!retryable) {
        return result;
      }

      if (attempt >= maxAttempts) {
        return result;
      }

      const retryDelayMs = getRetryDelayMs(attempt, retryBaseMs);
      await sleep(retryDelayMs);
      continue;
    } catch (error) {
      lastError = error;
      const retryable = shouldRetry({
        path,
        attempt,
        maxAttempts,
        error,
      });

      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      const retryDelayMs = getRetryDelayMs(attempt, retryBaseMs);
      await sleep(retryDelayMs);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Failed to fetch backend response");
}

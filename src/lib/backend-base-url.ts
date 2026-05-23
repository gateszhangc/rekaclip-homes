const LOCAL_BACKEND_DEFAULT = "http://127.0.0.1:5000";
const LOCAL_BACKEND_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function normalizeBackendBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");

  // In local dev, "localhost" may resolve to IPv6 (::1) while backend listens on IPv4 only.
  // Normalize to 127.0.0.1 to avoid intermittent "fetch failed" proxy errors.
  try {
    const url = new URL(normalized);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Keep original value when BACKEND_BASE_URL is not a full URL.
  }

  return normalized;
}

export function isLocalBackendBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return LOCAL_BACKEND_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function getBackendBaseUrl(): string {
  const raw =
    process.env.BACKEND_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  const base = raw && raw.length > 0 ? raw : LOCAL_BACKEND_DEFAULT;
  return normalizeBackendBaseUrl(base);
}

export function getBackendBaseUrlCandidates(): string[] {
  const primary = getBackendBaseUrl();
  const candidates = (() => {
    // In development, if a remote BACKEND_BASE_URL is configured, try it first.
    // Falling back to localhost is useful for contributors who do run the backend locally.
    if (process.env.NODE_ENV !== "production" && !isLocalBackendBaseUrl(primary)) {
      return [primary, LOCAL_BACKEND_DEFAULT];
    }

    return [primary];
  })();

  return [...new Set(candidates)];
}

export function backendUnavailableMessage(
  primaryBaseUrl: string,
  fallbackBaseUrls: string[] = []
): string {
  const fallbackText =
    fallbackBaseUrls.length > 0
      ? ` (fallback tried: ${fallbackBaseUrls.join(", ")})`
      : "";

  const hint = isLocalBackendBaseUrl(primaryBaseUrl)
    ? "Please start backend: npm --prefix backend run dev"
    : "Please verify the remote backend is reachable and BACKEND_BASE_URL / NEXT_PUBLIC_API_URL is set correctly (or start a local backend with: npm --prefix backend run dev)";

  return `Backend unavailable at ${primaryBaseUrl}${fallbackText}. ${hint}`;
}

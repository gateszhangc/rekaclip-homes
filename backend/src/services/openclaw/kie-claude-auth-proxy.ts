import {
  createServer,
  type IncomingHttpHeaders,
  type Server,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";

export const KIE_CLAUDE_AUTH_PROXY_HOST = "127.0.0.1";
export const KIE_CLAUDE_AUTH_PROXY_PORT = 18111;
export const KIE_CLAUDE_AUTH_PROXY_BASE_URL = `http://${KIE_CLAUDE_AUTH_PROXY_HOST}:${KIE_CLAUDE_AUTH_PROXY_PORT}`;
export const KIE_CLAUDE_UPSTREAM_MESSAGES_URL =
  "https://api.kie.ai/claude/v1/messages";
export const KIE_GATEWAY_SMOKE_PROMPT = "reply with exactly OK";
export const KIE_CLAUDE_GATEWAY_SMOKE_PROMPT = KIE_GATEWAY_SMOKE_PROMPT;

const HEALTHZ_RESPONSE = JSON.stringify({ ok: true });
const KIE_CLAUDE_PROXY_FORWARDABLE_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "anthropic-beta",
  "anthropic-version",
  "content-type",
  "user-agent",
]);
const KIE_CLAUDE_PROXY_EXCLUDED_REQUEST_HEADERS = new Set([
  "authorization",
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-api-key",
]);
const KIE_CLAUDE_PROXY_EXCLUDED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type FetchLike = typeof fetch;
type HeaderRecord = Record<string, string | string[] | undefined>;

type StartKieClaudeAuthProxyOptions = {
  host?: string;
  port?: number;
  upstreamMessagesUrl?: string;
  fetchImpl?: FetchLike;
};

const readFirstHeaderValue = (
  headers: HeaderRecord,
  name: string
): string | null => {
  const value = headers[name.toLowerCase()];
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const normalized = entry.trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

export const normalizeBearerToken = (rawValue: string | null): string | null => {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const withoutBearer = trimmed.replace(/^Bearer\s+/i, "").trim();
  return withoutBearer || null;
};

export const extractKieClaudeAuthProxyToken = (
  headers: HeaderRecord | IncomingHttpHeaders
): string | null => {
  const normalizedHeaders = headers as HeaderRecord;
  return (
    normalizeBearerToken(readFirstHeaderValue(normalizedHeaders, "x-api-key")) ||
    normalizeBearerToken(readFirstHeaderValue(normalizedHeaders, "authorization"))
  );
};

export const buildKieClaudeProxyForwardHeaders = (
  headers: HeaderRecord | IncomingHttpHeaders
): Record<string, string> => {
  const normalizedHeaders = headers as HeaderRecord;
  const token = extractKieClaudeAuthProxyToken(normalizedHeaders);
  if (!token) {
    throw new Error("KIE_CLAUDE_PROXY_TOKEN_MISSING");
  }

  const forwarded: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  for (const [rawName, rawValue] of Object.entries(normalizedHeaders)) {
    const name = rawName.toLowerCase();
    if (
      KIE_CLAUDE_PROXY_EXCLUDED_REQUEST_HEADERS.has(name) ||
      !KIE_CLAUDE_PROXY_FORWARDABLE_HEADERS.has(name)
    ) {
      continue;
    }

    const value = Array.isArray(rawValue)
      ? rawValue.filter((entry): entry is string => typeof entry === "string").join(", ")
      : rawValue;
    const normalizedValue = typeof value === "string" ? value.trim() : "";
    if (!normalizedValue) {
      continue;
    }

    forwarded[rawName] = normalizedValue;
  }

  return forwarded;
};

const readRequestBody = async (
  request: AsyncIterable<Uint8Array>
): Promise<string> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
};

const writeJson = (
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
): void => {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(payload)}\n`);
};

const copyUpstreamHeaders = (
  response: ServerResponse,
  upstreamHeaders: Headers
): void => {
  for (const [name, value] of upstreamHeaders.entries()) {
    if (KIE_CLAUDE_PROXY_EXCLUDED_RESPONSE_HEADERS.has(name.toLowerCase())) {
      continue;
    }
    response.setHeader(name, value);
  }
};

const parseJsonWithObjectFallback = (rawValue: string): unknown => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");
    if (objectStart !== -1 && objectEnd > objectStart) {
      try {
        return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

export const buildKieGatewaySmokeArgs = (): string[] => [
  "agent",
  "--agent",
  "main",
  "--message",
  KIE_GATEWAY_SMOKE_PROMPT,
  "--json",
];

export const buildKieClaudeGatewaySmokeArgs = buildKieGatewaySmokeArgs;

export const extractOpenClawAgentTextFromJson = (
  rawOutput: string
): string | null => {
  const payload = parseJsonWithObjectFallback(rawOutput);
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const queue: unknown[] = [];
  const rootPayloads = (payload as { payloads?: unknown }).payloads;
  if (Array.isArray(rootPayloads)) {
    queue.push(...rootPayloads);
  } else {
    queue.push(payload);
  }

  const seen = new Set<object>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    const directText = (current as { text?: unknown }).text;
    if (typeof directText === "string" && directText.trim()) {
      return directText.trim();
    }

    if (Array.isArray((current as { payloads?: unknown }).payloads)) {
      queue.push(...((current as { payloads: unknown[] }).payloads || []));
    }

    for (const value of Object.values(current)) {
      if (Array.isArray(value)) {
        queue.push(...value);
        continue;
      }

      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
};

export const createKieClaudeAuthProxyServer = ({
  upstreamMessagesUrl = KIE_CLAUDE_UPSTREAM_MESSAGES_URL,
  fetchImpl = fetch,
}: Pick<StartKieClaudeAuthProxyOptions, "upstreamMessagesUrl" | "fetchImpl"> = {}): Server =>
  createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/healthz") {
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
      });
      response.end(HEALTHZ_RESPONSE);
      return;
    }

    if (request.method !== "POST" || request.url !== "/v1/messages") {
      writeJson(response, 404, { error: "Not Found" });
      return;
    }

    let forwardedHeaders: Record<string, string>;
    try {
      forwardedHeaders = buildKieClaudeProxyForwardHeaders(request.headers);
    } catch {
      writeJson(response, 401, { error: "Missing API token" });
      return;
    }

    try {
      const body = await readRequestBody(request);
      const upstreamResponse = await fetchImpl(upstreamMessagesUrl, {
        method: "POST",
        headers: forwardedHeaders,
        body: body || undefined,
      });

      response.statusCode = upstreamResponse.status;
      response.statusMessage = upstreamResponse.statusText;
      copyUpstreamHeaders(response, upstreamResponse.headers);

      if (!upstreamResponse.body) {
        response.end();
        return;
      }

      await pipeline(
        Readable.fromWeb(
          upstreamResponse.body as unknown as NodeReadableStream<Uint8Array>
        ),
        response
      );
    } catch (error) {
      writeJson(response, 502, {
        error: "Upstream request failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

export const startKieClaudeAuthProxyServer = async ({
  host = KIE_CLAUDE_AUTH_PROXY_HOST,
  port = KIE_CLAUDE_AUTH_PROXY_PORT,
  upstreamMessagesUrl = KIE_CLAUDE_UPSTREAM_MESSAGES_URL,
  fetchImpl = fetch,
}: StartKieClaudeAuthProxyOptions = {}): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
  port: number;
  server: Server;
}> => {
  const server = createKieClaudeAuthProxyServer({
    upstreamMessagesUrl,
    fetchImpl,
  });
  server.listen(port, host);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("KIE_CLAUDE_PROXY_ADDRESS_UNAVAILABLE");
  }

  return {
    server,
    port: address.port,
    baseUrl: `http://${host}:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
};

export const buildKieClaudeAuthProxyRuntimeScript = (): string =>
  [
    `const http = require("node:http");`,
    `const { Readable } = require("node:stream");`,
    `const { pipeline } = require("node:stream/promises");`,
    `const HOST = ${JSON.stringify(KIE_CLAUDE_AUTH_PROXY_HOST)};`,
    `const PORT = ${JSON.stringify(KIE_CLAUDE_AUTH_PROXY_PORT)};`,
    `const UPSTREAM_URL = ${JSON.stringify(KIE_CLAUDE_UPSTREAM_MESSAGES_URL)};`,
    `const HEALTHZ_RESPONSE = ${JSON.stringify(HEALTHZ_RESPONSE)};`,
    `const FORWARDABLE_HEADERS = new Set(${JSON.stringify(
      Array.from(KIE_CLAUDE_PROXY_FORWARDABLE_HEADERS)
    )});`,
    `const EXCLUDED_REQUEST_HEADERS = new Set(${JSON.stringify(
      Array.from(KIE_CLAUDE_PROXY_EXCLUDED_REQUEST_HEADERS)
    )});`,
    `const EXCLUDED_RESPONSE_HEADERS = new Set(${JSON.stringify(
      Array.from(KIE_CLAUDE_PROXY_EXCLUDED_RESPONSE_HEADERS)
    )});`,
    `const readFirstHeaderValue = (headers, name) => { const value = headers[String(name).toLowerCase()]; if (typeof value === "string") { const normalized = value.trim(); return normalized ? normalized : null; } if (!Array.isArray(value)) return null; for (const entry of value) { if (typeof entry !== "string") continue; const normalized = entry.trim(); if (normalized) return normalized; } return null; };`,
    `const normalizeBearerToken = (rawValue) => { if (!rawValue) return null; const trimmed = String(rawValue).trim(); if (!trimmed) return null; const withoutBearer = trimmed.replace(/^Bearer\\s+/i, "").trim(); return withoutBearer || null; };`,
    `const extractToken = (headers) => normalizeBearerToken(readFirstHeaderValue(headers, "x-api-key")) || normalizeBearerToken(readFirstHeaderValue(headers, "authorization"));`,
    `const buildForwardHeaders = (headers) => { const token = extractToken(headers); if (!token) throw new Error("KIE_CLAUDE_PROXY_TOKEN_MISSING"); const forwarded = { Authorization: \`Bearer \${token}\` }; for (const [rawName, rawValue] of Object.entries(headers)) { const name = rawName.toLowerCase(); if (EXCLUDED_REQUEST_HEADERS.has(name) || !FORWARDABLE_HEADERS.has(name)) continue; const value = Array.isArray(rawValue) ? rawValue.filter((entry) => typeof entry === "string").join(", ") : rawValue; const normalizedValue = typeof value === "string" ? value.trim() : ""; if (!normalizedValue) continue; forwarded[rawName] = normalizedValue; } return forwarded; };`,
    `const readRequestBody = async (request) => { const chunks = []; for await (const chunk of request) { chunks.push(chunk); } return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))); };`,
    `const writeJson = (response, statusCode, payload) => { response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" }); response.end(\`\${JSON.stringify(payload)}\\n\`); };`,
    `const copyUpstreamHeaders = (response, headers) => { for (const [name, value] of headers.entries()) { if (EXCLUDED_RESPONSE_HEADERS.has(name.toLowerCase())) continue; response.setHeader(name, value); } };`,
    `const server = http.createServer(async (request, response) => { if (request.method === "GET" && request.url === "/healthz") { response.writeHead(200, { "content-type": "application/json; charset=utf-8" }); response.end(HEALTHZ_RESPONSE); return; } if (request.method !== "POST" || request.url !== "/v1/messages") { writeJson(response, 404, { error: "Not Found" }); return; } let headers; try { headers = buildForwardHeaders(request.headers); } catch { writeJson(response, 401, { error: "Missing API token" }); return; } try { const body = await readRequestBody(request); const upstreamResponse = await fetch(UPSTREAM_URL, { method: "POST", headers, body }); response.statusCode = upstreamResponse.status; response.statusMessage = upstreamResponse.statusText; copyUpstreamHeaders(response, upstreamResponse.headers); if (!upstreamResponse.body) { response.end(); return; } await pipeline(Readable.fromWeb(upstreamResponse.body), response); } catch (error) { writeJson(response, 502, { error: "Upstream request failed", detail: error instanceof Error ? error.message : String(error) }); } });`,
    `server.listen(PORT, HOST, () => { process.stdout.write(\`KIE Claude auth proxy listening on http://\${HOST}:\${PORT}\\n\`); });`,
  ].join("\n");

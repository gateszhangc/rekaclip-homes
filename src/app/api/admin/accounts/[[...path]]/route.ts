import { NextRequest } from "next/server";
import {
  backendUnavailableMessage,
  getBackendBaseUrl,
} from "@/lib/backend-base-url";

export const runtime = "nodejs";

async function proxyToBackend(
  req: NextRequest,
  params: { path?: string[] }
): Promise<Response> {
  const base = getBackendBaseUrl();
  const segments = params.path ?? [];
  const suffix = segments.length ? `/${segments.join("/")}` : "";
  const url = `${base}/api/admin/accounts${suffix}${req.nextUrl.search}`;

  // Forward JSON bodies as-is. Reading once keeps this compatible with
  // NextRequest's streaming body.
  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.text() : undefined;

  const contentType = req.headers.get("content-type") || "application/json";

  let upstream: Response;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.BACKEND_PROXY_TIMEOUT_MS || 12000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    upstream = await fetch(url, {
      method,
      headers: {
        "content-type": contentType,
      },
      body: body && body.length ? body : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return Response.json(
      {
        error: isAbort
          ? `Backend request timed out after ${timeoutMs}ms at ${base}`
          : backendUnavailableMessage(base),
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }

  const raw = await upstream.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (parsed == null) {
    if (upstream.ok) {
      parsed = { data: raw };
    } else {
      const trimmed = raw?.trim();
      parsed = { error: trimmed || `Backend error (HTTP ${upstream.status})` };
    }
  }

  return Response.json(parsed, { status: upstream.status });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const params = await ctx.params;
  return proxyToBackend(req, params);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const params = await ctx.params;
  return proxyToBackend(req, params);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const params = await ctx.params;
  return proxyToBackend(req, params);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const params = await ctx.params;
  return proxyToBackend(req, params);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const params = await ctx.params;
  return proxyToBackend(req, params);
}

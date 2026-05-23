import { NextRequest } from "next/server";
import { fetchBackendResponse } from "@/lib/backend-proxy";
import { rewriteOpenClawDashboardLocationForRequest } from "@/lib/openclaw-dashboard-proxy";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "transfer-encoding",
]);

const buildBackendProxyPath = (
  deploymentId: string,
  pathSegments: string[] | undefined,
  requestUrl: string
): string => {
  const request = new URL(requestUrl);
  const path = pathSegments?.length ? `/${pathSegments.join("/")}` : "";
  return `/api/deploy/${deploymentId}/openclaw-dashboard/proxy${path}${request.search}`;
};

const buildRequestHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }
    headers.set(key, value);
  });
  return headers;
};

const buildRequestBody = async (
  request: NextRequest
): Promise<Uint8Array | undefined> => {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength === 0) {
    return undefined;
  }

  return new Uint8Array(buffer);
};

const proxyDashboardRequest = async (
  request: NextRequest,
  deploymentId: string,
  pathSegments?: string[]
): Promise<Response> => {
  const { response } = await fetchBackendResponse(
    buildBackendProxyPath(deploymentId, pathSegments, request.url),
    {
      method: request.method,
      headers: buildRequestHeaders(request),
      body: await buildRequestBody(request),
    },
    { timeoutMs: 20_000, localTimeoutMs: 20_000, remoteTimeoutMs: 10_000 }
  );

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    if (key.toLowerCase() === "location") {
      responseHeaders.set(
        key,
        rewriteOpenClawDashboardLocationForRequest({
          location: value,
          requestUrl: request.url,
          deploymentId,
        })
      );
      return;
    }

    responseHeaders.set(key, value);
  });

  if (request.method === "HEAD") {
    return new Response(null, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  const body = Buffer.from(await response.arrayBuffer());
  return new Response(body, {
    status: response.status,
    headers: responseHeaders,
  });
};

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; path?: string[] }>;
  }
) {
  const { id, path } = await params;
  return await proxyDashboardRequest(request, id, path);
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; path?: string[] }>;
  }
) {
  const { id, path } = await params;
  return await proxyDashboardRequest(request, id, path);
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; path?: string[] }>;
  }
) {
  const { id, path } = await params;
  return await proxyDashboardRequest(request, id, path);
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; path?: string[] }>;
  }
) {
  const { id, path } = await params;
  return await proxyDashboardRequest(request, id, path);
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; path?: string[] }>;
  }
) {
  const { id, path } = await params;
  return await proxyDashboardRequest(request, id, path);
}

export async function HEAD(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; path?: string[] }>;
  }
) {
  const { id, path } = await params;
  return await proxyDashboardRequest(request, id, path);
}


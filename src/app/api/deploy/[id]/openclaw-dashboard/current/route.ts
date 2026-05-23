import { NextRequest } from "next/server";
import { fetchBackendJsonWithRetry } from "@/lib/backend-proxy";
import {
  inferDeployErrorCode,
  NETWORK_UNSTABLE_ERROR_CODE,
} from "@/lib/deploy-errors";
import { respData } from "@/lib/resp";
import {
  type OpenClawDashboardSnapshot,
  rewriteOpenClawDashboardSnapshotForRequest,
} from "@/lib/openclaw-dashboard-proxy";

function err(message: string, status = 400, errorCode?: string) {
  const resolvedErrorCode = errorCode || inferDeployErrorCode(message);
  return Response.json(
    {
      code: -1,
      message,
      error_code: resolvedErrorCode,
      errorCode: resolvedErrorCode,
    },
    { status }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return err("Missing deployment id", 400);
    }

    const { response, payload } = await fetchBackendJsonWithRetry(
      `/api/deploy/${id}/openclaw-dashboard/current`,
      {},
      { timeoutMs: 5_000, localTimeoutMs: 12_000, remoteTimeoutMs: 4_000 }
    );

    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }

    if (!response.ok) {
      const backendMessage =
        payload?.error || payload?.message || `Backend error: ${response.status}`;
      const backendErrorCode =
        payload?.error_code ||
        payload?.errorCode ||
        inferDeployErrorCode(backendMessage);
      return err(backendMessage, response.status, backendErrorCode);
    }

    const snapshot = (payload.data || payload) as OpenClawDashboardSnapshot;
    return respData(
      rewriteOpenClawDashboardSnapshotForRequest({
        snapshot,
        requestUrl: req.url,
        deploymentId: id,
      })
    );
  } catch (error) {
    console.error("deploy openclaw dashboard current GET error:", error);
    return err(NETWORK_UNSTABLE_ERROR_CODE, 502, NETWORK_UNSTABLE_ERROR_CODE);
  }
}


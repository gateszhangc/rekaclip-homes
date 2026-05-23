import { NextRequest } from "next/server";
import { fetchBackendJsonWithRetry } from "@/lib/backend-proxy";
import {
  inferDeployErrorCode,
  NETWORK_UNSTABLE_ERROR_CODE,
} from "@/lib/deploy-errors";
import { respData } from "@/lib/resp";
import { auth } from "@/auth";

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

// GET /api/deploy/:id - query deployment status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return err("Missing deployment id", 400);
    }

    const session = await auth();
    const sessionUserUuid = session?.user?.uuid?.trim();
    if (!sessionUserUuid) {
      return err("Unauthorized", 401);
    }

    const { response, payload, backendBaseUrl } = await fetchBackendJsonWithRetry(
      `/api/deploy/${id}`,
      {
        headers: {
          authorization: `Bearer ${sessionUserUuid}`,
        },
      },
      // Backend getDeployment can wait on Postgres (~10s connect/query). 12s was
      // too tight: fetch aborted → catch → misleading 502 "network unstable".
      { timeoutMs: 10_000, localTimeoutMs: 35_000, remoteTimeoutMs: 8_000 }
    );

    if (!response.ok) {
      const backendMessage =
        payload?.error || payload?.message || `Backend error: ${response.status}`;
      const backendErrorCode =
        payload?.error_code ||
        payload?.errorCode ||
        inferDeployErrorCode(backendMessage);
      return err(
        backendMessage,
        response.status,
        backendErrorCode
      );
    }

    if (process.env.NODE_ENV !== "production") {
      const status = payload?.status ?? payload?.data?.status ?? "?";
      const errorMessage = payload?.error_message ?? payload?.data?.error_message;
      console.log(
        `deploy GET proxied to backend: ${backendBaseUrl} -> id=${id} status=${status}${errorMessage ? ` error=${errorMessage}` : ""}`
      );
    }
    return respData(payload);
  } catch (e) {
    console.error("deploy GET error:", e);
    return err(NETWORK_UNSTABLE_ERROR_CODE, 502, NETWORK_UNSTABLE_ERROR_CODE);
  }
}

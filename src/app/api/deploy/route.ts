import { NextRequest } from "next/server";
import { fetchBackendJsonWithRetry } from "@/lib/backend-proxy";
import {
  BACKEND_TIMEOUT_ERROR_CODE,
  inferDeployErrorCode,
  NETWORK_UNSTABLE_ERROR_CODE,
} from "@/lib/deploy-errors";
import { respData } from "@/lib/resp";
import { auth } from "@/auth";
import { allocateDeploySubscriptionOrderByUserUuid } from "@/models/order";

function err(
  message: string,
  status = 400,
  errorCode?: string
) {
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

// POST /api/deploy - create deployment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel, channel_token, telegram_token, model } = body;
    const resolvedChannel = channel || (telegram_token ? "telegram" : undefined);
    const resolvedChannelToken = channel_token || telegram_token;

    if (!resolvedChannel) {
      return err("Missing channel", 400);
    }

    if (resolvedChannel !== "whatsapp" && !resolvedChannelToken) {
      return err("Missing channel_token", 400);
    }

    const session = await auth();
    const sessionUserUuid = session?.user?.uuid?.trim();
    if (!sessionUserUuid) {
      return err("Unauthorized", 401);
    }

    const allocation = await allocateDeploySubscriptionOrderByUserUuid(
      sessionUserUuid
    );
    const subscriptionTier = allocation?.tier;
    const subscriptionOrderNo = allocation?.orderNo;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      authorization: `Bearer ${sessionUserUuid}`,
    };
    if (subscriptionTier) {
      headers["x-subscription-tier"] = subscriptionTier;
    }
    if (subscriptionOrderNo) {
      headers["x-subscription-order-no"] = subscriptionOrderNo;
    }

    const { response, payload, backendBaseUrl } = await fetchBackendJsonWithRetry(
      "/api/deploy",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          channel: resolvedChannel,
          ...(resolvedChannelToken ? { channel_token: resolvedChannelToken } : {}),
          model,
          ...(subscriptionTier ? { tier: subscriptionTier } : {}),
          ...(subscriptionOrderNo
            ? { subscription_order_no: subscriptionOrderNo }
            : {}),
        }),
      },
      // Backend may wait on Postgres (existing deployment checks). 20s was too low → AbortError → misleading 502.
      { timeoutMs: 30_000, localTimeoutMs: 120_000, remoteTimeoutMs: 20_000 }
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
      console.log(
        `deploy POST proxied to backend: ${backendBaseUrl} -> deployment_id=${payload?.deployment_id ?? payload?.data?.deployment_id ?? "?"} status=${payload?.status ?? payload?.data?.status ?? "?"} channel=${resolvedChannel} tier=${subscriptionTier ?? "?"} order_no=${subscriptionOrderNo ?? "?"}`
      );
    }
    return respData(payload);
  } catch (e) {
    console.error("deploy POST error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    const isAbortError =
      (e instanceof Error && e.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        e instanceof DOMException &&
        e.name === "AbortError") ||
      /\bthis operation was aborted\b/i.test(msg) ||
      /\babort(ed)?\b/i.test(msg);
    if (isAbortError) {
      return err(
        "Deploy backend did not respond in time (database or deploy service may be slow). Please try again shortly.",
        504,
        BACKEND_TIMEOUT_ERROR_CODE
      );
    }
    return err(NETWORK_UNSTABLE_ERROR_CODE, 502, NETWORK_UNSTABLE_ERROR_CODE);
  }
}

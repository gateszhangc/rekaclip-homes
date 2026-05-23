import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  HOME_URL,
  TEST_BASE_URL,
  resolveCookieHostNeedles,
  withBrowserPage,
} from "./shared";
import { importSystemBrowserCookies } from "./system-browser-cookies";

const TELEGRAM_TOKEN =
  process.env.REAL_DEPLOY_TELEGRAM_TOKEN?.trim() ||
  process.env.TEST_TELEGRAM_TOKEN?.trim() ||
  "";
const SYSTEM_BROWSER_NAME = process.env.SYSTEM_BROWSER_NAME?.trim() || "Chrome";
const SYSTEM_BROWSER_PROFILE = process.env.SYSTEM_BROWSER_PROFILE?.trim() || "";
const SYSTEM_BROWSER_EMAIL = process.env.SYSTEM_BROWSER_EMAIL?.trim() || "";
const OUTPUT_DIR =
  process.env.REAL_DEPLOY_OUTPUT_DIR?.trim() || join(".tmp", "browser-debug");
const DEPLOY_TIMEOUT_MS = Number(
  process.env.REAL_DEPLOY_TIMEOUT_MS || 10 * 60 * 1000
);

async function fetchJsonViaPage(page: Parameters<typeof withBrowserPage>[0] extends (
  session: infer Session
) => Promise<void>
  ? Session["page"]
  : never, url: string, init?: RequestInit) {
  return page.evaluate(
    async ({ targetUrl, requestInit }) => {
      const response = await fetch(targetUrl, requestInit);
      const payload = await response.json().catch(() => null);
      return {
        status: response.status,
        ok: response.ok,
        payload,
      };
    },
    { targetUrl: url, requestInit: init }
  );
}

async function waitForDeploymentResult(
  page: Parameters<typeof withBrowserPage>[0] extends (session: infer Session) => Promise<void>
    ? Session["page"]
    : never,
  deploymentId: string
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < DEPLOY_TIMEOUT_MS) {
    const statusResponse = await fetchJsonViaPage(
      page,
      `${TEST_BASE_URL}/api/deploy/${deploymentId}`
    );
    const data = statusResponse.payload?.data || statusResponse.payload;
    const status = data?.status;

    if (!statusResponse.ok || statusResponse.payload?.code === -1) {
      return {
        ok: false,
        status,
        payload: statusResponse.payload,
      };
    }

    if (status === "running") {
      return {
        ok: true,
        status,
        payload: data,
      };
    }

    if (status === "failed") {
      return {
        ok: false,
        status,
        payload: data,
      };
    }

    await page.waitForTimeout(5000);
  }

  return {
    ok: false,
    status: "timeout",
    payload: { message: `Timed out after ${Math.round(DEPLOY_TIMEOUT_MS / 1000)}s` },
  };
}

async function main() {
  if (!TELEGRAM_TOKEN) {
    throw new Error(
      "Missing REAL_DEPLOY_TELEGRAM_TOKEN. Set it before running the real deploy smoke."
    );
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const imported = await importSystemBrowserCookies({
    browserName: SYSTEM_BROWSER_NAME,
    profileName: SYSTEM_BROWSER_PROFILE || undefined,
    email: SYSTEM_BROWSER_EMAIL || undefined,
    hostNeedles: resolveCookieHostNeedles(),
  });

  console.log(
    `Using ${imported.profile.browserName}/${imported.profile.profileName} with ${imported.profile.matchingCookieCount} localhost cookies`
  );

  let deployRequestBody: Record<string, unknown> | null = null;
  let deployCreatePayload: Record<string, unknown> | null = null;

  await withBrowserPage(
    async ({ page }) => {
      page.on("console", (message) => {
        if (message.type() === "error") {
          console.log(`[browser:${message.type()}] ${message.text()}`);
        }
      });

      page.on("request", (request) => {
        if (
          request.method() === "POST" &&
          request.url().endsWith("/api/deploy")
        ) {
          deployRequestBody =
            (request.postDataJSON() as Record<string, unknown>) || null;
        }
      });

      page.on("response", async (response) => {
        if (
          response.request().method() === "POST" &&
          response.url().endsWith("/api/deploy")
        ) {
          deployCreatePayload =
            ((await response.json().catch(() => null)) as Record<string, unknown> | null) ||
            null;
        }
      });

      await page.goto(HOME_URL, { waitUntil: "networkidle" });
      await page.screenshot({
        path: join(OUTPUT_DIR, "real-deploy-home.png"),
        fullPage: false,
      });

      const userInfoResponse = await fetchJsonViaPage(
        page,
        `${TEST_BASE_URL}/api/get-user-info`,
        {
          method: "POST",
        }
      );
      const userInfo = userInfoResponse.payload?.data;

      if (!userInfoResponse.ok || userInfoResponse.payload?.code !== 0 || !userInfo) {
        throw new Error(
          `Local auth session is not available for ${TEST_BASE_URL}: ${JSON.stringify(userInfoResponse.payload)}`
        );
      }

      if (userInfo.canDeploy !== true) {
        throw new Error(
          `User ${userInfo.email || userInfo.uuid || "<unknown>"} is not deploy-eligible: ${JSON.stringify({
            canDeploy: userInfo.canDeploy,
            hasActiveSubscription: userInfo.hasActiveSubscription,
            remainingDeployQuota: userInfo.remainingDeployQuota,
            subscriptionTier: userInfo.subscriptionTier,
          })}`
        );
      }

      const gpt54Card = page.getByRole("button", { name: /GPT-5\.4/i });
      await gpt54Card.click();

      await page.getByRole("button", { name: /Telegram/i }).click();

      const telegramDialog = page.getByRole("dialog", {
        name: /Connect Telegram/i,
      });
      await telegramDialog
        .getByPlaceholder("1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
        .fill(TELEGRAM_TOKEN);
      await telegramDialog.getByRole("button", { name: /Save & Connect/i }).click();

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().endsWith("/api/deploy"),
        { timeout: 30_000 }
      );

      await page.getByRole("button", { name: /^Deploy$/i }).click();

      const createResponse = await createResponsePromise;
      const createPayload =
        (await createResponse.json().catch(() => null)) || deployCreatePayload;
      const createData = createPayload?.data || createPayload;

      if (!deployRequestBody) {
        throw new Error("Homepage never issued POST /api/deploy.");
      }

      if (deployRequestBody.model !== "gpt-5-4") {
        throw new Error(
          `Homepage sent an unexpected model: ${JSON.stringify(deployRequestBody)}`
        );
      }

      if (deployRequestBody.channel !== "telegram") {
        throw new Error(
          `Homepage sent an unexpected channel: ${JSON.stringify(deployRequestBody)}`
        );
      }

      if (!deployRequestBody.channel_token) {
        throw new Error(
          `Homepage did not send channel_token: ${JSON.stringify(deployRequestBody)}`
        );
      }

      if (Object.prototype.hasOwnProperty.call(deployRequestBody, "telegram_token")) {
        throw new Error(
          `Homepage should no longer send legacy telegram_token: ${JSON.stringify(deployRequestBody)}`
        );
      }

      if (!createResponse.ok || createPayload?.code === -1 || !createData?.deployment_id) {
        throw new Error(
          `Deploy creation failed: status=${createResponse.status()} payload=${JSON.stringify(createPayload)}`
        );
      }

      const deploymentId = String(createData.deployment_id);
      const finalState = await waitForDeploymentResult(page, deploymentId);

      await page.screenshot({
        path: join(OUTPUT_DIR, finalState.ok ? "real-deploy-success.png" : "real-deploy-failed.png"),
        fullPage: true,
      });

      if (!finalState.ok) {
        throw new Error(
          `Deployment ${deploymentId} did not reach running: ${JSON.stringify(finalState.payload)}`
        );
      }

      const requestedModel =
        finalState.payload?.requested_model ||
        finalState.payload?.requestedModel ||
        null;
      const resolvedModel =
        finalState.payload?.resolved_model ||
        finalState.payload?.resolvedModel ||
        null;

      if (requestedModel !== "gpt-5-4") {
        throw new Error(
          `Unexpected requested_model for ${deploymentId}: ${JSON.stringify(finalState.payload)}`
        );
      }

      if (!resolvedModel || String(resolvedModel) !== "openrouter/openai/gpt-5.4") {
        throw new Error(
          `Unexpected resolved_model for ${deploymentId}: ${JSON.stringify(finalState.payload)}`
        );
      }

      console.log(
        JSON.stringify(
          {
            user: userInfo.email || userInfo.uuid || null,
            deploymentId,
            requestedModel,
            resolvedModel,
            status: finalState.status,
          },
          null,
          2
        )
      );
    },
    {
      cookies: imported.cookies,
      channel: imported.profile.browserName === "Chrome" ? "chrome" : undefined,
      headless: process.env.REAL_DEPLOY_HEADLESS !== "false",
    }
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

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

async function fetchJsonViaPage(
  page: Parameters<typeof withBrowserPage>[0] extends (session: infer Session) => Promise<void>
    ? Session["page"]
    : never,
  url: string,
  init?: RequestInit
) {
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

function resolvePayloadData(payload: any) {
  return payload?.data || payload;
}

async function main() {
  if (!TELEGRAM_TOKEN) {
    throw new Error(
      "Missing REAL_DEPLOY_TELEGRAM_TOKEN or TEST_TELEGRAM_TOKEN for deploy dedup smoke."
    );
  }

  const imported = await importSystemBrowserCookies({
    browserName: SYSTEM_BROWSER_NAME,
    profileName: SYSTEM_BROWSER_PROFILE || undefined,
    email: SYSTEM_BROWSER_EMAIL || undefined,
    hostNeedles: resolveCookieHostNeedles(),
  });

  console.log(
    `Using ${imported.profile.browserName}/${imported.profile.profileName} with ${imported.profile.matchingCookieCount} imported cookies`
  );

  await withBrowserPage(
    async ({ page }) => {
      await page.goto(HOME_URL, { waitUntil: "networkidle" });

      const userInfoResponse = await fetchJsonViaPage(
        page,
        `${TEST_BASE_URL}/api/get-user-info`,
        { method: "POST" }
      );
      const userInfo = userInfoResponse.payload?.data;
      if (!userInfoResponse.ok || userInfoResponse.payload?.code !== 0 || !userInfo) {
        throw new Error(
          `No authenticated staging session for ${TEST_BASE_URL}: ${JSON.stringify(userInfoResponse.payload)}`
        );
      }

      const requestInit: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "telegram",
          channel_token: TELEGRAM_TOKEN,
          model: "gpt-5-4",
        }),
      };

      const first = await fetchJsonViaPage(page, `${TEST_BASE_URL}/api/deploy`, requestInit);
      const firstPayload = resolvePayloadData(first.payload);
      if (!first.ok || first.payload?.code === -1 || !firstPayload?.deployment_id) {
        throw new Error(`First deploy failed: ${JSON.stringify(first.payload)}`);
      }

      const second = await fetchJsonViaPage(page, `${TEST_BASE_URL}/api/deploy`, requestInit);
      const secondPayload = resolvePayloadData(second.payload);

      if (second.ok && second.payload?.code !== -1) {
        if (!secondPayload?.deployment_id) {
          throw new Error(`Second deploy returned OK without deployment id: ${JSON.stringify(second.payload)}`);
        }
        if (secondPayload.deployment_id !== firstPayload.deployment_id) {
          throw new Error(
            `Second deploy created a different deployment id: first=${firstPayload.deployment_id} second=${secondPayload.deployment_id}`
          );
        }
      } else {
        const errorCode = String(
          second.payload?.error_code ||
            second.payload?.errorCode ||
            second.payload?.message ||
            ""
        ).toUpperCase();
        if (!errorCode.includes("DEPLOYMENT_SEAT_UNAVAILABLE")) {
          throw new Error(`Unexpected second deploy response: ${JSON.stringify(second.payload)}`);
        }
      }

      console.log(
        JSON.stringify(
          {
            baseUrl: TEST_BASE_URL,
            firstDeploymentId: firstPayload.deployment_id,
            secondStatus: second.status,
            secondPayload: secondPayload || second.payload,
          },
          null,
          2
        )
      );
    },
    {
      headless: process.env.REAL_DEPLOY_HEADLESS !== "false",
      channel: "chrome",
      cookies: imported.cookies,
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Cookie,
  type Page,
} from "playwright";

export const TEST_BASE_URL =
  process.env.TEST_BASE_URL?.trim() || "http://localhost:3000";
export const HOME_URL = `${TEST_BASE_URL}/en`;

export function resolveCookieHostNeedles(baseUrl = TEST_BASE_URL): string[] {
  const fallback = ["localhost", "127.0.0.1"];

  try {
    const { hostname } = new URL(baseUrl);
    const needles = new Set<string>(fallback);

    if (!hostname) {
      return [...needles];
    }

    needles.add(hostname);

    const parts = hostname.split(".").filter(Boolean);
    if (parts.length >= 2) {
      needles.add(parts.slice(-2).join("."));
    }

    return [...needles];
  } catch {
    return fallback;
  }
}

type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  baseUrl: string;
  homeUrl: string;
};

export async function withBrowserPage(
  run: (session: BrowserSession) => Promise<void>,
  options?: {
    headless?: boolean;
    channel?: "chrome";
    cookies?: Cookie[];
  }
): Promise<void> {
  const browser = await chromium.launch({
    headless: options?.headless ?? true,
    channel: options?.channel,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  if (options?.cookies?.length) {
    await context.addCookies(options.cookies);
  }
  const page = await context.newPage();

  try {
    await run({
      browser,
      context,
      page,
      baseUrl: TEST_BASE_URL,
      homeUrl: HOME_URL,
    });
  } finally {
    await browser.close();
  }
}

export async function gotoHome(page: Page, waitMs = 3000): Promise<void> {
  console.log(`Opening homepage: ${HOME_URL}`);
  await page.goto(HOME_URL, { waitUntil: "networkidle" });
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}

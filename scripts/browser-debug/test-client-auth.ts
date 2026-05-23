import { gotoHome, withBrowserPage } from "./shared";

async function testClientAuth() {
  await withBrowserPage(async ({ page }) => {
    page.on("console", (message) => {
      if (message.text().includes("AUTH_DEBUG")) {
        console.log(`[Browser] ${message.text()}`);
      }
    });

    await gotoHome(page);

    const authStatus = await page.evaluate(() => {
      const env = (window as typeof window & { __ENV?: Record<string, unknown> })
        .__ENV || {};
      return {
        NEXT_PUBLIC_AUTH_GOOGLE_ID: Boolean(env.NEXT_PUBLIC_AUTH_GOOGLE_ID),
        NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
        NEXT_PUBLIC_AUTH_DISABLED: env.NEXT_PUBLIC_AUTH_DISABLED,
        NEXT_PUBLIC_AUTH_ENABLED: env.NEXT_PUBLIC_AUTH_ENABLED,
      };
    });

    console.log("\nClient environment:");
    console.log(authStatus);

    const html = await page.content();
    const hasSignToggle =
      html.includes("SignToggle") ||
      html.includes("sign_in") ||
      html.includes("Sign in");
    console.log(`\nPage contains auth-related UI: ${hasSignToggle}`);
  });
}

testClientAuth().catch(console.error);

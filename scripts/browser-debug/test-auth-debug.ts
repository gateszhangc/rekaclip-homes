import { gotoHome, withBrowserPage } from "./shared";

async function debugAuth() {
  await withBrowserPage(async ({ page }) => {
    await gotoHome(page);

    await page.screenshot({
      path: "/tmp/debug-header.png",
      clip: { x: 800, y: 0, width: 640, height: 80 },
    });
    console.log("Header screenshot: /tmp/debug-header.png");

    const buttons = await page.locator("header button, nav button").all();
    console.log(`\nButton count: ${buttons.length}`);
    for (const button of buttons) {
      const text = (await button.textContent().catch(() => "")) || "";
      console.log(`  - "${text.trim()}"`);
    }

    const signToggleCount = await page
      .locator('[class*="sign"], [class*="user"]')
      .count();
    console.log(`\nSign/User elements: ${signToggleCount}`);
  });
}

debugAuth().catch(console.error);

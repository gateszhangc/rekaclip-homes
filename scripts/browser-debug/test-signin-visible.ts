import { gotoHome, withBrowserPage } from "./shared";

async function testSignInButton() {
  await withBrowserPage(async ({ page }) => {
    await gotoHome(page);

    await page.screenshot({
      path: "/tmp/header-with-signin.png",
      clip: { x: 900, y: 0, width: 540, height: 80 },
    });
    console.log("Header screenshot: /tmp/header-with-signin.png");

    const signInTextCount = await page.locator("text=/Sign in/i").count();
    const signInButtonCount = await page.locator('button:has-text("Sign")').count();
    console.log(`   "Sign in" text count: ${signInTextCount}`);
    console.log(`   Sign button count: ${signInButtonCount}`);

    const buttons = await page.locator("header button").all();
    console.log(`   Header button count: ${buttons.length}`);
    for (const button of buttons) {
      const text = (await button.textContent().catch(() => "")) || "";
      console.log(`     - "${text.trim()}"`);
    }
  });

  console.log("Done");
}

testSignInButton().catch(console.error);

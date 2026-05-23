import { gotoHome, withBrowserPage } from "./shared";

async function testSignInClick() {
  await withBrowserPage(async ({ page }) => {
    await gotoHome(page);

    await page.screenshot({
      path: "/tmp/test-1-header.png",
      clip: { x: 900, y: 0, width: 540, height: 80 },
    });
    console.log("Header screenshot: /tmp/test-1-header.png");

    console.log("\nClicking Sign In button...");
    const signInButton = page
      .locator('nav button:has-text("Sign In"), header button:has-text("Sign In")')
      .first();

    if (await signInButton.count()) {
      console.log("   Found Sign In button");
      await signInButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: "/tmp/test-2-after-click.png" });
      console.log("After-click screenshot: /tmp/test-2-after-click.png");

      const modalContentCount = await page
        .locator("text=/Welcome to EasyClaw|Continue with Google/i")
        .count();
      console.log(
        `   Modal content check: ${
          modalContentCount > 0 ? "found sign-in modal" : "modal not found"
        }`
      );

      const googleButtonCount = await page
        .locator('button:has-text("Continue with Google")')
        .count();
      console.log(
        `   Google sign-in button: ${
          googleButtonCount > 0 ? "present" : "missing"
        }`
      );

      await page.screenshot({
        path: "/tmp/test-3-modal.png",
        clip: { x: 400, y: 200, width: 640, height: 500 },
      });
      console.log("Modal screenshot: /tmp/test-3-modal.png");
    } else {
      console.log("   Sign In button not found");
    }
  });

  console.log("\nDone");
}

testSignInClick().catch(console.error);

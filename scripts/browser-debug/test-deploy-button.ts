import { gotoHome, withBrowserPage } from "./shared";

async function testDeployButton() {
  await withBrowserPage(async ({ page }) => {
    await gotoHome(page, 2000);

    console.log("\nChecking deploy button...");
    const deployButton = page.locator('button:has-text("Deploy")').first();

    if (await deployButton.count()) {
      await deployButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      const buttonText = await deployButton.textContent();
      console.log(`   Button text: "${buttonText}"`);

      await page.screenshot({
        path: "/tmp/deploy-button-area.png",
        clip: { x: 400, y: 700, width: 600, height: 200 },
      });
      console.log("Deploy button screenshot: /tmp/deploy-button-area.png");

      console.log("\nClicking deploy button...");
      await deployButton.click();
      await page.waitForTimeout(1500);

      const modalCount = await page
        .locator('[class*="modal"], [class*="dialog"], [role="dialog"]')
        .count();
      console.log(`   Modal count: ${modalCount}`);

      await page.screenshot({ path: "/tmp/after-click.png" });
      console.log("After-click screenshot: /tmp/after-click.png");
    }
  });

  console.log("\nDone");
}

testDeployButton().catch(console.error);

import { gotoHome, withBrowserPage } from "./shared";

async function testLoginButton() {
  await withBrowserPage(async ({ page }) => {
    await gotoHome(page);

    console.log("\nChecking header right area...");

    await page.screenshot({
      path: "/tmp/header-right.png",
      clip: { x: 1000, y: 0, width: 440, height: 100 },
    });
    console.log("Header-right screenshot: /tmp/header-right.png");

    const allButtons = await page.locator("header button, nav button").all();
    console.log(`   Header/nav button count: ${allButtons.length}`);

    for (let index = 0; index < allButtons.length; index += 1) {
      const text = (await allButtons[index].textContent().catch(() => "")) || "";
      const className =
        (await allButtons[index].getAttribute("class").catch(() => "")) || "";
      console.log(
        `   Button ${index + 1}: "${text}" | class: ${className.substring(0, 50)}...`
      );
    }

    const signElements = await page
      .locator('[class*="sign"], [class*="login"], [class*="user"]')
      .all();
    console.log(`\n   Auth/user related element count: ${signElements.length}`);

    const deployButtonCount = await page
      .locator('button:has-text("Deploy")')
      .count();
    const signInButtonCount = await page
      .locator('button:has-text("Sign")')
      .count();
    console.log(`   Deploy buttons: ${deployButtonCount}`);
    console.log(`   Sign buttons: ${signInButtonCount}`);

    console.log("\nChecking SimpleClawLanding area...");
    const deploySection = page.locator(
      "text=/Deploy OpenClaw in under 1 minute/i"
    );
    if (await deploySection.count()) {
      await deploySection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "/tmp/deploy-section.png" });
      console.log("Deploy section screenshot: /tmp/deploy-section.png");
    }
  });
  console.log("\nDone");
}

testLoginButton().catch(console.error);

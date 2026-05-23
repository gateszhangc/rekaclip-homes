import { gotoHome, withBrowserPage } from "./shared";

async function testHomepage() {
  await withBrowserPage(async ({ page }) => {
    await gotoHome(page);

    await page.screenshot({ path: "/tmp/homepage-test.png", fullPage: false });
    console.log("Homepage screenshot: /tmp/homepage-test.png");

    console.log("\nTest 1: sign-in UI");
    const signInButton = page.locator("text=/Sign in|Sign In|登录/i").first();
    const isSignInVisible = await signInButton.isVisible().catch(() => false);

    if (isSignInVisible) {
      console.log("Sign-in button is visible");
    } else {
      const headerButtonCount = await page
        .locator("header button, nav button")
        .count();
      console.log(`   Header/nav button count: ${headerButtonCount}`);

      const userElementCount = await page
        .locator('[class*="user"], [class*="sign"], [class*="login"]')
        .count();
      console.log(`   Auth/user related elements: ${userElementCount}`);
    }

    console.log("\nTest 2: feature section icons");
    const featureSection = page.locator("text=/Why teams choose EasyClaw/i");
    if (await featureSection.count()) {
      await featureSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: "/tmp/feature-section-test.png" });
      console.log("Feature section screenshot: /tmp/feature-section-test.png");

      const iconCount = await page
        .locator(".landing-section svg, [class*=\"icon\"] svg")
        .count();
      console.log(`   Icon count: ${iconCount}`);
    }

    console.log("\nTest 3: feature copy");
    const featureSectionCount = await page.locator(".landing-section").count();
    console.log(`   Feature section count: ${featureSectionCount}`);

    const pageContent = await page.content();
    const hasDeploy60 = pageContent.includes("Deploy in 60 seconds");
    const hasZeroMaintenance = pageContent.includes("Zero maintenance");
    const hasModelFlex = pageContent.includes("Model flexibility");

    console.log(`   Deploy in 60 seconds: ${hasDeploy60}`);
    console.log(`   Zero maintenance: ${hasZeroMaintenance}`);
    console.log(`   Model flexibility: ${hasModelFlex}`);
  });

  console.log("\nDone");
}

testHomepage().catch(console.error);

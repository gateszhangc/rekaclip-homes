import { expect, test } from "@playwright/test";

test("console layout keeps nav avatar and does not render a duplicate avatar", async ({
  page,
}) => {
  await page.goto("/en/console-layout-fixture");

  await expect(page.getByTestId("console-layout-fixture-nav")).toBeVisible();
  await expect(page.getByTestId("console-sidebar")).toBeVisible();
  await expect(page.getByTestId("console-layout-fixture-content")).toBeVisible();

  await expect(page.locator('[data-slot="dropdown-menu-trigger"]')).toHaveCount(1);

  await page.getByTestId("console-layout-nav-trigger").click();
  await expect(page.getByTestId("console-layout-nav-content")).toBeVisible();
  await expect(page.getByTestId("console-layout-nav-content")).toContainText("User Center");
});

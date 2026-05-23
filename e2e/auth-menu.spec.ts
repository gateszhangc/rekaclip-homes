import { expect, test } from "@playwright/test";

test("authenticated user menu only shows admin entry for admin users", async ({
  page,
}) => {
  await page.goto("/en/auth-menu-fixture");

  await page.getByTestId("auth-menu-admin-trigger").click();
  const adminMenu = page.getByTestId("auth-menu-admin-content");
  await expect(adminMenu).toBeVisible();
  await expect(adminMenu).toContainText("Admin System");
  await expect(adminMenu).toContainText("User Center");

  await page.keyboard.press("Escape");
  await expect(adminMenu).not.toBeVisible();

  await page.getByTestId("auth-menu-member-trigger").click();
  const memberMenu = page.getByTestId("auth-menu-member-content");
  await expect(memberMenu).toBeVisible();
  await expect(memberMenu).toContainText("User Center");
  await expect(memberMenu).not.toContainText("Admin System");
});

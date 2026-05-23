import { expect, test } from "@playwright/test";

test("admin dashboard loads when auth is disabled in browser tests", async ({
  page,
}) => {
  await page.goto("/en/admin");

  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByText("Image Describer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(page.getByText("Total users registered in the system")).toBeVisible();
});

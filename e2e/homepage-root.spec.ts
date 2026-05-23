import { expect, test } from "@playwright/test";

test("root path resolves to the localized homepage", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("button", { name: /GPT-5\.4/i })).toBeVisible();
});

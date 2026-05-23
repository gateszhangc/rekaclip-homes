import { expect, test } from "@playwright/test";

test("admin account add page exposes Kie presets as explicit routing only", async ({
  page,
}) => {
  await page.goto("/en/admin/accounts/add");

  const providerSelect = page.getByRole("combobox").first();

  await providerSelect.click();
  await page.getByRole("option", { name: "Kie" }).click();

  await expect(
    page.locator('#model-presets option[value="kie-gpt/gpt-5-4"]')
  ).toHaveCount(1);
  await expect(
    page.locator('#model-presets option[value="kie-claude/claude-opus-4-6"]')
  ).toHaveCount(1);
  await expect(
    page.locator('#model-presets option[value="kie-gemini/gemini-3.1-pro"]')
  ).toHaveCount(1);
  await expect(
    page.getByText(
      "Kie presets are only for explicit Kie routing. Homepage deploys default to OpenRouter."
    )
  ).toBeVisible();

  await providerSelect.click();
  await page.getByRole("option", { name: "Google" }).click();

  await expect(
    page.locator('#model-presets option[value="kie-gemini/gemini-3.1-pro"]')
  ).toHaveCount(0);
  await expect(
    page.locator('#model-presets option[value="gemini-3-pro"]')
  ).toHaveCount(0);
  await expect(
    page.locator('#model-presets option[value="google/gemini-3-pro-preview"]')
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Google presets here are for Gemini Flash. Gemini 3.1 Pro defaults to OpenRouter on the homepage."
    )
  ).toBeVisible();
});

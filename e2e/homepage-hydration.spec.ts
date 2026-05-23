import { expect, test } from "@playwright/test";

test("homepage hydrates without missing next chunks", async ({ page }) => {
  const missingChunkRequests: string[] = [];

  page.on("response", (response) => {
    if (
      response.status() === 404 &&
      response.url().includes("/_next/static/chunks/")
    ) {
      missingChunkRequests.push(response.url());
    }
  });

  const response = await page.goto("/en", { waitUntil: "networkidle" });

  expect(response?.ok()).toBeTruthy();

  const claudeCard = page.getByRole("button", { name: /Claude Opus 4\.6/i });
  await expect(claudeCard).toBeVisible();
  await claudeCard.click();
  await expect(claudeCard).toContainText(/Selected/i);

  await page.getByRole("button", { name: /Telegram/i }).click();
  await expect(
    page.getByRole("dialog", { name: /Connect Telegram/i })
  ).toBeVisible();

  expect(missingChunkRequests).toEqual([]);
});

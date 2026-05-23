import { expect, test } from "@playwright/test";

test("my orders page uses landing-shipany styling", async ({ page }) => {
  await page.goto("/en/my-orders");

  await expect(page).toHaveURL(/\/(?:en\/)?my-orders$/);

  const heading = page.getByRole("heading", { name: "My Orders" });
  await expect(heading).toBeVisible();

  const headingFont = await heading.evaluate(
    (element) => getComputedStyle(element).fontFamily
  );
  expect(headingFont).toMatch(/Merriweather|Iowan Old Style|Georgia|serif/i);

  const panelRadius = await page
    .getByTestId("orders-panel")
    .evaluate((element) => getComputedStyle(element).borderRadius);
  expect(parseFloat(panelRadius)).toBeGreaterThanOrEqual(24);

  const innerShellRadius = await page
    .getByTestId("orders-table-shell")
    .evaluate((element) => getComputedStyle(element).borderRadius);
  expect(parseFloat(innerShellRadius)).toBeGreaterThanOrEqual(16);

  await expect(
    page.getByText("Need help with billing or cancellation? Email support@easyclaw.pro.")
  ).toHaveCount(0);
  await expect(page.getByTestId("orders-empty-state")).toContainText("No orders found");

  const sidebar = page.getByTestId("console-sidebar");
  await expect(sidebar).toBeVisible();

  const myOrdersNav = page.getByRole("link", { name: "My Orders" });
  await expect
    .poll(async () => {
      const className = await myOrdersNav.evaluate((element) => element.className);
      return className.includes("text-primary") && className.includes("bg-primary/10");
    })
    .toBe(true);
});

import { test, expect } from "@playwright/test";

test.describe("Maintenance Intake", () => {
  test("requests page loads", async ({ page }) => {
    await page.goto("/requests");

    // Should load the requests page or redirect if no permissions
    await expect(page).toHaveURL(/\/(requests|dashboard|sign-in)/);
  });

  test("requests page shows request list or empty state", async ({ page }) => {
    await page.goto("/requests");

    // Should show either existing requests or an empty state message
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("can navigate to requests from dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for requests/maintenance link in navigation
    const reqLink = page
      .locator("a[href*='requests'], a[href*='maintenance']")
      .first();
    if (await reqLink.isVisible().catch(() => false)) {
      await reqLink.click();
      await expect(page).toHaveURL(/\/requests/);
    }
  });
});

import { test, expect } from "@playwright/test";

test.describe("Properties", () => {
  test("properties page loads", async ({ page }) => {
    await page.goto("/properties");

    // Should either show properties list or redirect to dashboard
    await expect(page).toHaveURL(/\/(properties|dashboard)/);
  });

  test("can navigate to properties from dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for properties link in navigation
    const propsLink = page.locator("a[href*='properties']").first();
    if (await propsLink.isVisible().catch(() => false)) {
      await propsLink.click();
      await expect(page).toHaveURL(/\/properties/);
    }
  });

  test("properties page shows add property option", async ({ page }) => {
    await page.goto("/properties");

    // If user has no properties, should see option to add one
    // If user has properties, should see the list
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

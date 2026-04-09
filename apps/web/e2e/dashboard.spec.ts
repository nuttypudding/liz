import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("renders the main dashboard page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    // Page should have loaded
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows navigation sidebar or bottom nav", async ({ page }) => {
    await page.goto("/dashboard");

    // Should have some form of navigation
    const sidebar = page.locator("[data-slot='sidebar']");
    const bottomNav = page.locator("nav");

    const hasSidebar = await sidebar.isVisible().catch(() => false);
    const hasNav = await bottomNav.first().isVisible().catch(() => false);

    expect(hasSidebar || hasNav).toBe(true);
  });

  test("dashboard loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Filter out known non-critical errors (like favicon 404s)
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

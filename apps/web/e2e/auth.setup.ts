import { test as setup, expect } from "@playwright/test";
import { TEST_ACCOUNTS } from "./fixtures/test-accounts";

const authFile = "playwright/.clerk/user.json";
const account = TEST_ACCOUNTS.landlord;

setup("authenticate as landlord", async ({ page }) => {
  // Navigate to sign-up page
  await page.goto("/sign-up");

  // Fill the sign-up form with test email
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: /continue/i }).click();

  // Enter verification code (424242 for +clerk_test emails)
  // Clerk shows a code input after sign-up
  const codeInput = page.getByLabel(/code/i).first();
  if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await codeInput.fill(account.verificationCode);
    await page.getByRole("button", { name: /verify/i }).click();
  }

  // Wait for redirect to dashboard (authenticated state)
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});

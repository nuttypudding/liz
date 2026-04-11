/**
 * Production smoke test — onboarding wizard end-to-end.
 *
 * Usage:   node e2e-prod/onboarding-smoke.mjs
 * Env:     CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (loaded from .env.prod)
 *
 * Flow:
 *   1. Create a user via Clerk backend SDK (bypasses sign-up UI + captcha).
 *   2. Open prod URL in headless chromium.
 *   3. Inject Clerk testing token.
 *   4. Sign in as the test user via `clerk.signIn` ticket strategy.
 *   5. Navigate to /onboarding and walk the 5-step wizard.
 *   6. Report API errors with full response bodies on failure.
 *   7. Clean up the test user.
 *
 * Exit code 0 = pass, non-zero = fail.
 */

import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClerkClient } from "@clerk/backend";
import { clerkSetup, setupClerkTestingToken, clerk } from "@clerk/testing/playwright";

// ─────────────── Load env ───────────────
function loadEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnv(".env.prod");
loadEnv(".env.local");

const PROD_URL = process.env.PROD_URL || "https://web-lovat-sigma-36.vercel.app";
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_SECRET_KEY || !CLERK_PUBLISHABLE_KEY) {
  console.error("Missing CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in env");
  process.exit(1);
}

// clerkSetup() reads these names
process.env.CLERK_PUBLISHABLE_KEY = CLERK_PUBLISHABLE_KEY;

const UNIQUE = Date.now().toString(36);
const USERNAME = `landlord_${UNIQUE}`;
const EMAIL = `landlord_${UNIQUE}@example.com`;
const PASSWORD = "TestLandlord123!";
// Clerk test phone numbers: +15555550100-+15555550199
const PHONE = `+1555555${String(100 + (Date.now() % 100)).padStart(4, "0")}`;

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function fail(step, msg) {
  console.error(`\nFAIL at [${step}]: ${msg}`);
  process.exit(1);
}

async function main() {
  // ─────────────── Phase 1: Create user via backend API ───────────────
  log("setup", "Configuring Clerk testing tokens");
  await clerkSetup();

  const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

  log("user-create", `Creating Clerk user ${EMAIL}`);
  let userId;
  try {
    const user = await clerkClient.users.createUser({
      emailAddress: [EMAIL],
      phoneNumber: [PHONE],
      username: USERNAME,
      password: PASSWORD,
      skipPasswordChecks: true,
      publicMetadata: { role: "landlord" },
    });
    userId = user.id;
    log("user-create", `Created user ${userId} (role=landlord pre-set — testing tokens don't propagate metadata updates)`);
  } catch (err) {
    console.error("\nFull Clerk error:");
    console.error(JSON.stringify(err, null, 2).slice(0, 2000));
    if (err?.errors) {
      for (const e of err.errors) {
        console.error(`  - ${e.code}: ${e.message} (${e.meta?.paramName || "?"})`);
      }
    }
    fail("user-create", `Clerk createUser failed: ${err?.errors?.[0]?.message || err.message}`);
  }

  // ─────────────── Phase 2: Browser + sign-in ───────────────
  log("browser", "Launching chromium");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture API errors (all methods, so we see 403s on GET too)
  const apiResponses = [];
  page.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      let body = "";
      try { body = await res.text(); } catch {}
      apiResponses.push({
        url: res.url(),
        status: res.status(),
        method: res.request().method(),
        body: body.slice(0, 600),
      });
    }
  });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    log("signin", `Opening ${PROD_URL}`);
    await page.goto(PROD_URL, { waitUntil: "domcontentloaded" });

    log("signin", "Injecting Clerk testing token");
    await setupClerkTestingToken({ context });

    log("signin", `Signing in as ${EMAIL}`);
    await clerk.signIn({ page, emailAddress: EMAIL });

    log("signin", "Navigating to /onboarding");
    await page.goto(`${PROD_URL}/onboarding`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    log("signin", `At ${page.url()}`);

    // ─────────────── Phase 2b: Role select (safety fallback) ───────────────
    // With role pre-set at user creation, we should land on /onboarding directly.
    // If we still hit /role-select, fail with a clear message.
    if (page.url().includes("/role-select")) {
      throw new Error(
        "Unexpected redirect to /role-select — user was created with role=landlord in publicMetadata. " +
        "Check that Clerk testing tokens include publicMetadata in session claims."
      );
    }

    // ─────────────── Phase 3: Wizard ───────────────
    // Step 1: AI Preferences
    log("wizard-1", "AI Preferences — clicking Next");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^next$|^continue$/i }).first().click();

    // Step 2: Property
    log("wizard-2", "Property — filling form");
    await page.getByLabel(/property name/i).fill("Woodgate");
    await page.getByLabel(/street address/i).fill("1821 E Woodgate Dr");
    await page.getByLabel(/city/i).fill("West Covina");
    await page.getByLabel(/^state$/i).fill("CA");
    await page.getByLabel(/zip code|postal code/i).fill("91791");
    log("wizard-2", "Clicking Next");
    await page.getByRole("button", { name: /^next$|^continue$/i }).first().click();

    // Step 3: Tenants — skip
    log("wizard-3", "Tenants — skipping");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^next$|skip/i }).first().click();

    // Step 4: Vendors — skip
    log("wizard-4", "Vendors — skipping");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^next$|skip/i }).first().click();

    // Step 5: Review — Start Managing
    log("wizard-5", "Review — clicking Start Managing");
    await page.waitForTimeout(500);
    const startBtn = page.getByRole("button", { name: /start managing/i });
    await startBtn.waitFor({ state: "visible", timeout: 5_000 });
    await startBtn.click();

    log("wizard-5", "Awaiting result");
    const result = await Promise.race([
      page.waitForURL(/\/dashboard|\/properties/, { timeout: 15_000 }).then(() => "success"),
      page.locator("text=/failed to create/i").first().waitFor({ state: "visible", timeout: 15_000 }).then(() => "error"),
    ]).catch(() => "timeout");

    if (result === "success") {
      log("result", `✓ SUCCESS — ${page.url()}`);
      await browser.close();
      await clerkClient.users.deleteUser(userId).catch(() => {});
      console.log("\n✓ Onboarding wizard prod smoke test PASSED");
      process.exit(0);
    }

    // Failure reporting
    console.error("\n=== FAILURE ===");
    console.error(`result: ${result}`);
    console.error(`URL: ${page.url()}`);
    const errText = await page.locator("text=/failed|error/i").first().textContent().catch(() => null);
    console.error(`Error text: ${errText}`);

    console.error("\n=== API responses (all methods) ===");
    for (const r of apiResponses) {
      const marker = r.status >= 400 ? " ***" : "";
      console.error(`${r.method} ${r.status} ${r.url}${marker}`);
      if (r.status >= 400 || r.method !== "GET") console.error(`  ${r.body}`);
    }

    console.error("\n=== Console errors ===");
    for (const e of consoleErrors.slice(-20)) console.error(`  ${e}`);

    await page.screenshot({ path: "/tmp/onboarding-fail.png", fullPage: true });
    console.error("\nScreenshot: /tmp/onboarding-fail.png");

    await browser.close();
    await clerkClient.users.deleteUser(userId).catch(() => {});
    fail("wizard", `result=${result}`);
  } catch (err) {
    console.error("\n=== EXCEPTION ===");
    console.error(err.stack || err.message);
    console.error("\n=== API responses so far ===");
    for (const r of apiResponses) {
      console.error(`${r.method} ${r.status} ${r.url}`);
      console.error(`  ${r.body}`);
    }
    await page.screenshot({ path: "/tmp/onboarding-exception.png", fullPage: true }).catch(() => {});
    await browser.close();
    await clerkClient.users.deleteUser(userId).catch(() => {});
    process.exit(1);
  }
}

main();

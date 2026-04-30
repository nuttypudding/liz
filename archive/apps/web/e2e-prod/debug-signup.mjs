import { chromium } from "@playwright/test";

const PROD_URL = "https://web-lovat-sigma-36.vercel.app";
const UNIQUE = Date.now().toString(36);
const USERNAME = `landlord_${UNIQUE}`;
const EMAIL = `landlord+clerk_test_${UNIQUE}@liz.test`;
const PASSWORD = "TestLandlord123!";
const PHONE = "5555550100";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console-err]", msg.text());
});

const signupRequests = [];
page.on("response", async (res) => {
  const url = res.url();
  if (url.includes("sign_up") || url.includes("sign-up") || url.includes("client/")) {
    let body = "";
    try { body = (await res.text()).slice(0, 800); } catch {}
    signupRequests.push({
      url,
      status: res.status(),
      method: res.request().method(),
      body,
    });
  }
});

await page.goto(`${PROD_URL}/sign-up`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});

await page.locator('input[name="username"]').first().fill(USERNAME);
await page.locator('input[name="emailAddress"]').first().fill(EMAIL);

const phoneInput = page.locator('input[name="phoneNumber"]').first();
if (await phoneInput.isVisible().catch(() => false)) {
  await phoneInput.fill(PHONE);
}

await page.locator('input[name="password"]').first().fill(PASSWORD);

// Tab out of password to trigger any blur validation
await page.keyboard.press("Tab");
await page.waitForTimeout(500);

// Inspect the Continue button state
const continueBtn = page.getByRole("button", { name: /^continue$/i }).first();
const enabled = await continueBtn.isEnabled();
const disabled = await continueBtn.getAttribute("disabled");
const dataState = await continueBtn.getAttribute("data-disabled");
console.log(`Continue button — enabled: ${enabled}, disabled attr: ${disabled}, data-disabled: ${dataState}`);

// Check for captcha
const captcha = page.locator('#clerk-captcha, [data-clerk-captcha], iframe[src*="captcha"], iframe[src*="turnstile"]');
const captchaCount = await captcha.count();
console.log(`Captcha elements found: ${captchaCount}`);
for (let i = 0; i < captchaCount; i++) {
  const tag = await captcha.nth(i).evaluate((el) => el.tagName);
  const src = await captcha.nth(i).getAttribute("src").catch(() => null);
  const id = await captcha.nth(i).getAttribute("id").catch(() => null);
  console.log(`  captcha[${i}]: <${tag}> id=${id} src=${src}`);
}

// Screenshot before click
await page.screenshot({ path: "/tmp/signup-filled.png", fullPage: true });

console.log("\nClicking Continue...");
await continueBtn.click({ force: true });

await page.waitForTimeout(6000);

console.log("URL after continue:", page.url());
await page.screenshot({ path: "/tmp/signup-after.png", fullPage: true });

// Look for error messages (Clerk may render them dynamically)
const allText = await page.locator("body").textContent();
const errorMatch = allText?.match(/(error|invalid|required|must|please|denied|failed)[^.]{0,200}/gi);
console.log("\nPotential error phrases in body:");
if (errorMatch) for (const m of errorMatch.slice(0, 10)) console.log(" ", m.slice(0, 150));

console.log("\n=== Clerk/signup network ===");
for (const r of signupRequests) {
  console.log(`${r.method} ${r.status} ${r.url.slice(0, 120)}`);
  if (r.body) console.log(`  body: ${r.body.slice(0, 300)}`);
}

await browser.close();

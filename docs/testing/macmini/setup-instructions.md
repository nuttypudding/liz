# MacMini QA Setup — Claude Desktop Cowork

## Overview

MacMini runs Claude Desktop App (Cowork mode) to visually test the deployed Liz website. It opens a real browser, navigates every feature page, interacts with the UI like a human, takes screenshots, and reports what's working and what's broken.

**Production URL:** `https://web-lovat-sigma-36.vercel.app`

## Prerequisites

- macOS on MacMini
- Claude Desktop App (with Cowork feature enabled)
- Git (to clone and pull the repo)
- Node.js 18+ (for Playwright MCP server)

---

## Step 1: Clone the Repo

```bash
# Set up SSH key for GitHub (use the nuttypudding account)
git clone git@github.com:nuttypudding/liz.git ~/Documents/repo/liz
```

The repo contains:
- `docs/testing-framework.md` — feature inventory, test coverage, and gaps
- `docs/testing/macmini/testing-checklist.md` — step-by-step visual testing instructions
- `docs/testing-guides/` — detailed manual test guides (10 guides, 220+ test cases)

---

## Step 2: Configure Claude Desktop MCP Servers

Edit the Claude Desktop config file:

```bash
# Open the config file
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add both MCP servers:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/<your-username>/Documents/repo/liz"
      ]
    }
  }
}
```

Replace `<your-username>` with the macOS username on the MacMini.

**Restart Claude Desktop** after saving the config.

### What the MCP servers do

| Server | Purpose |
|--------|---------|
| **Playwright** | Opens a real Chromium browser — navigate, click, fill forms, take screenshots |
| **Filesystem** | Reads files from the repo — testing checklist, feature docs, test guides |

---

## Step 3: Create a Claude Desktop Project

1. Open Claude Desktop
2. Create a new Project called **"Liz QA"**
3. Set the project instructions to:

```
You are a QA tester for the Liz property management app.

## Before each test run

1. Read ~/Documents/repo/liz/docs/testing/macmini/testing-checklist.md for the full testing checklist.
2. Read ~/Documents/repo/liz/docs/testing-framework.md for the feature inventory and coverage gaps.
3. Test against the production URL: https://web-lovat-sigma-36.vercel.app

## How to test

- Use the Playwright MCP tools to open a browser and navigate the site.
- Walk through each feature in the testing checklist.
- Take a screenshot after each major step.
- Report results as a checklist: feature name, pass/fail, and what you observed.
- If something is broken, describe exactly what you see (error messages, missing elements, wrong data).

## Before testing

Run `git pull` in ~/Documents/repo/liz to get the latest checklist and feature docs.
You can do this by asking the user to run it, or use a terminal MCP if available.

## Test approach

- Test as a landlord user first (most features are landlord-facing).
- Then test tenant-facing pages (submit maintenance, my-requests, pay rent).
- For pages that require auth, note that you cannot sign in via Clerk in the browser (captcha blocks automation). Test public pages and unauthenticated page loads instead.
- For authenticated flows, verify the page loads without errors, check layout, and confirm key elements are visible.

## Reporting

After testing all features, provide a summary table:

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | PASS/FAIL | what you observed |
| Properties | PASS/FAIL | what you observed |
| ... | ... | ... |
```

---

## Step 4: Create the Testing Checklist

The testing checklist lives in the repo at `docs/testing/macmini/testing-checklist.md`. Spark (dev machine) maintains this file. MacMini reads it before each test run.

The checklist is updated whenever features change — MacMini always gets the latest version by running `git pull`.

---

## How It Works

```
Spark (dev)                             MacMini (QA)
──────────                              ────────────
Write code
npm test (unit tests)
vercel --prod (deploy)
git push ─────────────────────────────→ git pull

Tell MacMini "test the site"            Claude Desktop Cowork starts
                                        Reads testing-checklist.md
                                        Opens browser via Playwright MCP
                                        Navigates to prod URL
                                        Tests each feature visually
                                        Takes screenshots at each step
                                        Reports pass/fail summary

Read Cowork results ←──────────────────  "Dashboard: PASS, Rent: FAIL
                                         (table headers missing)"
Fix issues on Spark
Redeploy
"test again" ─────────────────────────→ Re-run tests
```

---

## Authentication Limitations

Clerk uses captcha on the sign-in/sign-up pages, which blocks automated browsers. This means Cowork **cannot sign in** through the UI.

**What Cowork CAN test (unauthenticated):**
- Page loads without errors (no 500s, no blank pages)
- Public pages render correctly (`/sign-in`, `/sign-up`, `/apply/*`, `/reschedule/*`)
- Layout, navigation, and styling are correct
- No console errors or broken images
- Responsive layout (Playwright can resize the browser)

**What Cowork CANNOT test without auth:**
- Landlord dashboard, properties, requests, vendors, rent, settings
- Tenant submit, my-requests, pay
- Any feature behind Clerk auth

### Workaround: Clerk Testing Tokens

To test authenticated flows, Cowork would need Clerk testing tokens. This requires:
1. A `.env.prod` file on MacMini with `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
2. A helper script that creates a test user and generates a session token
3. Injecting the token into the browser context

This is the same approach used by `e2e-prod/onboarding-smoke.mjs` on Spark. If you want authenticated testing on MacMini, we can create a similar helper that Cowork invokes before testing.

For now, start with unauthenticated visual testing — it catches layout breaks, deployment errors, and public page issues.

---

## Triggering Tests

### Manual
Just tell Claude Desktop: **"test the site"** or **"run the QA checklist"**

### After deploy
After deploying from Spark, message Claude Desktop on MacMini: **"I just deployed, test the site"**

### Scheduled (future)
Claude Desktop doesn't support scheduled runs natively. For scheduled testing, use Claude Code CLI on MacMini with a cron job instead.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Playwright MCP not available | Restart Claude Desktop after editing config. Run `npx @playwright/mcp@latest` manually once to ensure it installs. |
| Filesystem MCP can't read files | Check the path in config matches where the repo is cloned. |
| Browser doesn't open | Ensure Node.js 18+ is installed. Run `npx playwright install chromium` manually. |
| Clerk captcha blocks sign-in | Expected. Test unauthenticated flows only, or set up testing tokens (see Authentication section). |
| Stale checklist | Run `git pull` in the repo before testing. |

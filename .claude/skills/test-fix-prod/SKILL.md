---
name: test-fix-prod
description: Autonomous production smoke test + fix-and-redeploy loop. Runs real user flows against the live Vercel URL using Playwright + Clerk Testing Tokens, captures API failures, and deploys fixes.
---

# /test-fix-prod — Autonomous Production QA

Drives end-to-end user flows against the live production URL, diagnoses
failures from real API responses, and redeploys fixes.

## Production Infrastructure

| Resource | Value |
|----------|-------|
| Production URL | `https://web-lovat-sigma-36.vercel.app` |
| Vercel Project | `prj_DnDSbfQ2y0gh4EAG06PPbfKQsCiB` |
| Supabase QA | `https://kmtqmuedhwfcosbgsstu.supabase.co` |
| Clerk | dev instance (`pk_test_...`), supports backend user creation + testing tokens |

## Smoke Test Suite

Located in `apps/web/e2e-prod/`. Uses `@playwright/test` chromium directly
(not the Playwright test runner) so scripts are standalone Node programs.

| Script | Flow |
|--------|------|
| `onboarding-smoke.mjs` | Full sign-up → 5-step onboarding wizard → property create → dashboard redirect |
| `debug-signup.mjs` | Diagnostic: dumps signup page inputs, buttons, errors, and network traffic |

### Why not the normal Playwright test runner?

Clerk's production instance has captcha on the sign-up UI that blocks headless
browsers. The smoke tests bypass this by:

1. Calling `@clerk/backend` `createClerkClient().users.createUser()` to create
   the test user directly (no UI, no captcha).
2. Calling `clerkSetup()` + `setupClerkTestingToken({ context })` from
   `@clerk/testing/playwright` to inject a testing token into browser requests.
3. Calling `clerk.signIn({ page, emailAddress })` with the `ticket` strategy
   to authenticate without touching the sign-up form.

Clerk prod user requirements (username + phone) are satisfied by generating a
unique `landlord_<ts>` username and a test phone from the `+15555550100-199`
range.

## Env Requirements

`.env.prod` must contain:
- `CLERK_SECRET_KEY` — for backend user creation + testing tokens
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — for Clerk client bootstrap

Pull via: `vercel env pull .env.prod --environment=production --yes`

## Workflow

1. **Sync main + deploy latest**: `git pull`, `npm run build`, `vercel --prod --yes`.
2. **Verify alias**: `vercel alias ls | grep web-lovat-sigma-36` — confirm the
   new deployment points at the production alias.
3. **Run smoke tests**: `cd apps/web && node e2e-prod/onboarding-smoke.mjs`.
4. **On failure**, the script dumps:
   - Every `/api/*` response (method, status, body)
   - Console errors
   - Screenshot to `/tmp/onboarding-fail.png`
5. **Diagnose** from the actual response body. Common failures:
   - `403 "only landlords can create properties"` → role bootstrap bug (see `lib/clerk.ts` `getRole()`)
   - `500` from property insert → schema mismatch between migration and deploy
   - Clerk captcha blocking → testing token not injected
6. **Fix code**, re-run unit tests (`npm test`), rebuild (`npm run build`),
   redeploy (`vercel --prod --yes`), re-run smoke test.
7. **Repeat** until green. Cleanup test users (smoke test does this in its
   `finally` block).

## Known Good Baseline

Last verified passing:
- Onboarding wizard end-to-end — new user → AI prefs → property → tenants skip
  → vendors skip → Start Managing → `/dashboard` redirect.

## Extending

Add a new smoke test:
1. Create `e2e-prod/<flow>-smoke.mjs`.
2. Reuse the env loader, Clerk user creation, testing token setup, and sign-in
   helper pattern from `onboarding-smoke.mjs`.
3. Capture `/api/*` responses via `page.on("response", ...)`.
4. Exit 0 on success, non-zero with full diagnostics on failure.

# Testing Framework

## Overview

Liz uses three testing layers:

| Layer | Framework | Config | Command | Count |
|-------|-----------|--------|---------|-------|
| **Unit tests** | Vitest | `vitest.config.ts` | `npm test` | ~892 test cases across 56 files |
| **Integration tests** | Vitest | `vitest.config.ts` (integration project) | `npm run test:integration` | ~63 test cases across 2 files |
| **E2E tests (local)** | Playwright | `playwright.config.ts` | `npm run test:e2e` | 16 test cases across 4 files |
| **E2E tests (prod)** | Playwright (standalone) | N/A | `node e2e-prod/onboarding-smoke.mjs` | 1 smoke test |

All paths below are relative to `apps/web/`.

---

## Test Commands

```bash
npm test                    # Run all unit + lib tests (vitest)
npm run test:watch          # Watch mode
npm run test:integration    # Integration tests only
npm run test:e2e            # Playwright E2E (needs local dev server)
npm run test:e2e:headed     # Playwright with visible browser
npm run test:all            # Unit + E2E combined
```

### Running a single feature's tests

There is no per-feature test command today. To run tests for a specific feature, specify files manually:

```bash
# Unit tests for a feature
npx vitest run tests/api/intake.test.ts tests/api/requests.test.ts     # triage
npx vitest run tests/api/rent.test.ts                                   # rent
npx vitest run tests/lib/compliance/                                    # compliance (folder)
npx vitest run tests/api/autonomy/                                      # autonomy (folder)
npx vitest run tests/api/test-lab*.test.ts tests/lib/triage-classifier*.test.ts  # test lab + triage

# E2E tests for a feature
npx playwright test e2e/intake.spec.ts                                  # triage
npx playwright test e2e/properties.spec.ts                              # properties

# Production smoke test
node e2e-prod/onboarding-smoke.mjs                                      # onboarding
```

---

## Vitest Configuration

Three test projects defined in `vitest.config.ts`:

| Project | Environment | Includes | Purpose |
|---------|-------------|----------|---------|
| `api` | Node | `tests/api/**/*.test.ts`, `tests/lib/**/*.test.ts` | API route handlers, library logic |
| `integration` | Node | `__tests__/integration/**/*.test.ts` | Multi-step workflow tests |
| `components` | jsdom | `tests/components/**/*.test.tsx` | React component rendering |

All projects use `tests/setup-dom.ts` for setup and `@` path alias pointing to the `apps/web/` root.

## Playwright Configuration

- **Test directory:** `e2e/`
- **Base URL:** `http://localhost:3000`
- **Browser:** Chromium (Desktop Chrome)
- **Auth:** Clerk Testing Tokens stored in `playwright/.clerk/user.json`
- **Projects:** `setup` (Clerk tokens) → `auth-setup` (user creation) → `chromium` (authenticated tests)
- **Dev server:** Auto-starts `npm run dev` if not running

## Production Smoke Tests

Located in `e2e-prod/`. These are standalone Node.js scripts (not Playwright test runner) that test against the live production URL.

- **Auth:** Creates Clerk users via backend SDK, injects testing tokens
- **Captcha bypass:** Uses `@clerk/testing/playwright` to skip Clerk captcha
- **Role handling:** Pre-sets `publicMetadata.role` at user creation (testing tokens don't propagate metadata updates via `session.reload()`)
- **Cleanup:** Deletes test users in `finally` block
- **Env:** Requires `.env.prod` with `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

---

## Test Helpers

| File | Purpose |
|------|---------|
| `tests/helpers.ts` | Mock builders: `buildRequest()`, `mockAuth()`, `mockSupabase()`, etc. |
| `tests/component-helpers.tsx` | React testing utilities, render wrappers |
| `tests/setup-dom.ts` | Vitest global setup |
| `e2e/fixtures/test-accounts.ts` | Test user credentials for Playwright |
| `e2e/global.setup.ts` | Clerk Testing Token initialization |
| `e2e/auth.setup.ts` | User creation & authentication |
| `__tests__/mocks/screening-provider.mock.ts` | Mock SmartMove provider |

---

## Current Directory Structure

```
apps/web/
├── tests/                         # Vitest unit tests
│   ├── api/                       # API route handler tests
│   │   ├── autonomy/              #   autonomy decisions/settings/stats
│   │   ├── applications.test.ts   #   screening applications
│   │   ├── clerk-webhook.test.ts  #   auth webhook
│   │   ├── dashboard.test.ts      #   dashboard stats
│   │   ├── dispatch.test.ts       #   request dispatch
│   │   ├── intake.test.ts         #   maintenance intake
│   │   ├── notifications.test.ts  #   notifications
│   │   ├── payments.test.ts       #   payments CRUD
│   │   ├── payments-checkout-flow.test.ts  # Stripe checkout
│   │   ├── properties.test.ts     #   properties CRUD
│   │   ├── properties-id.test.ts  #   property detail
│   │   ├── rent.test.ts           #   rent records
│   │   ├── requests.test.ts       #   maintenance requests
│   │   ├── requests-id.test.ts    #   request detail
│   │   ├── resolve.test.ts        #   request resolution
│   │   ├── rules-routes.test.ts   #   automation rules
│   │   ├── scheduling.test.ts     #   vendor scheduling
│   │   ├── set-role.test.ts       #   role assignment
│   │   ├── tenant-me.test.ts      #   tenant profile
│   │   ├── tenants.test.ts        #   tenant CRUD
│   │   ├── vendors.test.ts        #   vendor CRUD
│   │   ├── vendors-id.test.ts     #   vendor detail
│   │   ├── vendors-availability.test.ts  # vendor calendar
│   │   ├── test-lab.test.ts       #   Test Lab API routes
│   │   └── test-lab-adversarial.test.ts  # Test Lab adversarial probing
│   │
│   ├── components/                # React component tests (jsdom)
│   │   ├── document-uploader.test.tsx
│   │   ├── onboarding-wizard.test.tsx
│   │   ├── property-drilldown.test.tsx
│   │   ├── property-form.test.tsx
│   │   ├── request-actions.test.tsx
│   │   ├── tenant-form.test.tsx
│   │   └── utility-setup-sheet.test.tsx
│   │
│   ├── lib/                       # Library/logic tests
│   │   ├── compliance/            #   8 compliance test files
│   │   ├── screening/             #   2 screening test files
│   │   ├── ai-analysis.test.ts    #   AI screening analysis
│   │   ├── ai-matcher.test.ts     #   scheduling AI matcher
│   │   ├── clerk.test.ts          #   Clerk utilities
│   │   ├── compliance-filter.test.ts
│   │   ├── engine.test.ts         #   rules engine
│   │   ├── notifications.test.ts  #   notification service
│   │   ├── validations.test.ts    #   Zod schemas
│   │   ├── webhook-utils.test.ts  #   webhook parsing
│   │   ├── withauth.test.ts       #   auth middleware
│   │   ├── triage-classifier.test.ts          # triage classifier unit
│   │   └── triage-classifier-adversarial.test.ts  # triage adversarial probing
│   │
│   ├── helpers.ts                 # Mock builders
│   ├── component-helpers.tsx      # React test utils
│   └── setup-dom.ts               # Vitest setup
│
├── __tests__/                     # Integration tests
│   ├── integration/
│   │   ├── screening-pipeline.test.ts   # Full screening workflow
│   │   └── autonomy-flow.test.ts        # AI decision workflow
│   └── mocks/
│       └── screening-provider.mock.ts
│
├── e2e/                           # Playwright E2E tests (local)
│   ├── fixtures/test-accounts.ts
│   ├── global.setup.ts
│   ├── auth.setup.ts
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   ├── intake.spec.ts
│   └── properties.spec.ts
│
└── e2e-prod/                      # Production smoke tests
    ├── onboarding-smoke.mjs
    └── debug-signup.mjs
```

---

## Feature-to-Test Mapping

### Onboarding

| Source | Path |
|--------|------|
| Page | `app/(onboarding)/onboarding/page.tsx` |
| Components | `components/onboarding/onboarding-wizard.tsx`, `option-card.tsx`, `combo-note.tsx` |
| API | `app/api/settings/profile/route.ts` (saves AI prefs) |

| Test Type | File | Cases |
|-----------|------|-------|
| Component | `tests/components/onboarding-wizard.test.tsx` | 11 |
| Prod smoke | `e2e-prod/onboarding-smoke.mjs` | 1 flow |

**Gaps:** No API test for profile save during onboarding. No local E2E test.

---

### AI Maintenance Triage (Intake)

| Source | Path |
|--------|------|
| Page | `app/(tenant)/submit/page.tsx` |
| Components | `components/forms/submit-form.tsx`, `components/forms/photo-uploader.tsx`, `components/requests/ai-classification-card.tsx`, `urgency-badge.tsx`, `status-badge.tsx` |
| API | `app/api/intake/route.ts`, `app/api/classify/route.ts` |
| Lib | `lib/screening/ai-analysis.ts` (Claude classification) |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/intake.test.ts` | 8 |
| Lib | `tests/lib/ai-analysis.test.ts` | 22 |
| E2E | `e2e/intake.spec.ts` | 4 |

**Gaps:** No component test for submit-form or photo-uploader integration.

---

### Maintenance Request Workflow

| Source | Path |
|--------|------|
| Page | `app/(landlord)/requests/page.tsx` |
| Components | `components/requests/request-card.tsx`, `ai-classification-card.tsx`, `cost-estimate-card.tsx`, `approve-button.tsx`, `vendor-selector.tsx`, `work-order-draft.tsx` |
| API | `app/api/requests/route.ts`, `[id]/route.ts`, `[id]/dispatch/route.ts`, `[id]/resolve/route.ts`, `[id]/work-order/route.ts` |
| Lib | `lib/rules/engine.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/requests.test.ts` | 7 |
| API | `tests/api/requests-id.test.ts` | 11 |
| API | `tests/api/dispatch.test.ts` | 6 |
| API | `tests/api/resolve.test.ts` | 5 |
| Lib | `tests/lib/engine.test.ts` | 63 |
| Component | `tests/components/request-actions.test.tsx` | 15 |

**Gaps:** No E2E test for full request lifecycle (submit → triage → approve → dispatch → resolve).

---

### Property Management

| Source | Path |
|--------|------|
| Page | `app/(landlord)/properties/page.tsx` |
| Components | `components/forms/property-form.tsx`, `components/dashboard/property-drilldown.tsx`, `property-selector-bar.tsx`, `components/properties/utility-*.tsx` |
| API | `app/api/properties/route.ts`, `[id]/route.ts`, `[id]/tenants/route.ts`, `[id]/utilities/route.ts`, `[id]/documents/route.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/properties.test.ts` | 10 |
| API | `tests/api/properties-id.test.ts` | 13 |
| Component | `tests/components/property-form.test.tsx` | 7 |
| Component | `tests/components/property-drilldown.test.tsx` | 7 |
| Component | `tests/components/utility-setup-sheet.test.tsx` | 10 |
| E2E | `e2e/properties.spec.ts` | 4 |

**Gaps:** No tests for tenant assignment or document management within properties.

---

### Tenant Management

| Source | Path |
|--------|------|
| Components | `components/forms/tenant-form.tsx` |
| API | `app/api/tenants/[id]/route.ts`, `app/api/tenant/me/route.ts`, `app/api/tenant/rent/route.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/tenants.test.ts` | 14 |
| API | `tests/api/tenant-me.test.ts` | 4 |
| Component | `tests/components/tenant-form.test.tsx` | 9 |

**Gaps:** No E2E test for tenant flows (submit maintenance, view requests, pay rent).

---

### Vendor Management

| Source | Path |
|--------|------|
| Page | `app/(landlord)/vendors/page.tsx` |
| Components | `components/forms/vendor-form.tsx`, `components/vendors/AvailabilityBadge.tsx`, `AvailabilityTab.tsx` |
| API | `app/api/vendors/route.ts`, `[id]/route.ts`, `[id]/availability/route.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/vendors.test.ts` | 8 |
| API | `tests/api/vendors-id.test.ts` | 7 |
| API | `tests/api/vendors-availability.test.ts` | 11 |

**Gaps:** No component tests for vendor UI. No E2E test.

---

### Scheduling & Vendor Appointments

| Source | Path |
|--------|------|
| Page | `app/reschedule/[token]/page.tsx` |
| Components | `components/scheduling/SchedulingModal.tsx`, `RescheduleForm.tsx`, `RescheduleDialog.tsx`, `ScheduleConfirmationCard.tsx`, `TenantAvailabilityPrompt.tsx` |
| API | `app/api/scheduling/tasks/route.ts`, `suggest/[taskId]/route.ts`, `confirm/route.ts`, `tenant-availability/route.ts`, `app/api/reschedule/submit/route.ts`, `verify-token/[token]/route.ts` |
| Lib | `lib/scheduling/ai-matcher.ts`, `reschedule-tokens.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/scheduling.test.ts` | 18 |
| Lib | `tests/lib/ai-matcher.test.ts` | 16 |

**Gaps:** No component tests. No E2E test for scheduling flow.

---

### Rent Reminders & Management

| Source | Path |
|--------|------|
| Page | `app/(landlord)/rent/page.tsx`, `app/(tenant)/my-rent/page.tsx` |
| Components | `components/rent/rent-table.tsx`, `rent-card-list.tsx`, `rent-status-badge.tsx`, `rent-status-summary-bar.tsx`, `rent-toolbar.tsx`, `mark-paid-dialog.tsx`, `components/dashboard/rent-summary-card.tsx`, `overdue-rent-banner.tsx` |
| API | `app/api/rent/route.ts`, `[id]/route.ts`, `generate/route.ts`, `app/api/dashboard/rent-summary/route.ts`, `app/api/cron/rent-reminders/route.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/rent.test.ts` | (in payments) |

**Gaps:** No component tests for rent UI. No E2E test. No cron job test. This is a new feature (P2-001) — tests needed.

---

### Payments & Stripe

| Source | Path |
|--------|------|
| Pages | `app/(landlord)/dashboard/payments/page.tsx`, `app/(tenant)/pay/page.tsx` |
| Components | `components/payments/stripe-connect-banner.tsx`, `financial-summary-section.tsx`, `vendor-payment-table.tsx`, `log-vendor-payment-dialog.tsx` |
| API | `app/api/payments/route.ts`, `checkout/route.ts`, `connect/onboard/route.ts`, `connect/status/route.ts`, `app/api/webhooks/stripe/route.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/payments.test.ts` | 43 |
| API | `tests/api/payments-checkout-flow.test.ts` | 23 |

**Gaps:** No component tests. No E2E test for payment flow. No webhook test.

---

### Tenant Screening & Applications

| Source | Path |
|--------|------|
| Page | `app/(landlord)/applications/page.tsx`, `app/apply/[propertyId]/page.tsx` |
| Components | `components/screening/ScreeningStatsCards.tsx` |
| API | `app/api/applications/route.ts`, `[id]/screen/route.ts`, `[id]/decide/route.ts`, `app/api/webhooks/screening/route.ts` |
| Lib | `lib/screening/` (12 files), `lib/screening/hooks/` (5 hooks), `lib/screening/providers/` (3 files) |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/applications.test.ts` | 20 |
| Lib | `tests/lib/ai-analysis.test.ts` | 22 |
| Lib | `tests/lib/screening/compliance-filter.test.ts` | 25 |
| Lib | `tests/lib/screening/compliance-documentation.test.ts` | 3 |
| Integration | `__tests__/integration/screening-pipeline.test.ts` | 21 |

**Gaps:** No component tests. No E2E test for application flow.

---

### Rules Engine & Automation

| Source | Path |
|--------|------|
| Components | `components/rules/RuleBuilder.tsx`, `RuleList.tsx`, `RuleCard.tsx`, `DeleteRuleDialog.tsx`, `RuleTestPanel.tsx` |
| API | `app/api/rules/route.ts`, `[id]/route.ts`, `[id]/test/route.ts`, `[id]/reorder/route.ts`, `summary/route.ts`, `logs/route.ts` |
| Lib | `lib/rules/engine.ts`, `stale-references.ts`, `lib/schemas/rules.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/rules-routes.test.ts` | 79 |
| Lib | `tests/lib/engine.test.ts` | 63 |

**Gaps:** No component tests for rule builder UI. No E2E test.

---

### Autonomy & AI Decisions

| Source | Path |
|--------|------|
| Page | `app/(landlord)/autopilot/page.tsx` |
| Components | `components/autopilot/decision-card.tsx`, `decision-feed.tsx`, `override-dialog.tsx`, `confidence-indicator.tsx`, `status-banner.tsx`, `summary-strip.tsx`, `components/autonomy/AIReasoningCard.tsx` |
| API | `app/api/autonomy/settings/route.ts`, `decisions/route.ts`, `decisions/[id]/route.ts`, `stats/route.ts` |
| Lib | `lib/autonomy/engine.ts`, `notifications.ts`, `override.ts`, `updateMonthlyStats.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/autonomy/decisions.test.ts` | 26 |
| API | `tests/api/autonomy/settings.test.ts` | 17 |
| API | `tests/api/autonomy/stats.test.ts` | 15 |
| Integration | `__tests__/integration/autonomy-flow.test.ts` | 42 |

**Gaps:** No component tests. No E2E test.

---

### Test Lab

| Source | Path |
|--------|------|
| Page | `app/(landlord)/test-lab/page.tsx` |
| Components | `components/test-lab/components-list.tsx`, `runs-list.tsx`, `manual-test-form.tsx` |
| API | `app/api/test-lab/runs/route.ts`, `runs/[id]/route.ts`, `components/triage/run/route.ts`, `components/triage/manual/route.ts` |
| Lib | `lib/test-lab/registry.ts`, `lib/triage/classifier.ts`, `lib/triage/samples.ts`, `lib/triage/types.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/test-lab.test.ts` | 10 |
| API (adversarial) | `tests/api/test-lab-adversarial.test.ts` | 39 |
| Lib | `tests/lib/triage-classifier.test.ts` | 13 |
| Lib (adversarial) | `tests/lib/triage-classifier-adversarial.test.ts` | 33 |

**Gaps:** No component tests for Test Lab UI. No E2E test.


---

### Compliance & Legal

| Source | Path |
|--------|------|
| Page | `app/(landlord)/compliance/page.tsx`, `[propertyId]/page.tsx` |
| Components | `components/compliance/ComplianceAlertBanner.tsx`, `ComplianceScoreBadge.tsx`, `ComplianceSummaryCard.tsx`, `CommunicationReviewerPanel.tsx`, `DisclaimerBanner.tsx`, `EntryNoticeSuggestionBanner.tsx` |
| API | `app/api/compliance/[propertyId]/checklist/route.ts`, `score/route.ts`, `audit-log/route.ts`, `alerts/route.ts`, `jurisdictions/route.ts`, `knowledge/route.ts`, `notices/generate/route.ts`, `review/route.ts`, `stats/route.ts` |
| Lib | `lib/compliance/disclaimers.ts`, `prompts.ts`, `types.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| Lib | `tests/lib/compliance/api-integration.test.ts` | 18 |
| Lib | `tests/lib/compliance/communication-review.test.ts` | 32 |
| Lib | `tests/lib/compliance/edge-cases.test.ts` | 21 |
| Lib | `tests/lib/compliance/jurisdiction.test.ts` | 13 |
| Lib | `tests/lib/compliance/notice-generation.test.ts` | 37 |
| Lib | `tests/lib/compliance/prompts.test.ts` | 36 |
| Lib | `tests/lib/compliance/score.test.ts` | 18 |
| Lib | `tests/lib/compliance/api-errors.test.ts` | 46 |
| Lib | `tests/lib/compliance-filter.test.ts` | 26 |

**Gaps:** No component tests. No E2E test. No API route tests (only lib tests).

---

### Notifications

| Source | Path |
|--------|------|
| Components | `components/layout/notification-bell.tsx` |
| API | `app/api/notifications/route.ts` |
| Lib | `lib/notifications/service.ts`, `email.ts`, `sms.ts`, `types.ts`, transports (`email.ts`, `sms.ts`, `in-app.ts`) |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/notifications.test.ts` | 13 |
| Lib | `tests/lib/notifications.test.ts` | 21 |

**Gaps:** No component test for notification bell. No E2E test.

---

### Dashboard

| Source | Path |
|--------|------|
| Page | `app/(landlord)/dashboard/page.tsx` |
| Components | `components/dashboard/` (16 components) |
| API | `app/api/dashboard/stats/route.ts`, `rent-summary/route.ts`, `spend-chart/route.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/dashboard.test.ts` | 8 |
| E2E | `e2e/dashboard.spec.ts` | 4 |

**Gaps:** No component tests for dashboard widgets.

---

### Auth & Role Selection

| Source | Path |
|--------|------|
| Pages | `app/(auth)/role-select/page.tsx`, `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx` |
| Components | `components/auth/role-card.tsx` |
| API | `app/api/auth/set-role/route.ts`, `app/api/webhook/clerk/route.ts` |
| Lib | `lib/clerk.ts` |
| Middleware | `middleware.ts` |

| Test Type | File | Cases |
|-----------|------|-------|
| API | `tests/api/set-role.test.ts` | 11 |
| API | `tests/api/clerk-webhook.test.ts` | 8 |
| Lib | `tests/lib/clerk.test.ts` | 17 |
| Lib | `tests/lib/withauth.test.ts` | 7 |
| E2E | `e2e/auth.spec.ts` | 4 |

**Gaps:** No middleware test. No component test for role-card.

---

## Known Architecture Issues

### Tests are organized by technical layer, not by feature

**Current:** `tests/api/`, `tests/components/`, `tests/lib/` — all features mixed in flat folders.

**Desired:** `unit-tests/<feature>/`, `ui-tests/<feature>/` — each feature's tests isolated.

This means:
- You cannot run "all triage tests" with a single command
- You must know which files belong to which feature
- Adding a new feature doesn't automatically get its own test namespace

### Recommended future structure

```
apps/web/
├── unit-tests/
│   ├── onboarding/          # onboarding-wizard, profile API
│   ├── triage/              # intake, classify, requests, dispatch, resolve
│   ├── properties/          # properties CRUD, drilldown
│   ├── tenants/             # tenant CRUD, tenant-me
│   ├── vendors/             # vendor CRUD, availability
│   ├── scheduling/          # scheduling tasks, ai-matcher
│   ├── rent/                # rent CRUD, reminders, cron
│   ├── payments/            # payments, checkout, Stripe
│   ├── screening/           # applications, providers, pipeline
│   ├── rules/               # rules engine, routes
│   ├── autonomy/            # decisions, settings, stats
│   ├── compliance/          # checklist, score, notices
│   ├── notifications/       # notification service, routes
│   ├── dashboard/           # stats, summary
│   └── auth/                # role, clerk, middleware
│
├── ui-tests/
│   ├── onboarding/          # wizard flow E2E
│   ├── triage/              # submit → triage → approve E2E
│   ├── properties/          # property CRUD E2E
│   ├── rent/                # rent tracking E2E
│   └── ...
│
├── integration-tests/
│   ├── screening/           # full screening pipeline
│   └── autonomy/            # full autonomy flow
```

Migration effort: ~50 test files to move, update `vitest.config.ts` and `playwright.config.ts` include paths, fix relative imports in test files.

---

## Coverage Summary

| Feature | Unit | Component | Integration | E2E Local | E2E Prod |
|---------|------|-----------|-------------|-----------|----------|
| Onboarding | - | 11 | - | - | 1 flow |
| Triage/Intake | 8 | - | - | 4 | - |
| Requests | 29 | 15 | - | - | - |
| Properties | 23 | 24 | - | 4 | - |
| Tenants | 18 | 9 | - | - | - |
| Vendors | 26 | - | - | - | - |
| Scheduling | 18 | - | - | - | - |
| Rent | ~5 | - | - | - | - |
| Payments | 66 | - | - | - | - |
| Screening | 20 | - | 21 | - | - |
| Rules | 79 | - | - | - | - |
| Autonomy | 58 | - | 42 | - | - |
| Compliance | 247 | - | - | - | - |
| Notifications | 34 | - | - | - | - |
| Dashboard | 8 | - | - | 4 | - |
| Auth | 43 | - | - | 4 | - |
| Validations | 43 | - | - | - | - |
| **Total** | **~725** | **~59** | **~63** | **~16** | **1** |

### Features with NO E2E coverage

- Requests (full lifecycle)
- Vendors
- Scheduling
- Rent
- Payments
- Screening
- Rules
- Autonomy
- Compliance
- Notifications
- Tenants (tenant-side flows)

### Features with NO component tests

- Triage/Intake submit form
- Vendor UI
- Scheduling UI
- Rent UI
- Payments UI
- Screening UI
- Rules builder UI
- Autopilot/Autonomy UI
- Compliance UI
- Notifications bell
- Dashboard widgets

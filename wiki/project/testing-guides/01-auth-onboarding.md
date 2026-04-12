---
type: project
tags: [testing, auth, onboarding, manual-testing]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/01-auth-onboarding.md
---

# 01 — Authentication & Onboarding

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

---

## 1.1 Sign-Up Flow

### TC-1.1.1: New landlord sign-up
- [ ] Navigate to `/sign-up`
- [ ] Sign-up form renders (Clerk component)
- [ ] Enter a valid email and password
- [ ] Complete email verification
- [ ] After sign-up, user is redirected (should go to `/onboarding` if new, or `/dashboard`)
- [ ] No console errors in browser dev tools

### TC-1.1.2: New tenant sign-up
- [ ] Open a separate browser/incognito window
- [ ] Navigate to `/sign-up`
- [ ] Create account with a different email
- [ ] Set Clerk metadata role to `tenant` (via Clerk dashboard or webhook)
- [ ] After sign-up, user should land on `/submit`

### TC-1.1.3: Sign-up validation
- [ ] Try submitting empty form — should show validation errors
- [ ] Try duplicate email — should show "already exists" error
- [ ] Try weak password — should show password requirements

---

## 1.2 Sign-In Flow

### TC-1.2.1: Landlord sign-in
- [ ] Navigate to `/sign-in`
- [ ] Sign-in form renders (Clerk component)
- [ ] Enter valid landlord credentials
- [ ] Successfully redirected to `/dashboard`
- [ ] Sidebar/navigation is visible

### TC-1.2.2: Tenant sign-in
- [ ] Navigate to `/sign-in` in separate browser
- [ ] Enter valid tenant credentials
- [ ] Successfully redirected to `/submit`
- [ ] Tenant navigation visible (Submit, My Requests)

### TC-1.2.3: Invalid credentials
- [ ] Enter wrong password — should show error message
- [ ] Enter non-existent email — should show error message
- [ ] Form does not clear on error (email remains filled)

---

## 1.3 Auth Routing & Guards

### TC-1.3.1: Unauthenticated access
- [ ] Open incognito/private window (no session)
- [ ] Navigate to `/dashboard` — should redirect to `/sign-in`
- [ ] Navigate to `/properties` — should redirect to `/sign-in`
- [ ] Navigate to `/requests` — should redirect to `/sign-in`
- [ ] Navigate to `/submit` — should redirect to `/sign-in`
- [ ] Navigate to `/settings` — should redirect to `/sign-in`

### TC-1.3.2: Landlord cannot access tenant pages
- [ ] Sign in as landlord
- [ ] Navigate to `/submit` — should redirect to `/dashboard`
- [ ] Navigate to `/my-requests` — should redirect to `/dashboard`

### TC-1.3.3: Tenant cannot access landlord pages
- [ ] Sign in as tenant
- [ ] Navigate to `/dashboard` — should redirect to `/submit`
- [ ] Navigate to `/properties` — should redirect to `/submit`
- [ ] Navigate to `/vendors` — should redirect to `/submit`
- [ ] Navigate to `/requests` — should redirect to `/submit`
- [ ] Navigate to `/settings` — should redirect to `/submit`

### TC-1.3.4: Root path redirect
- [ ] Sign in as landlord, navigate to `/` — should redirect to `/dashboard`
- [ ] Sign in as tenant, navigate to `/` — should redirect to `/submit`

---

## 1.4 Onboarding Wizard

### TC-1.4.1: Wizard loads for new landlord
- [ ] Sign in as a new landlord (no onboarding completed)
- [ ] Should see onboarding wizard at `/onboarding`
- [ ] "Welcome to Liz!" heading visible
- [ ] Progress indicator shows current step

### TC-1.4.2: Step 1 — Risk Appetite
- [ ] Three options displayed: Save Money, Balanced, Move Fast
- [ ] Each option is selectable (radio-style cards)
- [ ] "Balanced" should be marked as recommended
- [ ] Can select each option and see visual feedback
- [ ] "Next" button advances to step 2
- [ ] "Use default AI settings" skip link is visible

### TC-1.4.3: Step 2 — Delegation Mode
- [ ] Three options: I approve everything (Manual), Auto-approve small jobs (Assist), Full autopilot (Auto)
- [ ] "Auto" option should be marked as coming soon / disabled
- [ ] Selecting "Assist" shows auto-approve threshold slider
- [ ] Slider range: $50–$500, default $150
- [ ] "Next" advances to step 3
- [ ] "Back" returns to step 1 with previous selection preserved

### TC-1.4.4: Step 3 — Add First Property
- [ ] Property form fields visible: Name, Address, Unit Count, Monthly Rent
- [ ] Form validates required fields
- [ ] Can fill and submit
- [ ] "Skip" option available to skip property creation
- [ ] "Back" returns to step 2

### TC-1.4.5: Wizard completion
- [ ] After final step, redirects to `/dashboard`
- [ ] Profile is saved (verify in Settings page — preferences match selections)
- [ ] Revisiting `/onboarding` redirects to `/dashboard` (onboarding_completed = true)

### TC-1.4.6: Skip entire onboarding
- [ ] Click "Use default AI settings" on step 1
- [ ] Verify default preferences are saved (balanced, manual)
- [ ] Redirects to `/dashboard`

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/16 test cases passed

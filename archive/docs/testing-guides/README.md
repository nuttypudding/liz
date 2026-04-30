# Liz Manual Testing Guide

**Last Updated:** 2026-04-08
**Phase:** P1 — MVP UX Overhaul Complete
**Tester(s):** _________________

## How to Use This Guide

1. Start your local dev server (`npm run dev` in `apps/web/`)
2. Open each guide below in order
3. Check off each item as you complete it — use `[x]` in the markdown
4. Note any bugs or issues in the "Issues Found" section of each guide
5. When done, commit this file with your results

## Test Guides

| # | Guide | Covers | Est. Time |
|---|-------|--------|-----------|
| 1 | [Authentication & Onboarding](./01-auth-onboarding.md) | Sign-up, sign-in, role routing, onboarding wizard | 15 min |
| 2 | [Landlord Dashboard](./02-landlord-dashboard.md) | Stats, property selector, banners, charts, drill-down | 15 min |
| 3 | [Properties Management](./03-properties.md) | Property CRUD, tenant CRUD, documents, utilities | 25 min |
| 4 | [Vendors Management](./04-vendors.md) | Vendor CRUD, specialty, priority ranking | 10 min |
| 5 | [Maintenance Requests (Landlord)](./05-requests-landlord.md) | Request list, filters, detail, AI classification, dispatch | 20 min |
| 6 | [Tenant Submit Flow](./06-tenant-submit.md) | Issue submission, photo upload, gatekeeper, resolve/escalate | 15 min |
| 7 | [Tenant My Requests](./07-tenant-my-requests.md) | Request list, detail view, status tracking | 10 min |
| 8 | [Settings](./08-settings.md) | AI preferences, notifications, re-run onboarding | 10 min |
| 9 | [Navigation & Layout](./09-navigation-layout.md) | Sidebar, bottom nav, responsive, role-based menus | 10 min |
| 10 | [Edge Cases & Error Handling](./10-edge-cases.md) | Empty states, validation, auth guards, API errors | 15 min |

**Total estimated time:** ~2.5 hours for a full pass

## Overall Progress

- [ ] Guide 1: Auth & Onboarding
- [ ] Guide 2: Landlord Dashboard
- [ ] Guide 3: Properties Management
- [ ] Guide 4: Vendors Management
- [ ] Guide 5: Maintenance Requests (Landlord)
- [ ] Guide 6: Tenant Submit Flow
- [ ] Guide 7: Tenant My Requests
- [ ] Guide 8: Settings
- [ ] Guide 9: Navigation & Layout
- [ ] Guide 10: Edge Cases & Error Handling

## Prerequisites

- Node.js and npm installed
- Local Supabase running (`supabase start`)
- Clerk dev keys configured in `.env.local`
- Two browser profiles or incognito windows (one for landlord, one for tenant)

## Test Accounts

| Role | Email | Notes |
|------|-------|-------|
| Landlord | _(your dev account)_ | Primary test account |
| Tenant | _(create via Properties page)_ | Needs a matching Clerk account with `tenant` role in metadata |

## Issues Found

_Record any bugs discovered during testing here. Use format: `[Guide #] [Section] — Description`_

| # | Guide | Section | Description | Severity | Status |
|---|-------|---------|-------------|----------|--------|
| | | | | | |

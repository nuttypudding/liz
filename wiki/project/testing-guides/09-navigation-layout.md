---
type: project
tags: [testing, navigation, layout, manual-testing]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/09-navigation-layout.md
---

# 09 — Navigation & Layout

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

---

## 9.1 Landlord Sidebar Navigation (Desktop)

**Prerequisite:** Signed in as landlord, browser window 1024px+ wide.

### TC-9.1.1: Sidebar renders
- [ ] Left sidebar visible on lg+ screens
- [ ] "Liz" branding/logo in sidebar header
- [ ] Clerk UserButton visible in sidebar footer

### TC-9.1.2: Navigation items
- [ ] Dashboard link (with icon) — navigates to `/dashboard`
- [ ] Requests link (with Wrench icon) — navigates to `/requests`
- [ ] Properties link (with Building icon) — navigates to `/properties`
- [ ] Vendors link (with Users icon) — navigates to `/vendors`
- [ ] Settings link (with Settings icon) — navigates to `/settings`

### TC-9.1.3: Active state
- [ ] On `/dashboard`: Dashboard link highlighted as active
- [ ] On `/requests`: Requests link highlighted
- [ ] On `/properties`: Properties link highlighted
- [ ] On `/vendors`: Vendors link highlighted
- [ ] On `/settings`: Settings link highlighted

### TC-9.1.4: Navigation works
- [ ] Click Dashboard — navigates to `/dashboard`
- [ ] Click Requests — navigates to `/requests`
- [ ] Click Properties — navigates to `/properties`
- [ ] Click Vendors — navigates to `/vendors`
- [ ] Click Settings — navigates to `/settings`
- [ ] No full page reloads (client-side navigation)

---

## 9.2 Mobile Bottom Navigation

**Prerequisite:** Signed in as landlord, browser window <1024px (or use mobile emulation).

### TC-9.2.1: Bottom nav renders
- [ ] Bottom navigation bar visible on mobile
- [ ] Sidebar is hidden
- [ ] Bottom nav has same items: Dashboard, Requests, Properties, Vendors, Settings

### TC-9.2.2: Bottom nav active state
- [ ] Current page's icon highlighted
- [ ] Tapping each icon navigates to correct page

### TC-9.2.3: Bottom nav does not overlap content
- [ ] Content is not hidden behind bottom nav
- [ ] Page content scrolls independently of bottom nav
- [ ] Bottom nav stays fixed at bottom of viewport

---

## 9.3 Tenant Navigation

**Prerequisite:** Signed in as tenant.

### TC-9.3.1: Tenant sees tenant nav items
- [ ] Navigation shows: Submit (or "New Request"), My Requests
- [ ] Does NOT show: Dashboard, Properties, Vendors, Settings
- [ ] Navigation links work correctly

### TC-9.3.2: Tenant mobile nav
- [ ] On mobile: bottom nav shows tenant items only
- [ ] Tapping items navigates correctly

---

## 9.4 Site Header

### TC-9.4.1: Header renders
- [ ] Site header visible at top of page
- [ ] Shows "Liz" branding or logo
- [ ] Clerk UserButton in header (sign-out, profile)

### TC-9.4.2: User button
- [ ] Click UserButton
- [ ] Dropdown shows: profile, sign out options
- [ ] Click "Sign Out" — logs out and redirects to `/sign-in`

---

## 9.5 Responsive Breakpoints

### TC-9.5.1: Desktop (1024px+)
- [ ] Sidebar visible on left
- [ ] Bottom nav hidden
- [ ] Content area uses full remaining width
- [ ] Multi-column layouts where applicable

### TC-9.5.2: Tablet (768px–1023px)
- [ ] Sidebar may be collapsed or hidden
- [ ] Bottom nav may appear
- [ ] Content adapts to narrower width
- [ ] No horizontal scrollbar

### TC-9.5.3: Mobile (<768px)
- [ ] Sidebar hidden
- [ ] Bottom nav visible
- [ ] Single-column layout
- [ ] All text readable without zoom
- [ ] Buttons/links have adequate touch targets (min 44px)
- [ ] No horizontal overflow/scrollbar

### TC-9.5.4: Very small screens (320px)
- [ ] Content still readable
- [ ] No overlapping elements
- [ ] Forms usable (input fields accessible)
- [ ] Navigation functional

---

## 9.6 Page Transitions

### TC-9.6.1: Loading states
- [ ] Navigating between pages shows loading indicator (skeleton, spinner, or similar)
- [ ] No flash of unstyled content
- [ ] Content appears smoothly after load

### TC-9.6.2: Sheet/dialog behavior
- [ ] Sheet forms (property, tenant, vendor) slide from right
- [ ] Clicking outside sheet or pressing Escape closes it
- [ ] Background content is dimmed/overlaid
- [ ] Sheet works on both mobile and desktop

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/17 test cases passed

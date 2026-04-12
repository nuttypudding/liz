---
type: project
tags: [testing, edge-cases, error-handling, manual-testing]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/10-edge-cases.md
---

# 10 — Edge Cases & Error Handling

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

---

## 10.1 Empty States

### TC-10.1.1: Dashboard — no properties
- [ ] Landlord with 0 properties visits `/dashboard`
- [ ] Dashboard shows empty/onboarding state (not a crash)
- [ ] Stats show zeros or "N/A"
- [ ] Prompt to add first property visible

### TC-10.1.2: Properties page — no properties
- [ ] Navigate to `/properties`
- [ ] "No properties yet" message displayed
- [ ] "Add Property" button visible and functional

### TC-10.1.3: Vendors page — no vendors
- [ ] Navigate to `/vendors`
- [ ] "No vendors yet" message displayed
- [ ] "Add Vendor" button visible and functional

### TC-10.1.4: Requests page — no requests
- [ ] Navigate to `/requests`
- [ ] "No requests found" or empty state message
- [ ] Tabs still functional (All, Emergency, etc.)

### TC-10.1.5: Tenant my-requests — no requests
- [ ] Sign in as tenant with 0 requests
- [ ] Navigate to `/my-requests`
- [ ] "No requests yet" message with "Submit a Request" link
- [ ] Link navigates to `/submit`

### TC-10.1.6: Request filters — no matches
- [ ] On `/requests`, apply filters that match nothing
- [ ] "No requests found" message shown
- [ ] Filters can be cleared to return to full list

---

## 10.2 Form Validation Boundaries

### TC-10.2.1: Property form — boundary values
- [ ] Unit Count = 1 — accepted (minimum)
- [ ] Unit Count = 0 — rejected
- [ ] Unit Count = 999 — accepted (reasonable maximum)
- [ ] Monthly Rent = 0 — accepted (possible free unit)
- [ ] Monthly Rent = negative — rejected
- [ ] Property Name = very long string (200+ chars) — handled gracefully

### TC-10.2.2: Tenant form — email validation
- [ ] Valid email "test@example.com" — accepted
- [ ] Invalid email "not-an-email" — rejected
- [ ] Empty email — rejected (required)
- [ ] Email with special chars "user+tag@domain.co" — accepted

### TC-10.2.3: Tenant form — lease date logic
- [ ] Lease Start before Lease End — accepted
- [ ] Lease Start = Lease End — accepted (same-day lease)
- [ ] Lease Start after Lease End — should warn or reject

### TC-10.2.4: Vendor form — phone formatting
- [ ] Enter digits "5551234567" — should format correctly
- [ ] Enter formatted "(555) 123-4567" — accepted
- [ ] Enter partial number "555" — handled gracefully

### TC-10.2.5: Submit form — description limits
- [ ] Empty description — rejected (required)
- [ ] Single word "help" — accepted
- [ ] Very long description (2000+ chars) — handled gracefully (truncated or accepted)

---

## 10.3 API Error Handling

### TC-10.3.1: Network disconnection
- [ ] Open a page that makes API calls
- [ ] Disconnect network (dev tools > Network > Offline)
- [ ] Page shows error state (not blank white screen)
- [ ] Reconnect network — can retry or refresh

### TC-10.3.2: Slow API responses
- [ ] Throttle network to Slow 3G (dev tools)
- [ ] Navigate to `/dashboard`
- [ ] Loading states visible during slow load
- [ ] Page eventually renders (within timeout)
- [ ] No duplicate requests or infinite spinners

### TC-10.3.3: Invalid request ID
- [ ] Navigate to `/requests/00000000-0000-0000-0000-000000000000`
- [ ] Shows 404 or "not found" message
- [ ] No crash or console error

### TC-10.3.4: Expired session
- [ ] Open app, wait for Clerk session to near-expire
- [ ] Or manually clear cookies/auth state
- [ ] Next API call should redirect to sign-in
- [ ] No sensitive data exposed

---

## 10.4 Concurrent Operations

### TC-10.4.1: Double-submit prevention
- [ ] On tenant submit form: rapidly click "Submit" twice
- [ ] Only one request created (not duplicated)
- [ ] Button disabled after first click

### TC-10.4.2: Double-dispatch prevention
- [ ] On request detail: rapidly click "Approve & Dispatch" twice
- [ ] Only one dispatch call made
- [ ] Button disabled after first click

### TC-10.4.3: Rapid navigation
- [ ] Click through sidebar items rapidly
- [ ] No crashes, errors, or stale data displayed
- [ ] Final page renders correctly

---

## 10.5 Data Integrity

### TC-10.5.1: Delete property with tenants
- [ ] Create a property with 2 tenants
- [ ] Delete the property
- [ ] Confirm both tenants also removed
- [ ] No orphaned tenant records

### TC-10.5.2: Delete property with requests
- [ ] Create a property, submit a request against it
- [ ] Delete the property
- [ ] Request should be handled (removed or marked orphaned)
- [ ] No broken references on requests page

### TC-10.5.3: Edit property — data persists
- [ ] Edit a property's name and address
- [ ] Navigate to dashboard — property selector shows new name
- [ ] Navigate to requests — requests show new property name

### TC-10.5.4: Vendor deletion — active requests
- [ ] Assign a vendor to a request
- [ ] Delete that vendor
- [ ] Request should handle missing vendor gracefully
- [ ] No crash on request detail page

---

## 10.6 Browser Compatibility

### TC-10.6.1: Chrome (latest)
- [ ] All pages render correctly
- [ ] All interactions work
- [ ] No console errors

### TC-10.6.2: Firefox (latest)
- [ ] All pages render correctly
- [ ] Forms submit properly
- [ ] No layout differences

### TC-10.6.3: Safari (latest, if available)
- [ ] All pages render correctly
- [ ] Date inputs work (Safari has different date picker)
- [ ] No layout issues

### TC-10.6.4: Mobile Chrome (Android)
- [ ] Touch interactions work
- [ ] Bottom nav functions properly
- [ ] Forms usable with on-screen keyboard

### TC-10.6.5: Mobile Safari (iOS)
- [ ] All pages render correctly
- [ ] No viewport issues
- [ ] Forms work with iOS keyboard

---

## 10.7 Accessibility Quick Check

### TC-10.7.1: Keyboard navigation
- [ ] Can Tab through all interactive elements
- [ ] Focus indicators visible on focused elements
- [ ] Enter/Space activates buttons and links
- [ ] Escape closes modals/sheets

### TC-10.7.2: Screen reader basics
- [ ] Page has a main heading (h1 or equivalent)
- [ ] Form fields have labels
- [ ] Buttons have accessible names
- [ ] Images have alt text (or decorative role)

### TC-10.7.3: Color contrast
- [ ] Text readable against backgrounds
- [ ] Badges distinguishable (urgency colors)
- [ ] Error messages visible and clear
- [ ] Don't rely solely on color to convey information

---

## 10.8 Performance Quick Check

### TC-10.8.1: Dashboard load time
- [ ] Dashboard loads within 3 seconds on broadband
- [ ] No excessive API calls (check Network tab — should be <10 calls)
- [ ] No large payload downloads (>1MB)

### TC-10.8.2: Property page with many items
- [ ] If 10+ properties exist: page renders without lag
- [ ] Scrolling is smooth
- [ ] No rendering janks

### TC-10.8.3: Memory leaks (basic)
- [ ] Navigate between pages 10+ times
- [ ] App remains responsive
- [ ] No increasing memory usage in dev tools

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/33 test cases passed

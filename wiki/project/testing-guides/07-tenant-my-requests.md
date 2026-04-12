---
type: project
tags: [testing, tenant, requests, manual-testing]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/07-tenant-my-requests.md
---

# 07 — Tenant My Requests

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

**Prerequisite:** Signed in as tenant with at least 1 submitted request.

---

## 7.1 My Requests Page

### TC-7.1.1: Page renders
- [ ] Navigate to `/my-requests`
- [ ] Page loads without errors
- [ ] Request list or empty state visible

### TC-7.1.2: Empty state
- [ ] With no submitted requests: shows "No requests yet" message
- [ ] Shows link/button to "Submit a Request" (links to `/submit`)

### TC-7.1.3: Request list
- [ ] With existing requests: shows request cards
- [ ] Each card shows: urgency badge, category, description preview, date, status

---

## 7.2 Tabs

### TC-7.2.1: Tab — All
- [ ] "All" tab selected by default
- [ ] Shows all tenant's requests (active + resolved)

### TC-7.2.2: Tab — Active
- [ ] Click "Active" tab
- [ ] Shows only requests with non-resolved statuses (submitted, triaged, approved, dispatched)
- [ ] No resolved/closed requests shown

### TC-7.2.3: Tab — Resolved
- [ ] Click "Resolved" tab
- [ ] Shows only requests with status: resolved, closed
- [ ] No active requests shown

### TC-7.2.4: Empty tab
- [ ] If a tab has no matching requests: shows empty state
- [ ] "Submit a Request" link visible in empty state

---

## 7.3 Request Detail (Tenant View)

### TC-7.3.1: Navigate to detail
- [ ] Click a request card
- [ ] Navigates to `/my-requests/{id}`
- [ ] Page loads with request details

### TC-7.3.2: Read-only view
- [ ] Page is read-only (no edit/dispatch capabilities)
- [ ] No vendor selector visible
- [ ] No work order editor visible
- [ ] No approve/dispatch button

### TC-7.3.3: Tenant message displayed
- [ ] Original issue description visible
- [ ] Photos visible (if submitted)

### TC-7.3.4: AI Classification visible
- [ ] Category shown with icon
- [ ] Urgency badge with color coding
- [ ] Status badge showing current status
- [ ] Recommended action text visible

### TC-7.3.5: Metadata card
- [ ] Submitted date shown
- [ ] Property name shown
- [ ] Request ID shown

### TC-7.3.6: Request not found
- [ ] Navigate to `/my-requests/nonexistent-id`
- [ ] Shows "Request not found" message
- [ ] No crashes or console errors

---

## 7.4 Cross-User Isolation

### TC-7.4.1: Tenant sees only their requests
- [ ] Submit 2 requests as Tenant A
- [ ] Sign in as Tenant B (different tenant)
- [ ] `/my-requests` shows only Tenant B's requests (or empty)
- [ ] Tenant B cannot see Tenant A's requests

### TC-7.4.2: Tenant cannot access other tenant's request detail
- [ ] Copy a request ID from Tenant A
- [ ] Sign in as Tenant B
- [ ] Navigate to `/my-requests/{tenantA-request-id}`
- [ ] Should show 404 or "not found" (not Tenant A's data)

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/15 test cases passed

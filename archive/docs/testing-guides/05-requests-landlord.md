# 05 — Maintenance Requests (Landlord View)

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

**Prerequisite:** Signed in as landlord. At least 1 property with tenants and submitted requests.

---

## 5.1 Requests List Page

### TC-5.1.1: Page renders
- [ ] Navigate to `/requests`
- [ ] Page loads without errors
- [ ] Request list or empty state visible

### TC-5.1.2: Request list display (desktop)
- [ ] On desktop (1024px+): requests show as scrollable table
- [ ] Table columns: Urgency, Category, Property, Tenant, Description, Date, Status
- [ ] Each row is clickable

### TC-5.1.3: Request list display (mobile)
- [ ] On mobile (<768px): requests show as card list
- [ ] Each card shows: urgency badge, category, tenant name, description preview, date
- [ ] Cards are tappable

---

## 5.2 Filtering & Tabs

### TC-5.2.1: Tab — All
- [ ] "All" tab selected by default
- [ ] Shows all requests regardless of status
- [ ] Count matches total requests

### TC-5.2.2: Tab — Emergency
- [ ] Click "Emergency" tab
- [ ] Shows only requests with ai_urgency = "emergency"
- [ ] All displayed requests have emergency badge
- [ ] Count accurate

### TC-5.2.3: Tab — In Progress
- [ ] Click "In Progress" tab
- [ ] Shows requests with status: submitted, triaged, approved, dispatched
- [ ] No resolved/closed requests shown

### TC-5.2.4: Tab — Resolved
- [ ] Click "Resolved" tab
- [ ] Shows requests with status: resolved, closed
- [ ] No active requests shown

### TC-5.2.5: Filter — by property
- [ ] Use property dropdown filter
- [ ] Select a specific property
- [ ] Only requests for that property shown
- [ ] Select "All Properties" — full list returns

### TC-5.2.6: Filter — by urgency
- [ ] Use urgency dropdown filter
- [ ] Select "Emergency" — only emergency requests shown
- [ ] Select "Medium" — only medium requests shown
- [ ] Select "Low" — only low requests shown
- [ ] Clear filter — all urgencies shown

### TC-5.2.7: Search
- [ ] Type in search box: partial tenant name
- [ ] Results filter to matching requests
- [ ] Type partial issue description
- [ ] Results filter accordingly
- [ ] Clear search — full list returns

### TC-5.2.8: Combined filters
- [ ] Select a property AND an urgency filter
- [ ] Results match both criteria
- [ ] Switch tabs — filters persist or reset appropriately

### TC-5.2.9: Empty filter results
- [ ] Apply filters that match no requests
- [ ] Shows "No requests found" message
- [ ] No broken UI

---

## 5.3 Request Detail Page

### TC-5.3.1: Navigate to detail
- [ ] Click a request card/row from the list
- [ ] Navigates to `/requests/{id}`
- [ ] Page loads with full request details
- [ ] Back link visible to return to list

### TC-5.3.2: Tenant message
- [ ] Tenant's original message displayed in full
- [ ] Text is readable and properly formatted
- [ ] Tenant name shown

### TC-5.3.3: Request photos
- [ ] If photos attached: photo grid visible (up to 3 thumbnails)
- [ ] Photos are viewable/expandable
- [ ] If no photos: appropriate placeholder or "No photos" text
- [ ] Photo file type indicators shown

### TC-5.3.4: Urgency and status badges
- [ ] Urgency badge color-coded: Emergency (red), Medium (yellow), Low (green)
- [ ] Status badge shows current status (submitted, triaged, dispatched, etc.)

---

## 5.4 AI Classification Card

### TC-5.4.1: Classification display
- [ ] AI Classification card visible on detail page
- [ ] Shows category (e.g., Plumbing, Electrical, HVAC)
- [ ] Shows urgency level with color coding
- [ ] Shows confidence score (0–100% or 0–1)
- [ ] Shows recommended action text

### TC-5.4.2: Cost estimate card
- [ ] Cost estimate section visible
- [ ] Shows low-high range (e.g., "$50 — $200")
- [ ] Values are formatted as currency

---

## 5.5 Vendor Selection

### TC-5.5.1: Vendor selector
- [ ] Vendor dropdown/selector visible on detail page
- [ ] Lists available vendors from landlord's vendor network
- [ ] Vendors sorted by relevance (matching specialty first)

### TC-5.5.2: Auto-match by category
- [ ] If request is "Plumbing" category, plumbing vendors appear first
- [ ] If request is "Electrical" category, electrical vendors appear first
- [ ] "General" vendors available for any category

### TC-5.5.3: Change vendor
- [ ] Select a different vendor from dropdown
- [ ] Selection updates immediately
- [ ] Work order template may update based on vendor

---

## 5.6 Work Order

### TC-5.6.1: Work order draft
- [ ] Work order text area visible
- [ ] Pre-populated with templated text (property, issue, tenant info)
- [ ] Text is editable

### TC-5.6.2: Edit work order
- [ ] Modify the work order text
- [ ] Changes are preserved (not reset on re-render)
- [ ] Can save draft without dispatching (via Save Draft if available)

---

## 5.7 Dispatch

### TC-5.7.1: Approve & Dispatch button
- [ ] "Approve & Dispatch" button visible
- [ ] Button is disabled if no vendor selected
- [ ] Button shows enabled state when vendor is selected

### TC-5.7.2: Successful dispatch
- [ ] Select a vendor
- [ ] Verify/edit work order text
- [ ] Click "Approve & Dispatch"
- [ ] Loading indicator during API call
- [ ] Success toast notification
- [ ] Request status changes to "dispatched"
- [ ] Dispatched timestamp shown
- [ ] Approve button becomes disabled (already dispatched)

### TC-5.7.3: Already dispatched request
- [ ] Navigate to a previously dispatched request
- [ ] Approve button is disabled
- [ ] Status shows "dispatched" with date/time
- [ ] Vendor and work order still visible but may be read-only

---

## 5.8 Request Not Found

### TC-5.8.1: Invalid request ID
- [ ] Navigate to `/requests/nonexistent-id`
- [ ] Shows 404 or "Request not found" message
- [ ] No console errors or crashes
- [ ] Back link or navigation still works

---

## 5.9 Responsive Layout

### TC-5.9.1: Desktop detail page
- [ ] Left column: request details, photos, work order
- [ ] Right sidebar: AI classification, cost, vendor, approve button
- [ ] Clean two-column layout

### TC-5.9.2: Mobile detail page
- [ ] Single column layout, content stacked
- [ ] Approve button at bottom (sticky)
- [ ] All sections readable and scrollable
- [ ] No horizontal overflow

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/29 test cases passed

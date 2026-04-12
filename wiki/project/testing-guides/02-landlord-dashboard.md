---
type: project
tags: [testing, dashboard, landlord, manual-testing]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/02-landlord-dashboard.md
---

# 02 — Landlord Dashboard

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

**Prerequisite:** Signed in as landlord with at least 1 property and 1 maintenance request.

---

## 2.1 Dashboard Page Load

### TC-2.1.1: Dashboard renders
- [ ] Navigate to `/dashboard`
- [ ] Page loads without errors
- [ ] No console errors in browser dev tools
- [ ] Loading skeleton/spinner shows briefly, then content appears

### TC-2.1.2: Dashboard with no properties (empty state)
- [ ] Sign in as landlord with zero properties
- [ ] Dashboard shows empty/onboarding state
- [ ] Onboarding banner visible prompting to add first property
- [ ] Stats cards show zeros or appropriate empty values

---

## 2.2 Property Selector Bar

### TC-2.2.1: Property selector renders
- [ ] Property selector dropdown/bar visible at top of dashboard
- [ ] Shows "All Properties" as default selection
- [ ] Dropdown lists all landlord's properties by name

### TC-2.2.2: Filter by property
- [ ] Select a specific property from dropdown
- [ ] Stats cards update to show data for that property only
- [ ] Recent requests section updates to show only that property's requests
- [ ] Spend chart updates for selected property

### TC-2.2.3: Return to all properties
- [ ] After filtering, select "All Properties"
- [ ] Stats return to aggregate view
- [ ] All requests visible again

---

## 2.3 Stats Section Cards

### TC-2.3.1: Emergency count card
- [ ] Card shows count of emergency-urgency requests
- [ ] Count matches actual emergency requests in the system
- [ ] Card has appropriate emergency styling (red/alert)

### TC-2.3.2: Open requests count card
- [ ] Shows total open (non-resolved, non-closed) requests
- [ ] Number updates when filtering by property

### TC-2.3.3: Average resolution days card
- [ ] Shows average days to resolve requests
- [ ] Shows "N/A" or "0" if no resolved requests exist
- [ ] Number is reasonable (not negative, not absurdly large)

### TC-2.3.4: Monthly spend card
- [ ] Shows current month's spending total
- [ ] Formatted as currency ($X,XXX)
- [ ] Shows $0 if no spending recorded

---

## 2.4 Banners

### TC-2.4.1: Emergency alert banner
- [ ] If emergency requests exist: red/alert banner visible at top
- [ ] Shows count of emergency issues
- [ ] Banner is clickable or has link to requests page filtered by emergency
- [ ] If no emergencies: banner not shown

### TC-2.4.2: Onboarding banner
- [ ] If onboarding not completed: onboarding prompt banner visible
- [ ] Banner links to `/onboarding` or has action button
- [ ] If onboarding completed: banner not shown

### TC-2.4.3: Late payment banner
- [ ] If any tenant has overdue rent: late payment banner visible
- [ ] Shows count of properties with overdue rent
- [ ] If no overdue rent: banner not shown

---

## 2.5 Spend Chart

### TC-2.5.1: Chart renders
- [ ] Spending chart area renders below stats cards
- [ ] Chart shows monthly spending trend (bar or line chart)
- [ ] X-axis shows months, Y-axis shows dollar amounts

### TC-2.5.2: Chart with no data
- [ ] If no spending recorded: chart shows empty state or zero line
- [ ] No rendering errors

### TC-2.5.3: Chart filters with property
- [ ] Select a property — chart updates to show only that property's spending
- [ ] Select "All Properties" — chart returns to aggregate

---

## 2.6 Recent Requests

### TC-2.6.1: Recent requests list
- [ ] Shows up to 3 most recent maintenance requests
- [ ] Each request shows: urgency badge, category, tenant message preview, date
- [ ] Request cards are clickable (link to `/requests/{id}`)

### TC-2.6.2: No recent requests
- [ ] If no requests exist: shows appropriate empty state message
- [ ] No broken UI elements

### TC-2.6.3: Request urgency badges
- [ ] Emergency requests show red/urgent badge
- [ ] Medium requests show yellow/warning badge
- [ ] Low requests show green/normal badge

---

## 2.7 Property Drill-Down

### TC-2.7.1: Drill-down activates on property selection
- [ ] Select a specific property from selector
- [ ] Drill-down section appears showing property details
- [ ] Shows tabs: Documents, Photos, Utilities (or similar)

### TC-2.7.2: Documents tab
- [ ] Click Documents tab
- [ ] Shows list of documents for selected property
- [ ] If no documents: shows empty state
- [ ] Document names and types visible

### TC-2.7.3: Photos tab
- [ ] Click Photos tab
- [ ] Shows photos associated with property/requests
- [ ] Photos render as thumbnails
- [ ] If no photos: shows empty state

### TC-2.7.4: Utilities tab
- [ ] Click Utilities tab
- [ ] Shows utility providers configured for the property
- [ ] Shows provider names and types (water, electric, gas, etc.)
- [ ] If no utilities: shows empty state or setup prompt

---

## 2.8 Responsive Layout

### TC-2.8.1: Desktop layout (1024px+)
- [ ] Multi-column grid layout for stats cards
- [ ] Sidebar visible on left
- [ ] Chart and requests side-by-side or stacked neatly

### TC-2.8.2: Tablet layout (768px–1023px)
- [ ] Stats cards stack to 2-column grid
- [ ] Content remains readable

### TC-2.8.3: Mobile layout (<768px)
- [ ] Stats cards stack to single column
- [ ] Sidebar hidden, bottom nav visible
- [ ] All content scrollable and readable
- [ ] No horizontal overflow

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/25 test cases passed

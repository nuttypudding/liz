---
type: project
tags: [testing, vendors, manual-testing]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/04-vendors.md
---

# 04 — Vendors Management

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

**Prerequisite:** Signed in as landlord.

---

## 4.1 Vendors Page Load

### TC-4.1.1: Page renders
- [ ] Navigate to `/vendors`
- [ ] Page loads without errors
- [ ] No console errors in browser dev tools

### TC-4.1.2: Empty state
- [ ] With no vendors: shows "No vendors yet" message
- [ ] "Add Vendor" button visible and prominent

### TC-4.1.3: Vendor list layout
- [ ] With existing vendors: shows vendor cards in grid
- [ ] Mobile: 1-column layout
- [ ] Tablet: 2-column layout
- [ ] Desktop: 3-column layout

---

## 4.2 Create Vendor

### TC-4.2.1: Open add vendor form
- [ ] Click "Add Vendor" button
- [ ] Sheet/sidebar opens from right
- [ ] Fields visible: Business Name, Phone, Email, Specialty, Priority Rank, Notes, Custom Fields

### TC-4.2.2: Validation — required fields
- [ ] Leave Business Name empty, click Save — should show error
- [ ] Form does not submit with missing required fields

### TC-4.2.3: Successful vendor creation
- [ ] Fill in: Name = "FastFix Plumbing", Phone = "555-0001", Email = "info@fastfix.com"
- [ ] Select Specialty = "Plumbing"
- [ ] Select Priority Rank = "1st — Preferred"
- [ ] Add Notes = "Available 24/7 for emergencies"
- [ ] Click "Save"
- [ ] Sheet closes
- [ ] Toast notification confirms creation
- [ ] New vendor card appears in grid

### TC-4.2.4: Vendor card display
- [ ] Card shows business name
- [ ] Specialty badge visible (e.g., "Plumbing" chip)
- [ ] Priority rank badge visible (e.g., "1st" badge)
- [ ] Phone number shown and clickable (tel: link)
- [ ] Email shown and clickable (mailto: link)
- [ ] Notes preview visible (truncated if long)
- [ ] Custom fields count shown if any

### TC-4.2.5: Specialty options
- [ ] Open vendor form
- [ ] Specialty dropdown contains: Plumbing, Electrical, HVAC, Structural, Pest, Appliance, General
- [ ] Can select each option
- [ ] Selected specialty shows as badge on card

### TC-4.2.6: Priority rank options
- [ ] Priority rank dropdown contains: Unranked, 1st — Preferred, 2nd, 3rd
- [ ] Selecting a rank shows appropriate badge on card

### TC-4.2.7: Custom fields
- [ ] Click "Add Custom Field" or equivalent
- [ ] Enter Key = "License #", Value = "PL-12345"
- [ ] Add another: Key = "Insurance", Value = "Covered"
- [ ] Save vendor
- [ ] Card shows custom fields count (e.g., "2 fields")

---

## 4.3 Edit Vendor

### TC-4.3.1: Open edit form
- [ ] Click "Edit" button on a vendor card
- [ ] Sheet opens with form pre-filled with vendor data

### TC-4.3.2: Verify pre-filled data
- [ ] Business Name, Phone, Email match existing values
- [ ] Specialty and Priority Rank match
- [ ] Notes match
- [ ] Custom fields match

### TC-4.3.3: Successful edit
- [ ] Change business name and phone
- [ ] Click Save
- [ ] Sheet closes, card shows updated data
- [ ] Toast notification confirms update

---

## 4.4 Delete Vendor

### TC-4.4.1: Delete confirmation
- [ ] Click "Delete" button on a vendor card
- [ ] Confirmation dialog appears
- [ ] Shows vendor name in confirmation message

### TC-4.4.2: Cancel delete
- [ ] Click Cancel — dialog closes, vendor remains

### TC-4.4.3: Confirm delete
- [ ] Click Confirm/Delete
- [ ] Vendor card removed from grid
- [ ] Toast notification confirms deletion

---

## 4.5 Vendor Sorting

### TC-4.5.1: Sort order
- [ ] Add multiple vendors with different priority ranks
- [ ] Preferred (1st) vendors appear first in the grid
- [ ] Unranked vendors appear last
- [ ] Within same rank, sorted alphabetically by name

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/17 test cases passed

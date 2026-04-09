# 03 — Properties Management

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

**Prerequisite:** Signed in as landlord.

---

## 3.1 Properties Page Load

### TC-3.1.1: Page renders
- [ ] Navigate to `/properties`
- [ ] Page loads without errors
- [ ] No console errors in browser dev tools

### TC-3.1.2: Empty state
- [ ] With no properties: shows "No properties yet" message
- [ ] "Add Property" button visible and prominent
- [ ] No broken UI or rendering errors

### TC-3.1.3: Properties list
- [ ] With existing properties: shows property cards
- [ ] Each card shows: property name, address, unit count, monthly rent
- [ ] Properties ordered by creation date (newest first)

---

## 3.2 Create Property

### TC-3.2.1: Open add property form
- [ ] Click "Add Property" button
- [ ] Sheet/sidebar slides in from the right
- [ ] Form fields visible: Property Name, Street Address, Apt/Unit No, City, State, ZIP Code, Unit Count, Monthly Rent

### TC-3.2.2: Validation — empty required fields
- [ ] Leave all fields empty, click "Save Property"
- [ ] Validation error shown for Property Name (required)
- [ ] Validation error shown for Street Address (required)
- [ ] Validation error shown for City (required)
- [ ] Validation error shown for State (required)
- [ ] Validation error shown for ZIP Code (required)
- [ ] Form does not submit

### TC-3.2.3: Validation — invalid values
- [ ] Enter Unit Count as 0 — should show error (min 1)
- [ ] Enter Monthly Rent as negative — should show error (min 0)

### TC-3.2.4: Successful property creation
- [ ] Fill in: Property Name = "Oak Manor", Street Address = "123 Oak St", City = "Austin", State = "TX", ZIP Code = "78701", Unit Count = 4, Monthly Rent = 1200
- [ ] Click "Save Property"
- [ ] Sheet closes
- [ ] Toast notification: "Property created" (or similar success message)
- [ ] New property appears in the list
- [ ] Utility auto-detect toast appears (offering to detect utilities)

### TC-3.2.5: Cancel property creation
- [ ] Click "Add Property" to open form
- [ ] Fill in some fields
- [ ] Click "Cancel" or close the sheet
- [ ] Form closes without saving
- [ ] No new property appears in list

---

## 3.3 Edit Property

### TC-3.3.1: Open edit form
- [ ] Find an existing property card
- [ ] Click "Edit" button on the property card
- [ ] Sheet opens with form pre-filled with current property data

### TC-3.3.2: Verify pre-filled data
- [ ] Property Name matches existing value
- [ ] Street Address matches existing value
- [ ] City matches existing value
- [ ] State matches existing value
- [ ] ZIP Code matches existing value
- [ ] Unit Count matches existing value
- [ ] Monthly Rent matches existing value

### TC-3.3.3: Successful edit
- [ ] Change Property Name to "Oak Manor Updated"
- [ ] Click "Save Property"
- [ ] Sheet closes
- [ ] Toast notification confirms update
- [ ] Property card shows updated name

### TC-3.3.4: Edit with address change
- [ ] Edit a property and change one or more address fields (street, city, state, or ZIP)
- [ ] Save the property
- [ ] Should prompt to re-detect utilities for new address
- [ ] Re-detect dialog respects confirmed entries (preserves them)

---

## 3.4 Delete Property

### TC-3.4.1: Delete confirmation
- [ ] Click "Delete" button on a property card
- [ ] Confirmation dialog appears: "Are you sure?" with property name
- [ ] Dialog has "Cancel" and "Delete" / "Confirm" buttons

### TC-3.4.2: Cancel delete
- [ ] Click "Cancel" on confirmation dialog
- [ ] Dialog closes
- [ ] Property still visible in list

### TC-3.4.3: Confirm delete
- [ ] Click "Delete" / "Confirm" on confirmation dialog
- [ ] Property removed from list
- [ ] Toast notification confirms deletion
- [ ] All associated tenants removed (verify by count)

---

## 3.5 Tenant Management (within Property)

### TC-3.5.1: View tenants
- [ ] Expand a property card (click to expand or navigate)
- [ ] Tenant list visible under the property
- [ ] Each tenant shows: name, email, phone, unit number
- [ ] Lease status badges visible: Active (green), Expiring Soon (yellow), Expired (red)

### TC-3.5.2: Add tenant — open form
- [ ] Click "Add Tenant" button within a property
- [ ] Tenant form sheet opens
- [ ] Fields visible: First Name, Last Name, Email, Phone, Unit Number, Move-in Date, Lease Type, Lease Start, Lease End, Rent Due Day

### TC-3.5.3: Add tenant — required field validation
- [ ] Leave First Name empty, click Save — should show error
- [ ] Leave Last Name empty, click Save — should show error
- [ ] Leave Email empty, click Save — should show error
- [ ] Enter invalid email format — should show error

### TC-3.5.4: Add tenant — successful creation
- [ ] Fill in: First Name = "Jane", Last Name = "Doe", Email = "jane@test.com", Phone = "555-1234", Unit = "2A"
- [ ] Set Lease Type = "Yearly", Start = today, End = 1 year from now
- [ ] Click "Save Tenant"
- [ ] Sheet closes, tenant appears under property
- [ ] Lease status shows "Active" (green badge)

### TC-3.5.5: Add tenant — with custom fields
- [ ] Open add tenant form
- [ ] Add a custom field: Key = "Parking Spot", Value = "P12"
- [ ] Add another custom field: Key = "Pet", Value = "Cat"
- [ ] Save tenant
- [ ] Custom field count shown on tenant card

### TC-3.5.6: Edit tenant
- [ ] Click "Edit" on an existing tenant card
- [ ] Form opens pre-filled with tenant data
- [ ] Change first name, last name, and phone number
- [ ] Save — verify changes reflected on card

### TC-3.5.7: Delete tenant
- [ ] Click "Delete" on a tenant card
- [ ] Confirmation dialog appears
- [ ] Confirm delete
- [ ] Tenant removed from property's tenant list

### TC-3.5.8: Lease status badges
- [ ] Tenant with lease ending > 60 days away: shows "Active" (green)
- [ ] Tenant with lease ending < 60 days away: shows "Expiring Soon" (yellow)
- [ ] Tenant with lease end date in the past: shows "Expired" (red)
- [ ] Tenant with no lease end date: shows "Active" or "Month-to-Month"

---

## 3.6 Document Management

### TC-3.6.1: Open document section
- [ ] Within a property, find the Documents section/tab/button
- [ ] Document gallery or uploader visible

### TC-3.6.2: Upload document
- [ ] Click upload or drag a file into the uploader
- [ ] Select a document type (e.g., Lease Agreement, Inspection Report)
- [ ] Optionally assign to a specific tenant
- [ ] Click Upload
- [ ] Document appears in the gallery/list
- [ ] Shows file name, type, upload date

### TC-3.6.3: View/download document
- [ ] Click on a document in the gallery
- [ ] Document preview opens (for images/PDFs) or download starts
- [ ] Signed URL works (not expired)

### TC-3.6.4: Delete document
- [ ] Click delete on a document
- [ ] Confirmation prompt appears
- [ ] Confirm — document removed from gallery
- [ ] File removed from storage (verify no broken links)

### TC-3.6.5: Upload with no tenant assignment
- [ ] Upload a document without selecting a tenant
- [ ] Document appears under property (not tenant-specific)

---

## 3.7 Utility Setup

### TC-3.7.1: Open utility setup
- [ ] Within a property, click Utilities button/tab
- [ ] Utility setup sheet opens

### TC-3.7.2: Auto-detect utilities
- [ ] Click "Auto-Detect" or similar button
- [ ] Loading indicator shown during API call
- [ ] Utility providers populate for categories: Water, Electric, Gas, Internet, etc.
- [ ] Each detected provider shows name and account info

### TC-3.7.3: Manual utility entry
- [ ] For a utility category, manually type a provider name
- [ ] Save — provider saved for that category

### TC-3.7.4: Confirm/N-A utilities
- [ ] Mark a utility as "Confirmed" — should persist on re-detect
- [ ] Mark a utility as "N/A" — should persist on re-detect
- [ ] Click re-detect — only unconfirmed entries updated

### TC-3.7.5: Save utilities
- [ ] Configure utilities and click Save
- [ ] Sheet closes
- [ ] Re-open utilities — saved values persist

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/33 test cases passed

---
id: 222
title: Build compliance settings UI — jurisdiction config + lease terms
tier: Opus
depends_on: [210, 211]
feature: P3-003-legal-compliance-engine
---

# 222 — Compliance Settings UI

## Objective
Build a settings page for configuring property jurisdictions and lease terms. Users select state/city for each property and input lease information. Auto-generates compliance checklist items when jurisdiction is set.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Compliance begins with proper configuration. The settings page is where landlords establish jurisdiction-specific rules and baseline lease information that powers compliance checking.

## Implementation

1. **Create compliance settings page** — `apps/web/app/(landlord)/compliance/settings/page.tsx`
   - Allows users to configure jurisdiction and lease terms for each property

2. **Page layout**:
   - **Header**:
     - Title: "Compliance Settings"
     - Subtitle: "Configure jurisdictions and lease terms for each property"
     - DisclaimerBanner

   - **Property selector**:
     - Dropdown or tabs to select which property to configure
     - Show current property name
     - Display current jurisdiction badge

   - **Jurisdiction section**:
     - Title: "Property Jurisdiction"
     - Explanation: "Jurisdiction determines which rules apply to your property"
     - Form fields:
       - State (dropdown): List all available states from jurisdiction_rules
       - City (dropdown): Optional, filtered by selected state
     - "Auto-detect from address" button (if address available)
     - "Save" button
     - Success message: "Jurisdiction updated. Checklist items generated."
     - If auto-detect available: Show suggested state/city with "Accept" button

   - **Lease Terms section**:
     - Title: "Lease Information"
     - Explanation: "Used for compliance checks (e.g., notice periods, deposit limits)"
     - Form fields:
       - Lease start date (date picker)
       - Lease end date (date picker)
       - Monthly rent amount (currency)
       - Security deposit amount (currency)
       - Lease type (dropdown: "Fixed term", "Month-to-month")
       - Tenant name (text field, optional)
       - Unit number (text field, optional)
     - "Save" button
     - Success message: "Lease terms saved"

   - **Checklist section**:
     - Title: "Compliance Checklist Preview"
     - Show first 5-10 checklist items that will be generated
     - Message: "X total items. View all on compliance dashboard."
     - Link to dashboard

3. **Form behavior**:
   - **On jurisdiction change**:
     - Call POST /api/properties/[id]/jurisdiction with state_code and city
     - Show loading spinner
     - On success: Fetch new checklist items via GET /api/compliance/[propertyId]/checklist
     - Show success toast
     - Update checklist preview

   - **On lease terms change**:
     - Save to properties table (lease_terms JSONB column, or separate lease_terms table)
     - Show loading spinner and success toast
     - Alerts refresh (some alerts depend on lease dates)

4. **Validation**:
   - State must be selected
   - City optional but must be valid if provided
   - Lease dates: end date must be after start date
   - Rent and deposit must be positive numbers
   - Show validation errors inline

5. **Multi-property support**:
   - Property dropdown at top switches which property is being edited
   - Each property has separate jurisdiction and lease terms
   - Persist all changes immediately on "Save"

6. **Advanced section** (optional):
   - Link to jurisdiction rules: "View all rules for this jurisdiction" → knowledge base (task 223)
   - Link to alerts: "View active alerts for this property" → dashboard detail page

7. **Design patterns**:
   - Use existing form input components (input, select, date picker)
   - Use DisclaimerBanner
   - Use card component for each section
   - Use button component for actions
   - Show success/error toasts for saves

8. **Mobile responsiveness**:
   - Stack sections vertically on mobile
   - Single-column form layout
   - Dropdown fields stack properly

9. **Loading and error states**:
   - Show skeleton loaders while fetching property data
   - Show error message if save fails, with retry button
   - Handle case where property not found

10. **Integration**:
    - Can be accessed from:
      - Settings menu (if exists)
      - Compliance dashboard (task 219) — "Configure" button on property card
      - Compliance detail page (task 219) — sidebar button

11. **Update endpoints.md**
    - Document new page: /compliance/settings

## Acceptance Criteria
1. [ ] Settings page created at /app/(landlord)/compliance/settings
2. [ ] Property dropdown to select which property to configure
3. [ ] Jurisdiction section with state + city dropdowns
4. [ ] Auto-detect from address suggestion feature
5. [ ] Lease terms section with date pickers and currency fields
6. [ ] Form validation with inline error messages
7. [ ] Calls POST /api/properties/[id]/jurisdiction on save
8. [ ] Calls GET /api/compliance/[propertyId]/checklist after jurisdiction update
9. [ ] Shows checklist preview with item count
10. [ ] Success/error toasts on save
11. [ ] DisclaimerBanner displayed at top
12. [ ] Links to knowledge base and alerts
13. [ ] Responsive design for mobile and desktop
14. [ ] Multi-property support
15. [ ] endpoints.md updated

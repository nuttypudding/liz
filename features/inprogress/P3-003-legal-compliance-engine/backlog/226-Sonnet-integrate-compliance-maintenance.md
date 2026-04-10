---
id: 226
title: Integrate compliance into maintenance flow — habitability alerts + entry notices
tier: Sonnet
depends_on: [218, 224]
feature: P3-003-legal-compliance-engine
---

# 226 — Integrate Compliance into Maintenance Flow

## Objective
Integrate compliance features into the existing maintenance request workflow. Display habitability-related alerts when viewing maintenance requests. Suggest entry notice generation when scheduling vendor visits.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Maintenance requests and compliance are intertwined. Many maintenance issues involve habitability requirements or require proper notice for entry. Integrating compliance at this touchpoint helps landlords maintain legal compliance.

## Implementation

1. **Habitability alerts on request detail** — `app/(landlord)/requests/[id]/page.tsx`
   - File structure: App page showing maintenance request details
   - Add compliance section:
     - **ComplianceAlertBanner** showing relevant alerts
     - Example alerts:
       - "This is a habitability issue. You must address within 3 days."
       - "Tenant reports water leak. Check water damage habitability requirements."
       - "HVAC issue reported. Heating/cooling is a habitability requirement."
   - Alert filtering:
     - Fetch alerts from GET /api/compliance/alerts/[propertyId]
     - Filter to habitability-related alerts only
     - Sort by severity

2. **Entry notice suggestion on vendor scheduling** — When user schedules vendor visit:
   - Context: Assuming there's a UI to schedule/book vendor for a request
   - Logic:
     - When saving scheduled visit date/time, check if entry notice is required
     - Query jurisdiction rules for notice period (e.g., 24 hours, 48 hours)
     - Calculate if notice is needed (today's date + notice period < visit date)
     - If yes, show suggestion banner: "You have 48 hours to provide entry notice. Generate notice?"
     - Action button: "Generate Entry Notice" → links to notice generator (task 220)
     - Checkbox: "I'll provide notice separately"
     - Dismiss button: "I've already notified the tenant"

3. **Implementation steps**:

   **Step 1: Update maintenance request detail page**
   - Add compliance alerts section at top
   - Fetch alerts using:
     ```typescript
     const alerts = await fetch(
       `/api/compliance/alerts/${propertyId}?severity=error,warning`
     );
     ```
   - Filter alerts where type includes "habitability" or applies to maintenance
   - Use ComplianceAlertBanner component to display

   **Step 2: Add entry notice suggestion to vendor scheduling**
   - When user clicks "Schedule Vendor" or "Book Appointment":
     - Fetch jurisdiction notice requirements
     - Calculate notice deadline (visit date - notice period)
     - If current date >= deadline, show warning
     - Show suggestion banner with action button

   **Step 3: Create EntryNoticeSuggestionBanner component** — `apps/web/components/compliance/EntryNoticeSuggestionBanner.tsx`
     - Props:
       - `propertyId: uuid`
       - `visitorType: string` (e.g., "vendor", "inspector")
       - `visitDate: Date`
       - `noticeRequiredDays: number`
       - `onGenerateNotice: () => void`
       - `onDismiss: () => void`
     - Display:
       - Yellow/warning background
       - Icon: Calendar with clock
       - Title: "Entry Notice Required"
       - Description: "You must provide [X] hours/days notice before [visitor] can enter the property."
       - Action button: "Generate Entry Notice"
       - Checkbox: "I'll handle this separately"
       - Calculation: "Notice required by [deadline date]"
     - Logic:
       - If visitDate - now > requiredDays: show as warning
       - If visitDate - now ≤ requiredDays: show as error

   **Step 4: Integration into maintenance request list** (optional):
     - Add badge to request cards showing compliance status
     - E.g., "Habitability issue" badge (red)
     - E.g., "Entry notice pending" badge (yellow)

4. **Specific maintenance request statuses**:
   - When request marked as "Completed": Check if habitability issue was resolved timely
   - Show alert if resolution was delayed beyond jurisdiction requirements

5. **Design patterns**:
   - Use ComplianceAlertBanner for habitability alerts
   - Use EntryNoticeSuggestionBanner for entry notice suggestions
   - Use existing card, button, badge components
   - Yellow/warning styling for proactive suggestions
   - Red/error styling for violations or missed deadlines

6. **User flows**:

   **Happy path**:
   - User opens maintenance request (e.g., "Water leak in kitchen")
   - ComplianceAlertBanner shows: "This is a habitability issue. You must fix within 3 days."
   - User scrolls to vendor scheduling
   - EntryNoticeSuggestionBanner shows: "Entry notice required 24 hours before. Generate notice?"
   - User clicks "Generate Entry Notice"
   - Navigates to notice generator (task 220) with pre-filled data (entry, today's date, property)

   **Alternative path**:
   - User dismisses entry notice suggestion
   - Banner closes, checkbox remembered for session
   - User can re-show banner by clicking "Show compliance info" or similar

7. **Data sources**:
   - Habitability alerts: GET /api/compliance/alerts/[propertyId]
   - Notice requirements: GET /api/compliance/knowledge?state_code=XX&topic=notice_period_entry
   - Property jurisdiction: GET /api/properties/[id]/jurisdiction

8. **Error handling**:
   - If jurisdiction not configured: Show "Configure jurisdiction to enable compliance checks"
   - If API error fetching alerts: Show error message, don't block request display
   - Graceful fallback: If notice requirement unclear, suggest general 24-48 hour notice

9. **Update endpoints.md**
   - Document integration point: /requests/[id] (compliance alerts section)

## Acceptance Criteria
1. [ ] ComplianceAlertBanner integrated into request detail page
2. [ ] Habitability-related alerts filtered and displayed
3. [ ] EntryNoticeSuggestionBanner component created
4. [ ] Suggests entry notice generation when scheduling vendor
5. [ ] Calculates notice deadline based on jurisdiction requirements
6. [ ] Shows warning/error based on days until deadline
7. [ ] "Generate Entry Notice" button links to notice generator with pre-fill
8. [ ] "I'll handle separately" option to dismiss suggestion
9. [ ] Suggestions also show on request list (badges, optional)
10. [ ] Graceful error handling if jurisdiction not configured
11. [ ] No TypeScript errors
12. [ ] endpoints.md updated

---
id: 068
title: Build UtilityInfoCard — accordion rows, status badges, masked account numbers
tier: Opus
depends_on: [29, 66]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 068 — UtilityInfoCard Component

## Objective

Build the landlord-facing utility display card with accordion rows, status badges, and masked account numbers.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — "Screen 1: Utility Info Card" design.

## Implementation

Create `apps/web/components/properties/utility-info-card.tsx`:

1. Card with header "Utilities" + badge "N/6 confirmed" + Edit button
2. For each utility type with data, render an accordion row:
   - Icon (Zap/Flame/Droplets/Trash2/Wifi/Building)
   - Utility type label + provider name
   - Status badge: AI Suggested (amber), Confirmed (green), N/A (gray)
   - Expandable detail: phone (tel: link), website (external link), account # (masked ****1234 with Show toggle)
3. Empty state: "No utility info yet. Click Edit to add or auto-detect."
4. Edit button opens UtilitySetupSheet (task 069)

Responsive: 2-column grid on desktop, single-column stack on mobile.

Props: `propertyId: string`, `utilities: PropertyUtility[]`, `onEdit: () => void`

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Card shows all utility types with data
3. [ ] Status badges with correct colors (amber/green/gray)
4. [ ] Accordion expands to show details
5. [ ] Account numbers masked with Show toggle
6. [ ] Phone clickable (tel:), website opens new tab
7. [ ] "N/6 confirmed" counter accurate
8. [ ] Edit button triggers callback
9. [ ] Empty state when no data

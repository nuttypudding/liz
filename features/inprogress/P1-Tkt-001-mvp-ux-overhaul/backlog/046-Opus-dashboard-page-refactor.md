---
id: 046
title: Refactor dashboard page — URL-based property selection, conditional rendering
tier: Opus
depends_on: [45]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 046 — Dashboard Page Refactor

## Objective

Restructure the dashboard page from a flat aggregate view to a conditional layout based on the `property` URL search parameter.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "State Management" and "URL Strategy" sections.

File: `apps/web/app/(landlord)/dashboard/page.tsx`

## Implementation

1. Use `useSearchParams()` to read `property` query param:
```typescript
const selectedPropertyId = searchParams.get("property"); // null = all
```

2. Fetch properties list for selector bar (already fetching stats)

3. Add `PropertySelectorBar` above content area

4. Conditional rendering:
   - `selectedPropertyId === null` → existing aggregate view (current dashboard content)
   - `selectedPropertyId !== null` → `PropertyDrillDown` component (task 047)

5. `PropertySelectorBar` updates URL via `router.push("/dashboard?property={id}", { scroll: false })`
6. Clicking "All" navigates to `/dashboard` (no param)

7. Invalid property ID in URL: fall back to aggregate view

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] `/dashboard` shows aggregate view with "All" selected
3. [ ] `/dashboard?property={id}` shows drill-down for that property
4. [ ] PropertySelectorBar visible in both views
5. [ ] URL updates when clicking property icons
6. [ ] Browser back button returns to previous selection
7. [ ] Page refresh preserves selection
8. [ ] Invalid property ID falls back to aggregate view
9. [ ] Existing aggregate content unchanged

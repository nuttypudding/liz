---
id: 045
title: Build PropertySelectorBar component — house icons, horizontal scroll, mobile dropdown
tier: Opus
depends_on: []
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 045 — PropertySelectorBar Component

## Objective

Build the property selector bar with house icons for desktop (horizontal scroll) and a Select dropdown for mobile.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Property Selector Bar" screen design and component hierarchy sections.

## Implementation

Create `apps/web/components/dashboard/property-selector-bar.tsx`:

1. **Props**: `properties: Property[]`, `selectedPropertyId: string | null`, `onSelect: (id: string | null) => void`

2. **Desktop (lg+)**: `ScrollArea` (horizontal) with house icon buttons
   - "All Properties" button (grid icon) is first, always present
   - Each property: clickable house icon + truncated name
   - Selected item: highlighted ring/background
   - ~80px wide per icon

3. **Mobile (< lg)**: shadcn `Select` dropdown
   - "All Properties" default option
   - Each property listed by name + address snippet

4. Use `useMediaQuery` hook or CSS-based show/hide approach

5. shadcn components: `ScrollArea`, `Button`, `Select`, `Tooltip` (for full name on hover)

6. Loading state: row of skeleton circles

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] "All Properties" option is always first
3. [ ] Each property has a house icon + name
4. [ ] Selected property has highlighted visual state
5. [ ] Horizontal scroll works when properties exceed viewport
6. [ ] Mobile renders as Select dropdown (< lg breakpoint)
7. [ ] Loading skeleton renders during property fetch
8. [ ] `onSelect` fires with property id or null

---
id: 054
title: Dashboard responsive polish — mobile dropdown, card work orders, tab scrolling
tier: Opus
depends_on: [53]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 054 — Dashboard Responsive Polish

## Objective

Final responsive polish pass on the dashboard: mobile property selector, card-based work orders, tab scrolling, and ensuring no overflow issues.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/property-centric-dashboard.md` — "Responsive Strategy" table.

## Implementation

1. **Property selector**: Verify Select dropdown renders on mobile (< lg)
2. **Stat cards**: 2 columns on mobile, 4 on desktop
3. **Work order table**: Switches to stacked cards on mobile
4. **Tabs**: Scrollable on mobile (no overflow hidden)
5. **Tenant cards**: Stack vertically on all sizes
6. **No horizontal overflow** on any screen size

Test at: 375px (mobile), 768px (tablet), 1280px (desktop)

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Mobile (375px): Select dropdown, stacked cards, scrollable tabs
3. [ ] Tablet (768px): Horizontal scroll icons, 2-col stats, Table with scroll
4. [ ] Desktop (1280px): Full icon row, 4-col stats, full Table
5. [ ] No horizontal overflow at any breakpoint
6. [ ] All interactive elements have adequate touch targets on mobile

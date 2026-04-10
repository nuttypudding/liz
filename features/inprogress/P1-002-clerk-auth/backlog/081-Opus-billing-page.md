---
id: 081
title: Build /billing page (CurrentPlanCard + AvailablePlansCard)
tier: Opus
depends_on: [80]
feature: P1-002-clerk-auth
---

# 081 — Build /billing Page

## Objective

Create the landlord billing page showing current plan info, usage bars, and available plan tiers. MVP shows "Free (Beta)" with real usage counts and "Coming soon" badges on paid plans.

## Context

See feature plan: `features/inprogress/P1-002-clerk-auth/README.md` — "Billing Page" UI section.

Uses the `(landlord)` layout with sidebar navigation. Page at `apps/web/app/(landlord)/billing/page.tsx`.

## Implementation

### 1. Create `apps/web/app/(landlord)/billing/page.tsx`

Server component that fetches billing data from `GET /api/billing`.

### 2. Create `apps/web/components/billing/current-plan-card.tsx`

- Badge showing plan name (e.g., "FREE BETA")
- Plan description text
- Usage progress bars:
  - Properties: X / Y used (shadcn `Progress` component)
  - Requests this month: X / Y used
- "Manage Subscription" button (opens Clerk billing portal or shows placeholder toast for MVP)

### 3. Create `apps/web/components/billing/available-plans-card.tsx`

- List of plan tiers (Starter $19/mo, Pro $49/mo)
- Each tier shows: name, price, limits
- "Coming soon" badge (disabled state)
- Separator between tiers

### 4. Layout

```
BillingPage
├── PageHeader ("Billing")
├── CurrentPlanCard
│   ├── Badge: "FREE BETA"
│   ├── Usage: Properties X/3
│   ├── Usage: Requests X/20
│   └── Button: "Manage Subscription"
└── AvailablePlansCard
    ├── Starter — $19/mo (Coming soon)
    └── Pro — $49/mo (Coming soon)
```

### shadcn Components

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Plan cards |
| `badge` | Installed | Plan name, "Coming soon" |
| `button` | Installed | Manage subscription |
| `progress` | Installed | Usage bars |
| `separator` | Installed | Between plan tiers |

### Responsive

- Mobile: Full-width cards, stacked
- Desktop: Max-width constrained content area

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Page renders at `/billing` within `(landlord)` layout
3. [ ] Current plan card shows "Free (Beta)" plan info
4. [ ] Usage bars show real property count and request count
5. [ ] Progress bars change color when near limit
6. [ ] "Manage Subscription" button present (placeholder for MVP)
7. [ ] Available plans card shows Starter and Pro tiers
8. [ ] Paid plans show "Coming soon" badges
9. [ ] Responsive: readable on mobile (375px) and desktop
10. [ ] Loading skeleton while data fetches

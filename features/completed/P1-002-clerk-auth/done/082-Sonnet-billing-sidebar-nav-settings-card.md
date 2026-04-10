---
id: 082
title: Add Billing to sidebar nav + plan summary card on settings page
tier: Sonnet
depends_on: [81]
feature: P1-002-clerk-auth
---

# 082 — Billing Navigation + Settings Plan Card

## Objective

Add "Billing" to the landlord sidebar navigation and add a "Plan & Billing" summary card to the existing settings page.

## Context

Current sidebar nav items in `apps/web/components/layout/app-sidebar.tsx`:
```
Dashboard, Requests, Properties, Vendors, Settings
```

The feature plan places Billing below Settings in the nav.

Settings page at `apps/web/app/(landlord)/settings/page.tsx` needs a new "Plan & Billing" card.

## Implementation

### 1. Update `apps/web/components/layout/app-sidebar.tsx`

Add Billing to `navItems` array:

```typescript
import { CreditCard } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requests", label: "Requests", icon: Wrench },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];
```

### 2. Update bottom nav (if exists)

Check `apps/web/components/layout/landlord-bottom-nav.tsx` and add Billing item there too, or ensure it's accessible via Settings.

### 3. Add plan card to settings page

In `apps/web/app/(landlord)/settings/page.tsx`, add a card:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Plan & Billing</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">Current plan: Free (Beta)</p>
    <Link href="/billing" className="text-sm text-primary hover:underline">
      Manage billing →
    </Link>
  </CardContent>
</Card>
```

Place after the "Re-run onboarding" card.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] "Billing" nav item appears in sidebar with CreditCard icon
3. [ ] Billing nav item highlights when on `/billing` page
4. [ ] Settings page shows "Plan & Billing" card
5. [ ] Card links to `/billing` page
6. [ ] Bottom nav updated if it exists
7. [ ] No layout shift on existing pages

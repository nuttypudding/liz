---
id: 153
title: Tenant nav integration — add "Pay Rent" link + update tenant layout
tier: Sonnet
depends_on: [147]
feature: P2-004-payment-integration
---

# 153 — Tenant nav integration — add "Pay Rent" link + update tenant layout

## Objective
Update the tenant navigation to include a "Pay Rent" link pointing to /pay with a CreditCard icon. Ensure proper placement in the nav hierarchy.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Tenants need quick access to the payment portal from the main navigation. The /pay page is where they manage rent payments and view payment history.

## Implementation

**Update File**: `apps/web/components/layouts/tenant-sidebar.tsx` (or wherever tenant nav is defined)

```typescript
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  AlertCircle,
  CreditCard,
  Settings,
  HelpCircle,
} from 'lucide-react';

export function TenantSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/tenant',
      icon: Home,
      active: pathname === '/tenant',
    },
    {
      label: 'Maintenance',
      href: '/tenant/maintenance',
      icon: AlertCircle,
      active: pathname.startsWith('/tenant/maintenance'),
    },
    // NEW: Pay Rent navigation item
    {
      label: 'Pay Rent',
      href: '/pay',
      icon: CreditCard,
      active: pathname.startsWith('/pay'),
    },
    {
      label: 'Help',
      href: '/tenant/help',
      icon: HelpCircle,
      active: pathname.startsWith('/tenant/help'),
    },
    {
      label: 'Settings',
      href: '/tenant/settings',
      icon: Settings,
      active: pathname.startsWith('/tenant/settings'),
    },
  ];

  return (
    <nav className="space-y-2 px-4 py-6">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              item.active
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

**Update File**: `apps/web/app/(tenant)/layout.tsx` (if using Clerk layouts)

Ensure the tenant layout includes the sidebar:

```typescript
import { TenantSidebar } from '@/components/layouts/tenant-sidebar';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200">
        <TenantSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
```

**Optional: Mobile Navigation (Drawer/Bottom Tab)**

For mobile, consider adding the nav to a bottom tab bar or hamburger menu:

```typescript
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  AlertCircle,
  CreditCard,
  Settings,
  HelpCircle,
} from 'lucide-react';

export function TenantMobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      href: '/tenant',
      icon: Home,
      active: pathname === '/tenant',
    },
    {
      label: 'Maintenance',
      href: '/tenant/maintenance',
      icon: AlertCircle,
      active: pathname.startsWith('/tenant/maintenance'),
    },
    {
      label: 'Pay Rent',
      href: '/pay',
      icon: CreditCard,
      active: pathname.startsWith('/pay'),
    },
    {
      label: 'Help',
      href: '/tenant/help',
      icon: HelpCircle,
      active: pathname.startsWith('/tenant/help'),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium ${
                item.active
                  ? 'text-blue-700 border-t-2 border-blue-700'
                  : 'text-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## Acceptance Criteria
1. [ ] Tenant sidebar navigation updated (or created if missing)
2. [ ] "Pay Rent" link added to navigation
3. [ ] "Pay Rent" link uses CreditCard icon
4. [ ] "Pay Rent" link points to /pay route
5. [ ] "Pay Rent" nav item highlights when pathname starts with /pay
6. [ ] Navigation placement makes sense:
   - [ ] After Dashboard and Maintenance (primary flows)
   - [ ] Before Help and Settings (secondary flows)
7. [ ] Active state styling matches other nav items
8. [ ] Responsive on mobile (sidebar or bottom tab)
9. [ ] Consistent with landlord sidebar styling (uses same design patterns)
10. [ ] No TypeScript errors
11. [ ] Uses project icon library (lucide-react)
12. [ ] Navigation links are accessible (proper contrast, hit targets)
13. [ ] Works with Next.js App Router (uses usePathname, Link)

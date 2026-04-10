---
id: 152
title: Stripe Connect banner + landlord nav integration
tier: Sonnet
depends_on: [140]
feature: P2-004-payment-integration
---

# 152 — Stripe Connect banner + landlord nav integration

## Objective
Create two UI components:
1. **StripeConnectBanner** — Alert component displayed when landlord's Stripe account is not connected
   - Text explaining why Stripe connection is needed
   - "Connect Stripe Account" button linking to /api/payments/connect/onboard
2. **Landlord Sidebar Nav Update** — Add "Payments" link to landlord navigation with DollarSign icon

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Landlords need:
- Clear visibility that Stripe must be connected to enable rent collection
- Easy access to the payments feature from the sidebar

## Implementation

**File**: `apps/web/components/payments/stripe-connect-banner.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ExternalLink } from 'lucide-react';

export function StripeConnectBanner() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConnectClick = async () => {
    try {
      setLoading(true);

      // Call onboard API to get Stripe Account Link
      const res = await fetch('/api/payments/connect/onboard');
      if (!res.ok) throw new Error('Failed to generate account link');

      const { url } = await res.json();

      // Redirect to Stripe onboarding
      window.location.href = url;
    } catch (error) {
      console.error('Error generating account link:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect Stripe account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-amber-50 border-2 border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Stripe Account Required</h3>
            <p className="text-sm text-amber-800 mt-1">
              To collect rent payments from tenants, you need to connect your Stripe account.
              This allows payments to be deposited directly into your bank account.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Button
          onClick={handleConnectClick}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          {loading ? 'Connecting...' : (
            <>
              Connect Stripe Account
              <ExternalLink className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-xs text-gray-600 mt-3">
          Stripe is a secure payment processor trusted by millions of businesses.
          Your banking information is never shared with Liz.
        </p>
      </CardContent>
    </Card>
  );
}
```

**Update File**: `apps/web/components/layouts/landlord-sidebar.tsx` (or wherever landlord nav is defined)

Add the following to the navigation items:

```typescript
import { DollarSign, Home, Settings, Users, AlertCircle } from 'lucide-react';
import Link from 'next/link';

// Existing imports...

export function LandlordSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      active: pathname === '/dashboard',
    },
    {
      label: 'Properties',
      href: '/dashboard/properties',
      icon: Home,
      active: pathname.startsWith('/dashboard/properties'),
    },
    {
      label: 'Maintenance',
      href: '/dashboard/requests',
      icon: AlertCircle,
      active: pathname.startsWith('/dashboard/requests'),
    },
    {
      label: 'Vendors',
      href: '/dashboard/vendors',
      icon: Users,
      active: pathname.startsWith('/dashboard/vendors'),
    },
    // NEW: Payments navigation item
    {
      label: 'Payments',
      href: '/dashboard/payments',
      icon: DollarSign,
      active: pathname.startsWith('/dashboard/payments'),
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      active: pathname.startsWith('/dashboard/settings'),
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

## Acceptance Criteria
1. [ ] StripeConnectBanner component created at `apps/web/components/payments/stripe-connect-banner.tsx`
2. [ ] Banner displays amber/warning styling
3. [ ] Banner includes AlertCircle icon
4. [ ] Banner explains why Stripe connection is needed
5. [ ] "Connect Stripe Account" button calls /api/payments/connect/onboard
6. [ ] Button redirects to Stripe onboarding URL
7. [ ] Button shows loading state while connecting
8. [ ] Banner shows security message (banking info not shared)
9. [ ] Banner is responsive
10. [ ] Landlord sidebar/nav updated to include "Payments" link
11. [ ] "Payments" link uses DollarSign icon
12. [ ] "Payments" link points to /dashboard/payments
13. [ ] "Payments" nav item highlights when active (pathname match)
14. [ ] Navigation placement makes sense (after Vendors, before Settings)
15. [ ] No TypeScript errors
16. [ ] Uses project UI components (Card, Button)
17. [ ] StripeConnectBanner imported and used in task 148 (dashboard)

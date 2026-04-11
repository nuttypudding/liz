---
id: 201
title: Sidebar navigation update — add Applications link with badge
tier: Sonnet
depends_on: [195]
feature: P3-002-ai-tenant-screening
---

# 201 — Sidebar navigation update — add Applications link with badge

## Objective
Add "Applications" navigation link to landlord sidebar with pending application count badge. Uses ClipboardList or similar icon.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Update existing sidebar component (typically `apps/web/components/SidebarNav.tsx` or equivalent).

## Implementation

### 1. Update sidebar navigation

Find and update the landlord sidebar component:

```typescript
// apps/web/components/SidebarNav.tsx (or similar)

import { ClipboardList } from 'lucide-react'; // or similar icon library
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

export function LandlordSidebarNav() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/applications?status=submitted&limit=1');
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch pending count:', error);
    }
  };

  return (
    <nav className="space-y-2">
      {/* Existing navigation items */}

      {/* Applications Link */}
      <Link
        href="/applications"
        className="flex items-center justify-between px-4 py-2 rounded-md hover:bg-slate-100 transition"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-slate-600" />
          <span className="text-slate-900">Applications</span>
        </div>
        {pendingCount > 0 && (
          <Badge variant="default" className="bg-blue-600">
            {pendingCount}
          </Badge>
        )}
      </Link>

      {/* More items */}
    </nav>
  );
}
```

### 2. Alternative: Server-side component with Suspense

If sidebar is server-rendered:

```typescript
// apps/web/components/SidebarNav.tsx

import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';

export function LandlordSidebarNav() {
  return (
    <nav className="space-y-2">
      {/* Existing items */}

      {/* Applications with pending count */}
      <Link
        href="/applications"
        className="flex items-center justify-between px-4 py-2 rounded-md hover:bg-slate-100 transition"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-slate-600" />
          <span className="text-slate-900">Applications</span>
        </div>
        <Suspense fallback={<Badge variant="secondary">-</Badge>}>
          <PendingBadge />
        </Suspense>
      </Link>
    </nav>
  );
}

async function PendingBadge() {
  const { auth } = require('@clerk/nextjs/server');
  const { userId } = auth();

  if (!userId) return null;

  // Fetch pending count from server
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/applications?status=submitted&limit=1`, {
      headers: {
        // Pass auth context if needed
      },
    });

    if (res.ok) {
      const data = await res.json();
      const count = data.pagination?.total || 0;

      if (count > 0) {
        return (
          <Badge variant="default" className="bg-red-600">
            {count}
          </Badge>
        );
      }
    }
  } catch (error) {
    console.error('Failed to fetch pending count:', error);
  }

  return null;
}
```

## Acceptance Criteria
1. [ ] Applications link added to landlord sidebar
2. [ ] Link points to /applications (task 195)
3. [ ] Uses ClipboardList icon (or equivalent document icon)
4. [ ] Badge shows pending application count
5. [ ] Badge updates on navigation (client-side) or on page load
6. [ ] Badge styled with default colors (blue or red for pending)
7. [ ] Badge hidden if count is 0
8. [ ] Link is active/highlighted when on /applications page
9. [ ] Responsive: works on mobile sidebar
10. [ ] Click navigates to /applications

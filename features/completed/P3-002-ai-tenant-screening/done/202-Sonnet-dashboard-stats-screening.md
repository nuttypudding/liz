---
id: 202
title: Dashboard stats extension — application count, approval rate
tier: Sonnet
depends_on: [184]
feature: P3-002-ai-tenant-screening
---

# 202 — Dashboard stats extension — application count, approval rate

## Objective
Extend landlord dashboard with screening metrics: total applications, pending review count, approval rate (approved / total). Displayed as cards with trends if available.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Update main dashboard page (typically `apps/web/app/(landlord)/dashboard/page.tsx`).

## Implementation

### 1. Create screening stats component

Create `apps/web/components/screening/ScreeningStatsCards.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScreeningStats {
  total_applications: number;
  pending_review: number;
  approved: number;
  denied: number;
  approval_rate: number; // percentage
}

export function ScreeningStatsCards() {
  const [stats, setStats] = useState<ScreeningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/applications?limit=1');
      if (res.ok) {
        const data = await res.json();
        const applications = data.data;
        const total = data.pagination?.total || 0;

        // Calculate stats
        const approved = applications.filter(
          (app: any) => app.status === 'approved'
        ).length;
        const denied = applications.filter(
          (app: any) => app.status === 'denied'
        ).length;
        const pending = applications.filter(
          (app: any) =>
            app.status === 'submitted' || app.status === 'screening'
        ).length;

        const approvalRate =
          total > 0 ? Math.round((approved / total) * 100) : 0;

        setStats({
          total_applications: total,
          pending_review: pending,
          approved,
          denied,
          approval_rate: approvalRate,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-100 rounded-lg h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Applications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Total Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900">
            {stats.total_applications}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            All time applications
          </p>
        </CardContent>
      </Card>

      {/* Pending Review */}
      <Card className="border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-yellow-700">
            Pending Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">
            {stats.pending_review}
          </div>
          <p className="text-xs text-yellow-600 mt-1">
            Awaiting screening
          </p>
        </CardContent>
      </Card>

      {/* Approved */}
      <Card className="border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700">
            Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {stats.approved}
          </div>
          <p className="text-xs text-green-600 mt-1">
            Successful applications
          </p>
        </CardContent>
      </Card>

      {/* Approval Rate */}
      <Card className="border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            Approval Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {stats.approval_rate}%
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {stats.total_applications > 0 ? 'Conversion rate' : 'No data yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. Update dashboard page

Update `apps/web/app/(landlord)/dashboard/page.tsx`:

```typescript
// Add import
import { ScreeningStatsCards } from '@/components/screening/ScreeningStatsCards';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Existing header */}

      {/* Add screening stats section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Application Metrics
        </h2>
        <ScreeningStatsCards />
      </section>

      {/* Existing dashboard content */}
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] ScreeningStatsCards component created
2. [ ] Displays total applications count
3. [ ] Displays pending review count
4. [ ] Displays approved count
5. [ ] Displays denied count
6. [ ] Calculates and displays approval rate (percentage)
7. [ ] Four stat cards with icon and color coding
8. [ ] Card colors match status: yellow (pending), green (approved), blue (rate)
9. [ ] Loading skeleton shown while fetching
10. [ ] Stats fetched from /api/applications
11. [ ] Card layout responsive (1 col mobile, 2 col tablet, 4 col desktop)
12. [ ] Integrated into dashboard page

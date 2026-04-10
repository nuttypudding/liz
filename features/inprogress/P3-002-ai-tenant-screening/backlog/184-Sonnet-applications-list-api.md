---
id: 184
title: Applications list API — GET /api/applications (landlord)
tier: Sonnet
depends_on: [180, 182]
feature: P3-002-ai-tenant-screening
---

# 184 — Applications list API — GET /api/applications (landlord)

## Objective
Create an authenticated API endpoint for landlords to retrieve a paginated, filterable, and sortable list of applications for their properties. Supports filtering by property and status, sorting by date or risk score, and pagination.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Landlord-only endpoint (requires Clerk auth). Returns list of applications with optional filters and sort.

## Implementation

### 1. Create API route

Create `apps/web/app/api/applications/route.ts` (update POST to also export GET):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Application } from '@/lib/screening/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/applications?property_id=<uuid>&status=<status>&sort=<field>&order=<asc|desc>&page=<n>&limit=<n>
 * Landlord-only: list applications for landlord's properties
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate landlord
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get landlord_id from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    const landlord_id = profile.id;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const property_id = searchParams.get('property_id');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    if (page < 1) {
      return NextResponse.json(
        { error: 'page must be >= 1' },
        { status: 400 }
      );
    }

    const validSortFields = ['created_at', 'risk_score', 'updated_at', 'email'];
    const validOrders = ['asc', 'desc'];
    if (!validSortFields.includes(sort) || !validOrders.includes(order)) {
      return NextResponse.json(
        { error: 'Invalid sort or order parameter' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('landlord_id', landlord_id);

    // Filter by property
    if (property_id) {
      query = query.eq('property_id', property_id);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Sort
    const orderBy = sort === 'risk_score'
      ? { nulls: 'last' } // Put null risk_scores at end
      : undefined;
    query = query.order(sort, { ascending: order === 'asc', ...orderBy });

    // Paginate
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: applications, error: queryError, count } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error('List applications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Add response interface

Update `apps/web/lib/screening/types.ts`:

```typescript
export interface ListApplicationsResponse {
  success: boolean;
  data: Application[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

### 3. Create client-side hook (optional, for UI)

Create `apps/web/lib/screening/hooks/useApplications.ts`:

```typescript
import { useState, useCallback } from 'react';
import { Application, ListApplicationsResponse } from '../types';

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });

  const fetchApplications = useCallback(async (options: {
    property_id?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.property_id) params.append('property_id', options.property_id);
      if (options.status) params.append('status', options.status);
      if (options.sort) params.append('sort', options.sort);
      if (options.order) params.append('order', options.order);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());

      const res = await fetch(`/api/applications?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch applications');
      }

      const data: ListApplicationsResponse = await res.json();
      setApplications(data.data);
      setPagination(data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    applications,
    loading,
    error,
    pagination,
    fetchApplications,
  };
}
```

## Acceptance Criteria
1. [ ] GET endpoint at `/api/applications` works
2. [ ] Requires Clerk auth (401 if not authenticated)
3. [ ] Returns only applications for landlord's properties
4. [ ] Filters by property_id if provided
5. [ ] Filters by status if provided
6. [ ] Sorts by created_at, risk_score, updated_at, or email
7. [ ] Sort order: ascending or descending
8. [ ] Pagination: page, limit (max 100), total, total_pages
9. [ ] Returns 400 for invalid sort/order/page
10. [ ] Returns 404 if landlord profile not found
11. [ ] Null risk_scores sorted to end (not screened yet)
12. [ ] Response includes pagination metadata
13. [ ] ListApplicationsResponse type defined and exported
14. [ ] Client-side hook created for UI consumption (task 195)

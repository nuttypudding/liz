---
id: 195
title: Applications dashboard UI — filterable list with status badges
tier: Opus
depends_on: [184, 193]
feature: P3-002-ai-tenant-screening
---

# 195 — Applications dashboard UI — filterable list with status badges

## Objective
Create a landlord dashboard page displaying all applications for their properties. Features: filterable table/card list (by property, status), sortable by risk score or date, with status and risk score badges. Mobile-friendly card layout for small screens, table layout for desktop.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Protected page at `apps/web/app/(landlord)/applications/page.tsx`. Requires Clerk auth.

## Implementation

### 1. Create applications dashboard page

Create `apps/web/app/(landlord)/applications/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useApplications } from '@/lib/screening/hooks/useApplications';
import { Application, ApplicationStatus } from '@/lib/screening/types';

export default function ApplicationsDashboard() {
  const { applications, loading, error, pagination, fetchApplications } =
    useApplications();

  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'risk_score'>('created_at');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchApplications({
      property_id: propertyFilter || undefined,
      status: statusFilter || undefined,
      sort: sortBy,
      order: 'desc',
      page: currentPage,
      limit: 20,
    });
  }, [propertyFilter, statusFilter, sortBy, currentPage, fetchApplications]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case ApplicationStatus.SUBMITTED:
        return 'bg-gray-100 text-gray-800';
      case ApplicationStatus.SCREENING:
        return 'bg-yellow-100 text-yellow-800';
      case ApplicationStatus.SCREENED:
        return 'bg-blue-100 text-blue-800';
      case ApplicationStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case ApplicationStatus.DENIED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (riskScore?: number) => {
    if (!riskScore) return 'bg-gray-100 text-gray-800';
    if (riskScore <= 30) return 'bg-green-100 text-green-800';
    if (riskScore <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskLabel = (riskScore?: number) => {
    if (!riskScore) return 'Not Screened';
    if (riskScore <= 30) return 'Low Risk';
    if (riskScore <= 60) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Applications</h1>
        <p className="text-slate-600 mt-2">
          Manage and review tenant applications for your properties
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Filter by Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value={ApplicationStatus.SUBMITTED}>Submitted</SelectItem>
                <SelectItem value={ApplicationStatus.SCREENING}>Screening</SelectItem>
                <SelectItem value={ApplicationStatus.SCREENED}>Screened</SelectItem>
                <SelectItem value={ApplicationStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={ApplicationStatus.DENIED}>Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sort By
            </label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date (Newest)</SelectItem>
                <SelectItem value="risk_score">Risk Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setPropertyFilter('');
                setStatusFilter('');
                setSortBy('created_at');
                setCurrentPage(1);
              }}
              variant="outline"
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-slate-600 mt-4">Loading applications...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Applications List */}
      {!loading && applications.length > 0 && (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {app.first_name} {app.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{app.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge className={getRiskColor(app.risk_score)}>
                        {getRiskLabel(app.risk_score)}
                        {app.risk_score && ` (${app.risk_score})`}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/applications/${app.id}`}>
                        <Button size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {app.first_name} {app.last_name}
                    </h3>
                    <p className="text-sm text-slate-600">{app.email}</p>
                  </div>
                  <Badge className={getStatusColor(app.status)}>
                    {app.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Badge className={getRiskColor(app.risk_score)}>
                    {getRiskLabel(app.risk_score)}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    Applied {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Link href={`/applications/${app.id}`} className="block">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && applications.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No applications yet</h3>
          <p className="text-slate-600">
            Once tenants apply to your properties, they will appear here.
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(
              (page) => (
                <Button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                >
                  {page}
                </Button>
              )
            )}
          </div>
          <Button
            onClick={() =>
              setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))
            }
            disabled={currentPage === pagination.total_pages}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] Page at `/applications` (protected by Clerk auth)
2. [ ] Lists all applications for landlord's properties
3. [ ] Filter by status dropdown
4. [ ] Sort by date or risk score
5. [ ] Reset filters button
6. [ ] Status badges with color coding (submitted/screening/screened/approved/denied)
7. [ ] Risk score badges with color coding (low/medium/high)
8. [ ] Desktop: table layout with columns (name, email, status, risk, date, action)
9. [ ] Mobile: card layout (responsive)
10. [ ] Links to application detail page (/applications/[id])
11. [ ] Pagination controls (previous/next, page numbers)
12. [ ] Loading state with spinner
13. [ ] Error state with message
14. [ ] Empty state when no applications
15. [ ] useApplications hook used (task 184)
16. [ ] Badge component installed (or available)

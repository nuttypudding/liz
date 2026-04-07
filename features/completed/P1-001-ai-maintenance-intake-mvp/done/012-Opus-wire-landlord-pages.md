---
id: 012
title: Wire landlord pages to real API calls
tier: Opus
depends_on: [3, 4, 5, 7, 9, 10]
feature: ai-maintenance-intake-mvp
---

# 012 — Wire Landlord Pages to Real API Calls

## Objective

Replace mock data in all landlord pages (dashboard, requests, properties, vendors) with real API calls. After this task, the landlord experience is fully functional end-to-end.

## Context

- **Front-end work — requires Opus tier.**
- Landlord pages:
  - `apps/web/app/(landlord)/dashboard/page.tsx` — hardcoded stats and mock data
  - `apps/web/app/(landlord)/requests/page.tsx` — imports `mockRequests`
  - `apps/web/app/(landlord)/requests/[id]/page.tsx` — imports mock data
  - `apps/web/app/(landlord)/properties/page.tsx` — imports `mockProperties`
  - `apps/web/app/(landlord)/vendors/page.tsx` — imports `mockVendors`
- Dependencies: All backend API routes must be wired (tasks 003-010)

## Implementation

### Dashboard Page

Replace hardcoded values with API fetches:

```typescript
// Fetch stats
const statsRes = await fetch("/api/dashboard/stats");
const stats = await statsRes.json();

// Fetch spend chart data
const chartRes = await fetch("/api/dashboard/spend-chart");
const chartData = await chartRes.json();

// Fetch emergency requests for banner
const emergencyRes = await fetch("/api/requests?urgency=emergency&status=submitted,triaged");
const { requests: emergencyRequests } = await emergencyRes.json();
```

Pass real data to `SectionCards`, `SpendChart`, `EmergencyAlertBanner`.

### Requests Page

Replace `mockRequests` with:
```typescript
const [requests, setRequests] = useState([]);
useEffect(() => {
  const params = new URLSearchParams();
  if (propertyFilter !== "all") params.set("property", propertyFilter);
  if (urgencyFilter !== "all") params.set("urgency", urgencyFilter);

  fetch(`/api/requests?${params}`)
    .then(res => res.json())
    .then(({ requests }) => setRequests(requests));
}, [propertyFilter, urgencyFilter]);
```

### Request Detail Page

Replace mock lookup with `fetch("/api/requests/${id}")`. Wire:
- `VendorSelector` to fetch vendors from `/api/vendors`
- `ApproveButton` to POST to `/api/requests/${id}/dispatch`
- `WorkOrderDraft` to POST to `/api/requests/${id}/work-order` for AI-generated draft
- PATCH to `/api/requests/${id}` for landlord_notes updates

### Properties Page

Replace `mockProperties` with:
- GET `/api/properties` for property list
- POST `/api/properties` for new property
- PATCH `/api/properties/${id}` for edit
- DELETE `/api/properties/${id}` for removal
- POST `/api/properties/${id}/tenants` for adding tenants
- PATCH/DELETE `/api/tenants/${id}` for tenant management

### Vendors Page

Replace `mockVendors` with:
- GET `/api/vendors` for vendor list
- POST `/api/vendors` for new vendor
- PATCH `/api/vendors/${id}` for edit
- DELETE `/api/vendors/${id}` for removal

### Common Patterns

For all pages:
- Add `loading` state → show `Skeleton` components while fetching
- Add error handling → show toast on failure
- Refresh data after mutations (create/update/delete)
- Consider `useCallback` for fetch functions to avoid stale closures

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Dashboard shows real stats from /api/dashboard/stats
3. [ ] Spend chart renders real spend vs rent data
4. [ ] Emergency alert banner reflects real emergency count
5. [ ] Requests page fetches and filters real requests
6. [ ] Request detail shows real AI classification, cost estimate, and photos
7. [ ] Vendor selector loads real vendors filtered by specialty
8. [ ] Approve & Send dispatches to real API and updates status
9. [ ] Work order draft is AI-generated via API
10. [ ] Properties page CRUD works with real Supabase data
11. [ ] Vendors page CRUD works with real Supabase data
12. [ ] All pages have loading states (Skeleton)
13. [ ] All mutations show success/error toasts
14. [ ] Data refreshes after create/update/delete operations

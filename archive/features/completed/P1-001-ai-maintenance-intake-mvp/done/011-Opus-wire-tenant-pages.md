---
id: 011
title: Wire tenant pages to real API calls
tier: Opus
depends_on: [5, 6, 8]
feature: ai-maintenance-intake-mvp
---

# 011 — Wire Tenant Pages to Real API Calls

## Objective

Replace mock data and simulated delays in the tenant submit and my-requests pages with real API calls to the backend. After this task, tenants can submit real requests and view their actual request history.

## Context

- **Front-end work — requires Opus tier.**
- Tenant pages:
  - `apps/web/app/(tenant)/submit/page.tsx` — currently uses `delay()` and `MOCK_GATEKEEPER_RESPONSE`
  - `apps/web/app/(tenant)/my-requests/page.tsx` — currently imports `mockRequests` from `lib/mock-data`
  - `apps/web/app/(tenant)/my-requests/[id]/page.tsx` — uses mock data
- Dependencies: API routes must be wired (tasks 005, 006, 008)

## Implementation

### Submit Page (`submit/page.tsx`)

Replace the mock `handleSubmit` function:

```typescript
async function handleSubmit(message: string, photos: File[]) {
  setState("uploading");

  // 1. Upload photos (if any)
  let photoPaths: string[] = [];
  if (photos.length > 0) {
    const formData = new FormData();
    photos.forEach((p) => formData.append("photos", p));
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const { paths } = await uploadRes.json();
    photoPaths = paths;
  }

  setState("submitting");

  // 2. Create intake request
  const intakeRes = await fetch("/api/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_message: message,
      photo_paths: photoPaths,
      property_id: selectedPropertyId, // Need property selector or auto-detect
    }),
  });
  const { id: requestId } = await intakeRes.json();

  // 3. Trigger classification
  const classifyRes = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request_id: requestId }),
  });
  const classification = await classifyRes.json();

  // 4. Show gatekeeper response
  setGatekeeperResult({
    self_resolvable: classification.self_resolvable,
    troubleshooting_guide: classification.troubleshooting_guide,
    request_id: requestId,
  });
  setState("gatekeeper");
}
```

**Note**: The tenant needs a `property_id` to submit. Options:
- Auto-detect from their tenant record (look up which property they belong to)
- Add a property selector if tenant is in multiple properties

### My Requests Page (`my-requests/page.tsx`)

Replace static `mockRequests` import with `fetch("/api/requests")`:

```typescript
const [requests, setRequests] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/requests")
    .then((res) => res.json())
    .then(({ requests }) => {
      setRequests(requests);
      setLoading(false);
    });
}, []);
```

Add loading skeleton and error handling.

### Request Detail Page (`my-requests/[id]/page.tsx`)

Replace mock lookup with `fetch("/api/requests/${id}")`. Add loading state.

### Error Handling

- Show toast (Sonner) for API errors
- Show inline error messages for validation failures
- Handle loading states with Skeleton components (already installed)

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Submit page uploads real photos to Supabase Storage
3. [ ] Submit page creates a real maintenance request via /api/intake
4. [ ] Submit page triggers real AI classification via /api/classify
5. [ ] Gatekeeper response shows real AI-generated troubleshooting guide
6. [ ] "This fixed it" updates request status in DB
7. [ ] "I still need help" escalates and request appears in landlord view
8. [ ] My Requests page fetches real requests from /api/requests
9. [ ] Request detail page shows real data from /api/requests/[id]
10. [ ] Loading states shown during API calls (Skeleton or spinner)
11. [ ] Error states handled gracefully with toast notifications

---
id: 085
title: Write tests for /api/auth/set-role and withAuth() helper
tier: Haiku
depends_on: [75, 77]
feature: P1-002-clerk-auth
---

# 085 — Tests for set-role API + withAuth()

## Objective

Write unit tests for the `POST /api/auth/set-role` API route and the `withAuth()` helper function.

## Context

Existing test files at `apps/web/tests/`:
- `tests/api/clerk-webhook.test.ts` — pattern for API route tests
- `tests/lib/clerk.test.ts` — pattern for lib helper tests

Follow the same mocking patterns (mock `@clerk/nextjs/server`, mock Supabase client).

## Implementation

### 1. Create `apps/web/tests/lib/withauth.test.ts`

Test `withAuth()`:
- Returns 401 when `auth()` returns no userId
- Returns 403 when `getRole()` returns null
- Returns 403 when role doesn't match `requiredRole`
- Calls handler with userId and role on success
- Works without `requiredRole` option (any role accepted)

### 2. Create `apps/web/tests/api/set-role.test.ts`

Test `POST /api/auth/set-role`:
- Returns 401 for unauthenticated request
- Returns 400 for invalid role (e.g., `{ role: "admin" }`)
- Returns 400 for missing role field
- Returns 409 if user already has a role
- Sets publicMetadata.role via Clerk Backend API for landlord
- Creates landlord_profiles row for landlord role
- Links tenant by email for tenant role
- Returns correct redirect URL for each role

### 3. Test Zod schema

Test `setRoleSchema`:
- Accepts `"landlord"` and `"tenant"`
- Rejects other strings
- Rejects missing role field

### Mock patterns

Follow existing patterns from `tests/api/clerk-webhook.test.ts`:
```typescript
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `withAuth()` test file created with 5+ test cases
3. [ ] `set-role` API test file created with 8+ test cases
4. [ ] `setRoleSchema` validation tested
5. [ ] All tests pass with `npm run test`
6. [ ] Mocking patterns consistent with existing tests
7. [ ] No real Clerk or Supabase calls in tests

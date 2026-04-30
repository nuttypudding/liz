---
id: 075
title: Add withAuth() helper to lib/clerk.ts + Zod setRoleSchema
tier: Haiku
depends_on: []
feature: P1-002-clerk-auth
---

# 075 — Add withAuth() Helper + Zod setRoleSchema

## Objective

Create a reusable `withAuth()` wrapper function that eliminates the repeated auth boilerplate across all API routes, and add a Zod schema for the set-role request payload.

## Context

Every API route currently repeats ~10 lines of auth boilerplate: `auth()` → null-check → `getRole()` → role-check. The feature plan at `features/inprogress/P1-002-clerk-auth/README.md` specifies a `withAuth()` helper that wraps this pattern.

Existing helpers are in `apps/web/lib/clerk.ts` — add `withAuth()` there. Zod schemas go in `apps/web/lib/validations.ts` (or create it if it doesn't exist).

## Implementation

### 1. Add `withAuth()` to `apps/web/lib/clerk.ts`

```typescript
import { NextResponse } from "next/server";

export function withAuth(
  handler: (userId: string, role: Role) => Promise<NextResponse>,
  options?: { requiredRole?: Role }
): (req?: Request) => Promise<NextResponse> {
  return async (req?: Request) => {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (!role) {
      return NextResponse.json({ error: "No role assigned" }, { status: 403 });
    }

    if (options?.requiredRole && role !== options.requiredRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(userId, role);
  };
}
```

### 2. Add Zod schema

In `apps/web/lib/validations.ts` (create if needed):

```typescript
import { z } from "zod";

export const setRoleSchema = z.object({
  role: z.enum(["landlord", "tenant"]),
});
```

### 3. Export both from their respective modules

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `withAuth()` exported from `lib/clerk.ts`
3. [ ] `withAuth()` returns 401 for missing session
4. [ ] `withAuth()` returns 403 for missing role (when `requiredRole` is set)
5. [ ] `withAuth()` returns 403 for wrong role
6. [ ] `withAuth()` passes `userId` and `role` to handler on success
7. [ ] `setRoleSchema` validates `{ role: "landlord" }` and `{ role: "tenant" }`
8. [ ] `setRoleSchema` rejects invalid role values
9. [ ] Existing `getRole()` and `requireRole()` unchanged

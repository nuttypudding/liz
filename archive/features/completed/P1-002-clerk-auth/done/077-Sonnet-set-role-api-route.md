---
id: 077
title: Create POST /api/auth/set-role API route
tier: Sonnet
depends_on: [75]
feature: P1-002-clerk-auth
---

# 077 — Create POST /api/auth/set-role API Route

## Objective

Create the API route that sets a user's role in Clerk `publicMetadata` after sign-up. This is the backend for the role selection flow.

## Context

After sign-up, users land on `/role-select` and pick "Landlord" or "Tenant". This API route receives that choice, updates Clerk's `publicMetadata.role`, and creates any initial database records.

See feature plan: `features/inprogress/P1-002-clerk-auth/README.md` — "Tech Approach" section 1.

Current clerk helpers: `apps/web/lib/clerk.ts` — uses `clerkClient()` from `@clerk/nextjs/server`.

## Implementation

### 1. Create `apps/web/app/api/auth/set-role/route.ts`

```typescript
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { setRoleSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = setRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { role } = parsed.data;
  const client = await clerkClient();

  // Check if user already has a role (prevent re-assignment)
  const user = await client.users.getUser(userId);
  const existingRole = (user.publicMetadata as { role?: string })?.role;
  if (existingRole) {
    return NextResponse.json({ error: "Role already assigned" }, { status: 409 });
  }

  // Set role in Clerk
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });

  // Create initial database records
  const supabase = createServerSupabaseClient();
  if (role === "landlord") {
    await supabase.from("landlord_profiles").upsert(
      { user_id: userId },
      { onConflict: "user_id" }
    );
  } else if (role === "tenant") {
    // Try to match tenant by email
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (email) {
      await supabase
        .from("tenants")
        .update({ clerk_user_id: userId })
        .eq("email", email)
        .is("clerk_user_id", null);
    }
  }

  const redirect = role === "landlord" ? "/onboarding" : "/submit";
  return NextResponse.json({ success: true, redirect });
}
```

### 2. Do NOT use `withAuth()` for this route

This route is special — it's called by authenticated users who do not yet have a role. `withAuth()` with `requiredRole` would block them.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] `POST /api/auth/set-role` accepts `{ role: "landlord" | "tenant" }`
3. [ ] Returns 401 for unauthenticated requests
4. [ ] Returns 400 for invalid role values
5. [ ] Returns 409 if user already has a role
6. [ ] Sets `publicMetadata.role` via Clerk Backend API
7. [ ] Creates `landlord_profiles` row for landlords
8. [ ] Links tenant by email match for tenants
9. [ ] Returns `{ success: true, redirect: "/onboarding" | "/submit" }`
10. [ ] Zod validation using `setRoleSchema` from task 075

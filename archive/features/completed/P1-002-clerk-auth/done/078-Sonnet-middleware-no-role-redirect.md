---
id: 078
title: Update middleware.ts — add no-role redirect to /role-select
tier: Sonnet
depends_on: []
feature: P1-002-clerk-auth
---

# 078 — Update Middleware for No-Role Redirect

## Objective

Enhance `middleware.ts` to detect authenticated users with no role and redirect them to `/role-select`. Add `/role-select` as a pre-role route (requires auth but not a role).

## Context

Current middleware at `apps/web/middleware.ts`:
- Handles public routes (sign-in, sign-up, webhooks)
- Does role-based redirects (tenant pages → tenant, landlord pages → landlord)
- Does NOT handle the "no role" case — users without a role get bootstrapped to "landlord" silently

The feature plan specifies this updated flow:
1. Public route? → pass through
2. `/role-select`? → require auth but not role
3. Not authenticated? → `auth.protect()` → /sign-in
4. No role? → redirect to `/role-select`
5. Has role, on `/role-select`? → redirect to role's home
6. Role mismatch? → redirect to `/unauthorized`
7. Pass through

## Implementation

### 1. Update `apps/web/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
  "/unauthorized",
]);

// Routes that require auth but not a role
const isPreRoleRoute = createRouteMatcher([
  "/role-select",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth.protect();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
    ?? (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  const { pathname } = req.nextUrl;

  // Pre-role routes: allow authenticated users without a role
  if (isPreRoleRoute(req)) {
    // If user already has a role, redirect them away from role-select
    if (role) {
      const dest = role === "tenant" ? "/submit" : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return; // Allow access to /role-select without a role
  }

  // No role? Redirect to role selection
  if (!role) {
    return NextResponse.redirect(new URL("/role-select", req.url));
  }

  // Root redirect based on role
  if (pathname === "/") {
    const dest = role === "tenant" ? "/submit" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Tenant trying to access landlord pages
  if (role === "tenant" && (pathname.startsWith("/dashboard") || pathname.startsWith("/properties") || pathname.startsWith("/vendors") || pathname.startsWith("/requests") || pathname.startsWith("/billing") || pathname.startsWith("/settings") || pathname.startsWith("/onboarding"))) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Landlord trying to access tenant-only pages
  if (role === "landlord" && (pathname === "/submit" || pathname.startsWith("/my-requests"))) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### 2. Key changes from current middleware

- Added `isPreRoleRoute` matcher for `/role-select`
- Added no-role → `/role-select` redirect
- Added role-mismatch → `/unauthorized` redirect (was previously redirecting to home)
- Added `/unauthorized` to public routes (no auth needed to view error page)
- Check both `sessionClaims.metadata` and `sessionClaims.publicMetadata` for role

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Authenticated user with no role → redirected to `/role-select`
3. [ ] Authenticated user with role accessing `/role-select` → redirected to role home
4. [ ] `/role-select` accessible to authenticated users without a role
5. [ ] Tenant accessing landlord pages → `/unauthorized`
6. [ ] Landlord accessing tenant pages → `/unauthorized`
7. [ ] `/unauthorized` is accessible without auth (public route)
8. [ ] All existing public routes still work (sign-in, sign-up, webhooks)
9. [ ] Root redirect (`/`) still works based on role

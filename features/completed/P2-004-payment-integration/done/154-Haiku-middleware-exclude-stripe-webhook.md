---
id: 154
title: Middleware update — exclude /api/webhooks/stripe from Clerk auth
tier: Haiku
depends_on: [142]
feature: P2-004-payment-integration
---

# 154 — Middleware update — exclude /api/webhooks/stripe from Clerk auth

## Objective
Update Next.js middleware to exclude `/api/webhooks/stripe` from Clerk authentication. Stripe webhooks are sent unsigned requests, so they must bypass the auth check.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Stripe webhook handler (task 142) verifies signatures itself; it does not use Clerk auth. If middleware blocks unauthenticated requests, Stripe's webhook calls will fail with 401.

## Implementation

**Update File**: `apps/web/middleware.ts`

Add `/api/webhooks/stripe` to the list of public routes:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/intake(.*)', // Maintenance intake form (public)
  '/api/webhooks/stripe', // Stripe webhooks (verified by signature, not Clerk auth)
  '/api/auth/callback(.*)', // Auth callbacks
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|pdf)($|\\?)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

Alternative (if using custom middleware logic):

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function middleware(request: NextRequest) {
  // Allow Stripe webhooks through without auth
  if (request.nextUrl.pathname === '/api/webhooks/stripe') {
    return NextResponse.next();
  }

  // Require auth for all other routes
  const { userId } = await auth();
  if (!userId) {
    // Redirect to login or return 401
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
```

## Acceptance Criteria
1. [ ] Middleware updated (apps/web/middleware.ts)
2. [ ] /api/webhooks/stripe excluded from Clerk auth check
3. [ ] Other API routes still require Clerk authentication
4. [ ] Public routes (sign-in, sign-up, intake, auth callbacks) remain public
5. [ ] No other routes accidentally made public
6. [ ] Middleware pattern matches Stripe webhook path correctly
7. [ ] No TypeScript errors
8. [ ] Tested manually (or as part of task 157 integration test):
   - [ ] Unauthenticated POST to /api/webhooks/stripe succeeds (signature verification handles auth)
   - [ ] Unauthenticated POST to other /api/* endpoints returns 401

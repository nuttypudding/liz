---
id: 083
title: Build /unauthorized error page
tier: Opus
depends_on: [78]
feature: P1-002-clerk-auth
---

# 083 — Build /unauthorized Error Page

## Objective

Create a standalone error page shown when a user tries to access a page they don't have permission to view (role mismatch). Clean, centered design with action buttons.

## Context

See feature plan: `features/inprogress/P1-002-clerk-auth/README.md` — "Unauthorized Page" UI section.

Middleware (task 078) redirects role mismatches to `/unauthorized`. This page is a public route (no auth required to view it).

## Implementation

### 1. Create `apps/web/app/unauthorized/page.tsx`

Standalone page, no sidebar or nav. Centered content. Uses the same visual pattern as the `(auth)` layout but is NOT inside the auth route group (it's at the root level since it needs to be public).

```tsx
"use client";

import { ShieldAlert } from "lucide-react";
import { useClerk, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function UnauthorizedPage() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <ShieldAlert className="mx-auto size-12 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={() => router.push("/")}>
              Go Home
            </Button>
            {isSignedIn && (
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### shadcn Components

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Container |
| `button` | Installed | Action buttons |

### Responsive

- Centered card, max-w-md, works on all screen sizes
- Touch targets at least 44x44px

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Page renders at `/unauthorized` without requiring auth
3. [ ] Shows ShieldAlert icon, "Access Denied" heading, description
4. [ ] "Go Home" button redirects based on role (or to `/`)
5. [ ] "Sign Out" button visible when signed in, clears session
6. [ ] Centered layout, no sidebar or nav
7. [ ] Responsive: readable on mobile and desktop
8. [ ] Not inside `(auth)` or `(landlord)` or `(tenant)` route groups

---
id: 084
title: Update Clerk SignUp with afterSignUpUrl="/role-select"
tier: Haiku
depends_on: [78]
feature: P1-002-clerk-auth
---

# 084 — Update SignUp afterSignUpUrl Config

## Objective

Configure Clerk's `<SignUp />` component to redirect new users to `/role-select` after sign-up instead of the default redirect.

## Context

Current sign-up page: `apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — uses Clerk's `<SignUp />` component. After sign-up, users currently redirect to `/` where middleware handles routing. With task 078's middleware update, users without a role will be redirected to `/role-select` anyway, but setting `afterSignUpUrl` makes the flow more direct.

## Implementation

### 1. Update `apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

```tsx
<SignUp afterSignUpUrl="/role-select" />
```

### 2. Alternative: Environment variable

Clerk also supports setting this via env var:
```bash
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/role-select
```

Use whichever approach the existing sign-up component uses. Check if there's already an env var pattern in `.env.local`.

### 3. Also update sign-in redirect

For returning users who somehow lost their role, sign-in should also handle the no-role case. The middleware (task 078) already handles this redirect, so no additional sign-in config is needed.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] After sign-up, user is redirected to `/role-select`
3. [ ] Sign-up flow completes without errors
4. [ ] Existing sign-in flow unaffected
5. [ ] OAuth sign-up (if configured) also redirects to `/role-select`

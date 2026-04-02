---
id: 002
title: Configure Clerk dev keys and role metadata
tier: Haiku
depends_on: []
feature: ai-maintenance-intake-mvp
---

# 002 — Configure Clerk Dev Keys and Role Metadata

## Objective

Set up Clerk for local development with proper role-based access control. Create `.env.local` with real Clerk dev keys and document the Clerk dashboard configuration needed for landlord/tenant roles.

## Context

- Feature plan: `features/planned/P1-001-ai-maintenance-intake-mvp/README.md` (Auth Architecture section)
- `.env.example` exists at `apps/web/.env.example` with placeholder keys
- Middleware at `apps/web/middleware.ts` already reads role from `sessionClaims.metadata.role`
- Clerk helpers at `apps/web/lib/clerk.ts`: `getRole()` reads `sessionClaims?.metadata?.role`, `requireRole()` throws if mismatch
- Clerk components already used: `<SignIn />`, `<SignUp />`, `<UserButton />`, `<ClerkProvider>`

## Implementation

### Step 1: Create Clerk application

1. Go to https://dashboard.clerk.com
2. Create a new application named "Liz Dev"
3. Enable Email/Password sign-in (minimum for MVP)
4. Copy the publishable key and secret key

### Step 2: Create `.env.local`

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in the real values:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard
- `CLERK_SECRET_KEY` — from Clerk dashboard
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- Supabase keys from `npx supabase status` (after task 001)
- `ANTHROPIC_API_KEY` — from Anthropic console

### Step 3: Configure role metadata in Clerk

In Clerk Dashboard → Users → User metadata:
- The role is stored as `publicMetadata.role` with values `"landlord"` or `"tenant"`
- For dev, manually set role on test users via Clerk Dashboard → Users → [user] → Public metadata: `{"role": "landlord"}` or `{"role": "tenant"}`

### Step 4: Verify middleware reads roles correctly

The existing middleware at `apps/web/middleware.ts` reads:
```typescript
const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
```

Verify this matches Clerk's `publicMetadata` path. If Clerk stores it as `sessionClaims.public_metadata.role`, update accordingly.

### Step 5: Create test users

Create at least 2 test users in Clerk:
1. Landlord: `landlord@test.com` with `publicMetadata: {"role": "landlord"}`
2. Tenant: `tenant@test.com` with `publicMetadata: {"role": "tenant"}`

### Step 6: Add `.env.local` to `.gitignore`

Verify `apps/web/.gitignore` includes `.env.local` (Next.js default should have this).

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `apps/web/.env.local` exists with real Clerk keys (not committed to git)
3. [ ] Clerk application created in dashboard with email/password enabled
4. [ ] At least 2 test users exist (1 landlord, 1 tenant) with correct role metadata
5. [ ] `npm run dev` starts without Clerk errors
6. [ ] Sign-in at `/sign-in` works with test credentials
7. [ ] Role-based redirect works: landlord → `/dashboard`, tenant → `/submit`
8. [ ] Cross-role access blocked: tenant visiting `/dashboard` is redirected

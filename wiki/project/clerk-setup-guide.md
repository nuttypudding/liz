---
type: project
tags: [auth, clerk, setup, development]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: CLERK_SETUP_GUIDE.md
---

# Clerk Development Setup Guide

## Overview
Clerk handles authentication for both landlords and tenants. This guide walks through creating a dev Clerk application and configuring role-based access.

## Steps

### 1. Create Clerk Application

1. Go to https://dashboard.clerk.com
2. Sign in or create an account
3. Click "Create Application"
4. Name: **Liz Dev**
5. Choose authentication method: **Email/Password** (minimum for MVP)
6. Create the application

### 2. Copy Keys to .env.local

After creating the app, go to **Settings → API Keys** and copy:
- **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Secret Key** → `CLERK_SECRET_KEY`

Then run:
```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local` and fill in:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... (from Clerk dashboard)
CLERK_SECRET_KEY=sk_test_... (from Clerk dashboard)
```

Keep the other values as-is for local dev:
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 3. Configure Supabase Keys

After Supabase starts locally (Task 001), get keys from:
```bash
npx supabase status
```

Copy the output into `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. Configure Role Metadata in Clerk

In Clerk Dashboard:
1. Go to **Organizations** (or **Users** for simple setup)
2. When users sign up, assign roles via **Public Metadata**:
   - Landlord: `{"role": "landlord"}`
   - Tenant: `{"role": "tenant"}`

**For local testing**, create test users:

#### Test User 1: Landlord
- Email: `landlord@test.com`
- Password: `TestPassword123!`
- Public Metadata: `{"role": "landlord"}`

#### Test User 2: Tenant
- Email: `tenant@test.com`
- Password: `TestPassword123!`
- Public Metadata: `{"role": "tenant"}`

**To set metadata on existing users:**
1. Clerk Dashboard → Users → [select user]
2. Scroll to **Public metadata**
3. Click **Edit**
4. Paste: `{"role": "landlord"}` or `{"role": "tenant"}`
5. Save

### 5. Add Anthropic API Key

Get your Claude API key from https://console.anthropic.com/account/keys

Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 6. Verify Setup

```bash
cd apps/web
npm run dev
```

Open http://localhost:3000:
- Sign in as landlord@test.com → should redirect to /dashboard
- Sign in as tenant@test.com → should redirect to /submit

## Troubleshooting

**"Missing Clerk keys" error:**
- Check `.env.local` has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- Restart `npm run dev`

**Sign-in doesn't work:**
- Verify user exists in Clerk Dashboard → Users
- Check user has email/password auth enabled

**Wrong redirect after sign-in:**
- Check user has correct **Public metadata** role
- Verify middleware.ts is reading from `sessionClaims?.metadata?.role`

**Role not detected:**
- Clerk uses `publicMetadata` which shows up as `sessionClaims.metadata` in Next.js
- Current middleware expects: `{"role": "landlord"}` or `{"role": "tenant"}`

## Next Steps

After completing this task:
1. Task 001 (Supabase) should be complete with running local database
2. Next: Wire API routes to Supabase (Task 003)

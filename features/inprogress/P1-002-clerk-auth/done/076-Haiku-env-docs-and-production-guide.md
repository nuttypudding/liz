---
id: 076
title: Update .env.example with Clerk var descriptions + production setup guide
tier: Haiku
depends_on: []
feature: P1-002-clerk-auth
---

# 076 — Environment Docs + Production Setup Guide

## Objective

Add descriptive comments to `.env.example` for all Clerk variables and create a production Clerk configuration guide.

## Context

Current `.env.example` at `apps/web/.env.example` has placeholder values but no descriptions of what each variable does or how to obtain keys. The feature plan calls for a documented checklist for production Clerk setup.

## Implementation

### 1. Update `apps/web/.env.example`

Add descriptive comments above each Clerk variable:

```bash
# ─── Clerk Auth ───────────────────────────────────────────
# Get these from https://dashboard.clerk.com → API Keys
# Dev keys start with pk_test_ / sk_test_
# Production keys start with pk_live_ / sk_live_
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Clerk UI routes (must match (auth) route group)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Webhook signature verification (Clerk Dashboard → Webhooks → Signing Secret)
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
```

### 2. Add production setup section to `docs/` or feature README

Create `docs/clerk-production-setup.md`:

1. Create production Clerk instance in dashboard
2. Set production API keys in Vercel environment variables
3. Configure allowed redirect URLs (production domain)
4. Set up Clerk webhook endpoint for production URL
5. Configure OAuth providers (Google, Apple) for production
6. Enable rate limiting on sign-up
7. Test sign-up/sign-in flow on production domain

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `.env.example` has descriptive comments for every Clerk variable
3. [ ] Comments explain how to obtain each key
4. [ ] Production setup guide created with step-by-step checklist
5. [ ] No secrets or real keys committed

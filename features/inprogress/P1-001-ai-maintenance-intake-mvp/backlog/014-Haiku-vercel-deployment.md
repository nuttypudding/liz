---
id: 014
title: Configure Vercel deployment
tier: Haiku
depends_on: [11, 12, 13]
feature: ai-maintenance-intake-mvp
---

# 014 — Configure Vercel Deployment

## Objective

Set up Vercel project for the Next.js app, configure environment variables, and deploy the MVP.

## Context

- App is at `apps/web/` (monorepo structure)
- GitHub repo: `nuttypudding/liz`
- Environment variables needed: Clerk keys, Supabase cloud keys, Anthropic API key, Clerk webhook secret
- Need Supabase cloud project (not local Docker) for production

## Implementation

### Step 1: Create Supabase cloud project

1. Go to https://supabase.com/dashboard
2. Create project "liz-mvp"
3. Run migrations against cloud: `npx supabase db push --linked`
4. Note the project URL, anon key, and service role key

### Step 2: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 3: Link Vercel project

```bash
cd apps/web
vercel link
```

Configure:
- Root directory: `apps/web`
- Framework: Next.js
- Build command: `next build`

### Step 4: Set environment variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add CLERK_WEBHOOK_SECRET
```

Use production Clerk keys (create a production Clerk instance) and Supabase cloud keys.

### Step 5: Deploy

```bash
vercel --prod
```

### Step 6: Update Clerk webhook URL

Update Clerk webhook endpoint from ngrok/localhost to the Vercel production URL.

### Step 7: Update Clerk redirect URLs

In Clerk Dashboard, add the Vercel URL to allowed redirect URLs.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] Vercel project linked to `nuttypudding/liz` repo
3. [ ] Root directory set to `apps/web`
4. [ ] All environment variables configured in Vercel
5. [ ] Production deployment succeeds
6. [ ] Sign-in works on production URL
7. [ ] Clerk webhook points to production URL
8. [ ] Supabase cloud project has all tables (migrations applied)

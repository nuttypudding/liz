---
type: concept
tags: [tech-stack, architecture, infrastructure, nextjs, supabase, clerk, vercel]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Tech Stack

Liz is built on five core services, each with a distinct ownership boundary. No separate backend process exists for MVP — Next.js API routes handle all server logic.

## Component Overview

| Layer | Technology | Owns |
|-------|-----------|------|
| Framework | Next.js 16 (App Router) | SSR, routing, API routes |
| Styling | Tailwind CSS | Responsive, mobile-first UI |
| Auth & Billing | Clerk (`@clerk/nextjs`) | Sessions, roles, subscriptions |
| Database & Storage | Supabase (PostgreSQL + Storage) | All persistent data, file storage |
| AI | Claude API (Sonnet + Vision) | Maintenance classification, photo analysis |
| Deployment | Vercel | Serverless hosting, preview deployments |

## Key Boundaries

**Next.js + Vercel**: All server-side logic runs as Vercel serverless functions. API routes handle intake classification, webhook processing, and data reads/writes. There is no FastAPI or Express backend.

**Clerk (not Supabase Auth)**: Authentication goes through Clerk middleware, not Supabase JWT verification. Supabase is a pure data layer — no `auth.users` dependency. See [[decisions/2026-04-01-auth-clerk-not-supabase]].

**Supabase as data layer**: PostgreSQL for structured data, Supabase Storage for uploaded photos, Realtime for live updates. RLS policies use Clerk-provided user IDs, not Supabase Auth tokens.

**Claude API**: Sonnet model for text classification; Vision capability for photo analysis on intake submissions. Confidence scores ≥ 0.7 required before AI output is surfaced to landlord.

**Vercel**: Seamless Next.js deployment. Per-branch preview URLs for testing. Production URL is the canonical landlord-facing interface.

## Why This Stack

The original decision recorded in [[decisions/2026-04-01-tech-stack-nextjs-tailwind-supabase-claude]] chose this stack because it eliminates a separate backend while giving a complete set of primitives (DB, storage, auth, AI, CDN) under minimal configuration overhead for a small-team MVP.

## Related

- [[decisions/2026-04-01-auth-clerk-not-supabase]] — why Clerk was chosen over Supabase Auth
- [[decisions/2026-04-01-tech-stack-nextjs-tailwind-supabase-claude]] — original tech stack decision
- [[project/system-architecture]] — component interaction diagram
- [[project/endpoints]] — API routes and environment URLs

---
type: decision
tags: [tech-stack, architecture, infrastructure]
created: 2026-04-01
updated: 2026-04-01
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Tech Stack: Next.js + Tailwind + Supabase + Claude API

## Decision

Use Next.js (App Router), Tailwind CSS, Supabase, and the Claude API as the core tech stack. Deploy to Vercel.

## Rationale

Next.js App Router provides SSR and API routes in a single framework, eliminating the need for a separate backend service for MVP. Tailwind CSS enables responsive, mobile-first UI with minimal setup. Supabase offers Postgres, Auth, Storage, and Realtime in one managed service. The Claude API (Sonnet) handles vision and text classification. Vercel deployment integrates seamlessly with Next.js.

## Consequences

- No separate backend needed for MVP — API routes handle all server logic.
- Supabase is used for auth/DB/storage/realtime; if Clerk replaces Supabase Auth, Supabase becomes a pure data layer.
- All AI inference goes through the Claude API (Sonnet for classification, potential Vision for photos).
- Deployment is fully serverless on Vercel.

## Related

- [[project/system-architecture]] — system architecture overview
- [[project/endpoints]] — API routes and environment URLs
- [[project/web-app-readme]] — web app setup and configuration

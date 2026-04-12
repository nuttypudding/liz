---
type: decision
tags: [auth, clerk, supabase, architecture]
created: 2026-04-01
updated: 2026-04-01
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Auth: Clerk (Not Supabase Auth)

## Decision

Use Clerk for authentication instead of Supabase Auth. Supabase is a pure DB + storage layer.

## Rationale

Clerk handles auth, role management (landlord/tenant via metadata), Google OAuth, and subscription billing in one service. Supabase Auth would require custom role management and a separate billing integration. Clerk's Next.js middleware simplifies route protection. API routes use the Supabase service-role key with app-level access control rather than Supabase JWT verification.

## Consequences

- Supabase has no auth tables — all session validation goes through Clerk's middleware.
- RLS policies on Supabase use Clerk-provided user IDs passed as query parameters or headers, not native Supabase Auth JWT.
- Vendor lock-in to Clerk's pricing model is accepted as a trade-off for reduced implementation complexity.

## Related

- [[project/clerk-setup-guide]] — Clerk configuration for local development
- [[project/clerk-production-setup]] — Clerk production configuration
- [[project/system-architecture]] — how Clerk and Supabase interact

---
type: decision
tags: [infrastructure, local-dev, supabase]
created: 2026-04-01
updated: 2026-04-01
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Local-First Development with Supabase CLI

## Decision

Use `supabase start` (Supabase CLI + Docker) to run the full stack locally. Supabase cloud is for production only.

## Rationale

Supabase CLI spins up a complete local environment — Postgres on port 54322, Studio on 54323, Auth and Storage on 54321 — via Docker. This means developers can work offline, run migrations safely, and test against a real database without touching production. Migrations written locally apply cleanly to Supabase cloud with no changes.

## Consequences

- Docker is a required local development dependency.
- Migrations must be idempotent and tested locally before being applied to production.
- No `.env` secrets are needed for local development beyond the Supabase CLI defaults.
- Production uses Supabase cloud with the same schema as local.

## Related

- [[project/system-architecture]] — local vs. production environment details
- [[project/web-app-readme]] — local dev setup instructions

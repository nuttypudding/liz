---
type: concept
tags: [infrastructure, local-dev, supabase, docker, database]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Supabase Local Dev

Liz uses the Supabase CLI to run a full Supabase stack locally via Docker. Local development is the primary environment — production Supabase cloud uses the identical schema.

## Starting the Local Stack

```bash
supabase start
```

This command starts all Supabase services inside Docker and outputs connection credentials.

## Local Port Map

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 54322 | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Supabase Studio | 54323 | `http://localhost:54323` |
| Auth (GoTrue) | 54321 | `http://localhost:54321` |
| Storage | 54321 | `http://localhost:54321/storage/v1` |

Supabase Studio (port 54323) is a browser-based SQL editor and data browser — useful for inspecting rows during development.

## Migration Parity

Migrations live in `supabase/migrations/`. The key rules:

1. Write migrations locally first.
2. Test with `supabase db reset` to replay from scratch.
3. Apply to production with `supabase db push` after local validation.
4. Migrations must be idempotent — safe to replay on a clean database.

The same migration files run in both local Docker and Supabase cloud. There is no separate schema management for production.

## Dependencies

Docker Desktop must be running before `supabase start`. Supabase CLI installed via `npm i -g supabase` or Homebrew. No `.env` secrets needed — credentials are printed by `supabase start`.

## env.local Keys

After `supabase start`, copy printed values into `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. No other secrets are needed for local dev.

## Why Local-First

The decision recorded in [[decisions/2026-04-01-local-first-development-supabase-cli]] chose this approach to enable offline development, safe migration testing, and no accidental production writes during feature work.

## Related

- [[decisions/2026-04-01-local-first-development-supabase-cli]] — rationale for local-first Supabase setup
- [[project/web-app-readme]] — full local dev setup instructions including Supabase start
- [[project/system-architecture]] — how local vs. production environments differ

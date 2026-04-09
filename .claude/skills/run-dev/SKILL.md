---
name: run-dev
description: "Start Next.js dev server for local development."
---

# /run-dev — Start Local Dev Server

## Working Directory

`apps/web/`

## Steps

1. **Check dependencies** — If `apps/web/node_modules/` is missing, run `npm install` from `apps/web/`.
2. **Check env** — Verify `apps/web/.env.local` exists. Warn if missing and list required keys from `.env.example`.
3. **Optionally start Supabase local** — If the user wants local Supabase, run `supabase start` from `apps/web/supabase/`. Skip if they're using QA cloud.
4. **Kill stale port** — Check if port 3000 is in use (`lsof -ti:3000`). If so, kill the process.
5. **Start dev server** — Run `npm run dev` from `apps/web/`.
6. **Poll until ready** — Curl `http://localhost:3000` until it responds (max 30s).
7. **Report** — Print the local URL and Supabase Studio URL if running locally.

## Environment URLs

| Service | URL |
|---------|-----|
| Next.js App | `http://localhost:3000` |
| Supabase API (local) | `http://localhost:54321` |
| Supabase Studio (local) | `http://localhost:54323` |

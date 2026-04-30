---
name: run-dev
description: "[PENDING] Start Next.js dev server for local development. Needs project initialization first."
---

# /run-dev — Start Local Dev Server

**STATUS: PENDING** — Activate once `npx create-next-app` has been run and `package.json` exists.

## Planned Setup

- **Next.js**: `http://localhost:3000` — `npm run dev`
- **Supabase**: Cloud-hosted (no local service needed for MVP)

## Steps (once active)

1. Check for `node_modules/` — run `npm install` if missing
2. Check for `.env.local` — warn if Supabase/Codex API keys not set
3. Kill any stale process on port 3000
4. Start Next.js: `npm run dev`
5. Poll `http://localhost:3000` until ready
6. Report status

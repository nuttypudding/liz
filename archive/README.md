# Archive — Legacy Liz Monolith (Phases 1–3)

This directory preserves the pre-agent-platform Liz codebase. It was moved here on **2026-04-29** to declutter the root for the Phase 4 Agent Platform work, while keeping all legacy code easily readable from the working tree.

> **Pre-archive snapshot**: tag `legacy/pre-agent-platform` (push to origin) points at the exact main HEAD before this archive cleanup. Restore the original layout with `git checkout legacy/pre-agent-platform` if you ever need to run the legacy stack from its original paths.

## What's here

```
archive/
├── apps/
│   ├── web/             # Production Liz Next.js app (Vercel deploys from this path)
│   ├── test-lab/        # QA dashboard (port 3100, no auth)
│   ├── arena-web/       # LLM Arena (port 3200) — vision-capable LLM bake-off
│   ├── arena/           # Python Streamlit arena (legacy)
│   ├── api/             # (legacy stub, unused)
│   └── mobile/          # (legacy stub, unused)
├── packages/
│   └── shared/          # liz_shared Python lib (used by archived Python apps)
│   └── triage/          # @liz/triage classifier (used by apps/web + apps/test-lab)
├── docs/                # endpoints.md, testing-framework.md, testing-guides/
├── scripts/             # autonextstep.py task runner
├── supabase/            # Root supabase project (separate from apps/web/supabase)
├── brightstep_process/  # BrightStep dev process reference
├── brightstep_process.zip
├── features/
│   └── completed/       # Phase 1–3 feature plans (P1-001..P3-003)
├── inbox/               # Product owner notes + screenshots from Phase 1 reviews
├── pyproject.toml       # Root Python project metadata for legacy Python tests
├── CLERK_SETUP_GUIDE.md
└── .env.example         # Legacy env var template (LLM keys + Clerk + DB + AgentMail)
```

## Production deployment

Vercel serves `liz.brightstep.ai` from `archive/apps/web/`. The Vercel project's "Root Directory" setting was updated to `archive/apps/web` on 2026-04-29 as part of this archive cleanup.

Cloudflare tunnel on the Spark serves `liz-qa.brightstep.ai` from `archive/apps/web/` (port 3001). The Spark `~/Documents/repo/liz/...` checkout has its own copy of the env files.

## Working with archived code

Read directly from the working tree:
```bash
cat archive/apps/web/middleware.ts
grep -r "clerkClient" archive/apps/web/
```

To run the legacy app locally:

The root `package.json` declares `archive/apps/web`, `archive/apps/test-lab`, `archive/apps/arena-web`, and `archive/packages/triage` as npm workspaces, so a single `npm install` from the repo root resolves all dependencies (including the `@liz/triage` symlink). Run scripts via the workspace flag:

```bash
npm run dev --workspace=archive/apps/web              # local dev (port 3000)
npm run dev:qa --workspace=archive/apps/web           # QA mode (port 3001, .env.qa)
npm run build --workspace=archive/apps/web            # production build
npm run test --workspace=archive/apps/web             # vitest
npm run test:e2e --workspace=archive/apps/web         # playwright
```

If you'd rather check out the original pre-archive layout, use the snapshot tag: `git checkout legacy/pre-agent-platform`.

## Resurrecting something from archive

If you decide a particular module belongs back in active development:
```bash
git mv archive/<path> <path>
# then update root package.json to re-add it as a workspace,
# update CLAUDE.md / AGENTS.md to reflect the new state
```

## Decision log reference

The full archive decision is captured in `plan/DECISION_LOG.md` (entry dated 2026-04-29). The architectural pivot toward the agent platform spans entries dated 2026-04-28.

## Phases preserved here

| Phase | Scope | Tickets |
|-------|-------|---------|
| Phase 1 — MVP | AI Maintenance Intake (Core Four), Clerk Auth, Landlord Onboarding & Decision Profile, MVP UX Overhaul | T-001, T-002, T-003, T-016 |
| Phase 2 | Rent Reminder, Auto-scheduling Vendors, Rule-based Automation, Payment Integration | T-004..T-007 |
| Phase 3 | Autonomous Decision-Making, AI Tenant Screening, Legal/Compliance Engine | T-008..T-010 |
| Phase 1-Tkt | MVP UX Overhaul (Liz feedback consolidation) | T-016, T-017 |

See `archive/features/completed/` for individual feature plans.

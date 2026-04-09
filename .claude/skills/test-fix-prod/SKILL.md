---
name: test-fix-prod
description: "[PENDING] Autonomous production testing. Needs smoke test suite against live URLs."
---

# /test-fix-prod — Autonomous Production QA

**STATUS: PENDING** — Production environment exists. Needs smoke test suite implementation.

## Known Production Infrastructure

| Resource | Value |
|----------|-------|
| Production URL | `https://web-lovat-sigma-36.vercel.app` |
| Vercel Project | `prj_DnDSbfQ2y0gh4EAG06PPbfKQsCiB` |
| Supabase QA | `https://kmtqmuedhwfcosbgsstu.supabase.co` |

## TODO

- [ ] Build smoke test suite against production URLs (health checks, key pages, API routes)
- [ ] Add deployment verification (check Vercel build status before testing)
- [ ] Add fix-and-deploy loop for production issues
- [ ] Define acceptable response time thresholds

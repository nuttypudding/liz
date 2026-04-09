---
name: test-fix-dev
description: "[PENDING] Autonomous local dev testing. Needs autonomous test-fix loop implementation."
---

# /test-fix-dev — Autonomous Local QA

**STATUS: PENDING** — Endpoints and test infrastructure exist. Needs the autonomous test-fix loop logic.

## Available Infrastructure

| Resource | Details |
|----------|---------|
| API Routes | 27 routes in `apps/web/app/api/` |
| App Pages | 13 pages (landlord dashboard, tenant portal, auth, onboarding) |
| Manual Test Cases | 220+ cases across 10 guides in `docs/testing-guides/` |
| Automated Tests | ~168 unit/component tests (Vitest), ~12 E2E specs (Playwright) |
| Dev Server | `npm run dev` from `apps/web/` on port 3000 |

## TODO

- [ ] Implement test-fix loop: run tests → analyze failures → apply fix → re-run
- [ ] Add creative test patterns (injection, unicode, edge cases)
- [ ] Add API endpoint discovery and smoke testing
- [ ] Add Playwright UI route crawling

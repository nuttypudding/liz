---
name: overnight-qa
description: "[PENDING] Comprehensive overnight QA. Needs full test matrix and data flow verification."
---

# /overnight-qa — Overnight QA

**STATUS: PENDING** — Test infrastructure exists. Needs full test matrix orchestration.

## Available Test Infrastructure

| Resource | Details |
|----------|---------|
| Unit/Component Tests | ~168 tests via Vitest (`npm test`) |
| E2E Tests | ~12 Playwright specs (`npm run test:e2e`) |
| Manual Testing Guides | 10 guides in `docs/testing-guides/` covering 220+ test cases |
| Core Data Flow | Tenant submits request → AI classifies (category + urgency) → Landlord reviews → Dispatch to vendor → Resolve |

## TODO

- [ ] Define full feature test matrix from testing guides
- [ ] Add data flow verification (tenant → intake → classification → vendor dispatch → resolution)
- [ ] Add environment auditing (env vars, Supabase connectivity, Clerk auth)
- [ ] Add auto-fix and retest loop
- [ ] Add reporting (test coverage, pass rates, regression detection)

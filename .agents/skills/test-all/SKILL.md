---
name: test-all
description: "[PENDING] Run all tests — unit, integration, and E2E. Needs project initialization first."
---

# /test-all — Run All Tests

**STATUS: PENDING** — Activate once test framework is set up.

## Planned Tiers

| Tier | Framework | Command |
|------|-----------|---------|
| Unit | Vitest or Jest | `npm run test` |
| E2E | Playwright | `npx playwright test` |

## Arguments

`unit|e2e|all` (default: `all`)

## Steps (once active)

1. Check prerequisites (node_modules, env vars)
2. Run unit tests
3. Run E2E tests (requires dev server running)
4. Report results (pass/fail counts per tier)

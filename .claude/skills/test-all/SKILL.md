---
name: test-all
description: "Run all tests — unit, component, and E2E."
---

# /test-all — Run All Tests

## Working Directory

`apps/web/`

## Test Tiers

| Tier | Framework | Command | Count |
|------|-----------|---------|-------|
| Unit + Component | Vitest | `npm test` | ~168 tests |
| E2E | Playwright | `npm run test:e2e` | ~12 specs |

## Arguments

`unit|e2e|all` (default: `all`)

- `unit` — Run Vitest unit and component tests only
- `e2e` — Run Playwright E2E tests only
- `all` — Run both tiers sequentially

## Steps

1. **Check prerequisites** — Verify `node_modules/` exists, run `npm install` if missing.
2. **Run unit/component tests** (if tier includes unit) — `cd apps/web && npm test`. Report pass/fail counts.
3. **Run E2E tests** (if tier includes e2e) — `cd apps/web && npm run test:e2e`. Playwright will start its own server.
4. **Report results** — Summarize pass/fail counts per tier. Exit with non-zero if any failures.

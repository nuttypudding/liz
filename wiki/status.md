# Project Status

_Initial hand-crafted snapshot. `/wiki-status` (task 265) will regenerate this from live state going forward._

**Date**: 2026-04-12
**Branch**: `feature/P1-Tkt-002-llm-wiki`

## Phase

**Phase 1 MVP: complete and deployed.** Live on Vercel production. Core Four (Gatekeeper, Estimator, Matchmaker, Ledger) + Clerk Auth + Landlord Onboarding + MVP UX Overhaul all merged.

**Phase 2**: P2-001 Rent Reminder done; P2-002/003/004 complete pending final integration validation.

**Phase 3**: all three features (P3-001/002/003) marked complete in [[project/roadmap]]; phase-level validation pending.

## Features in flight

| Feature | Branch | Progress | Current task |
|---|---|---|---|
| P1-Tkt-002 LLM Wiki | `feature/P1-Tkt-002-llm-wiki` | 15/33 tasks done (45%) | 261 (Opus) — this page |

## Open tickets

See [[qa-queue]] for the Liz-facing version. Raw state from `.claude/tickets.md`:

| Status | Count | Tickets |
|---|---|---|
| in-progress | 1 | T-003 (Clerk Auth remaining items) |
| open | 9 | T-004, T-005, T-006, T-007, T-008, T-009, T-010, T-016, T-018 |
| deployed | 1 | T-017 (onboarding "failed to create property" bug fix) |
| closed | 2 | T-001, T-002 |

## Recently shipped

- 2026-04-10 — P2-001 Rent Reminder autorunner completed; PR #12 merged
- 2026-04-09 — T-017 prod hotfix: middleware role fallback + landlord bootstrap (see [[concepts/clerk-roles]])
- Earlier — 50-task P1-Tkt-001 MVP UX Overhaul shipped: onboarding refinements, property-centric dashboard, lease & document management, utility integration

## Next likely

Once P1-Tkt-002 LLM Wiki merges:
- P2-002 / P2-003 / P2-004 final validation sweeps
- Phase 3 end-to-end testing
- Or a new ticket-driven feature based on Liz's review of what's now deployed

## Blockers

None tracked. No unresolved `PIVOT.md` files. Feature-lifecycle state is `in_progress` on the wiki branch.

---
_Generated 2026-04-12 by task 261 (hand-crafted initial). Subsequent refreshes by `/wiki-status`._

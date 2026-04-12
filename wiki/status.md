# Project Status

**Date**: 2026-04-12
**Branch**: `feature/P1-Tkt-002-llm-wiki` (PR pending merge to `main`)

## Phase

**Phase 1 MVP: complete and deployed.** Live on Vercel production. Core Four (Gatekeeper, Estimator, Matchmaker, Ledger) + Clerk Auth + Landlord Onboarding + MVP UX Overhaul all merged.

**P1-Tkt-002 LLM Wiki: complete.** All 33 tasks done (27 on this branch + 6 on the earlier scaffold). PR awaiting merge. This feature replaced `docs/` and `plan/` with a persistent LLM-maintained knowledge base and wired every major skill to log, propagate, and refresh the wiki.

**Phase 2**: P2-001 Rent Reminder done; P2-002/003/004 complete pending final integration validation.

**Phase 3**: all three features (P3-001/002/003) marked complete in [[project/roadmap]]; phase-level validation pending.

## Features in flight

_None._ `features/inprogress/` is empty. The most recent completed feature is `P1-Tkt-002-llm-wiki` (27 tasks merged on this branch).

## Open tickets

See [[qa-queue]] for the Liz-facing version. Raw state from `.claude/tickets.md`:

| Status | Count | Tickets |
|---|---|---|
| in-progress | 1 | T-003 (Clerk Auth remaining items) |
| open | 10 | T-004, T-005, T-006, T-007, T-008, T-009, T-010, T-016, T-018, **T-019** (broken source citations, filed 2026-04-12) |
| deployed | 1 | T-017 (onboarding "failed to create property" bug fix) |
| closed | 2 | T-001, T-002 |

## Recently shipped

- 2026-04-12 — P1-Tkt-002 LLM Wiki feature complete (27 tasks 253–279): wiki scaffold, doc/plan migration, skill hooks, Streamlit chat with cached Claude corpus, dogfood of `/ingest` and `/wiki-query`
- 2026-04-12 — migration | `docs/` → `wiki/project/` (25 files)
- 2026-04-12 — migration | `plan/` → `wiki/decisions/` (23 pages)
- 2026-04-10 — P2-001 Rent Reminder autorunner completed; PR #12 merged
- 2026-04-09 — T-017 prod hotfix: middleware role fallback + landlord bootstrap (see [[concepts/clerk-roles]])

## Next likely

- Merge the P1-Tkt-002 PR to `main` — unblocks the next feature slot
- T-019 cleanup: either ingest the remaining intake samples (04, 07, 10) or remove the dangling citations in `concepts/urgency-triage.md`
- Liz review round using the new wiki chat — validate whether `/run-wiki-chat` answers her real questions grounded and cited
- P2-002 / P2-003 / P2-004 final validation sweeps
- Phase 3 end-to-end testing

## Blockers

None tracked. No unresolved `PIVOT.md` files. Feature-lifecycle state will move to `pr_created` when the completion PR is opened.

---
_Generated 2026-04-12 by /wiki-status (feature-completion trigger for P1-Tkt-002-llm-wiki)._

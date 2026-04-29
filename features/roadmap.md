# Feature Roadmap

Active development is on the **Agent Platform** (Phase 4). Phases 1–3 (the legacy Liz monolith) are archived under `archive/features/completed/` for reference.

## Phase 4 — Agents as Standalone Services

Move AI logic into independently deployable agent services. Each agent: own dir, own deps, own tests, own deploy. Uniform HTTP contract. See `plan/DECISION_LOG.md` 2026-04-28 entries.

| ID | Feature | Status | Ticket | Notes |
|----|---------|--------|--------|-------|
| P4-001 | Agent Platform | IN PROGRESS | T-018 | First agent: `agents/maintenance-triage/`. POC-1 complete (hello-world stub + 20 tests + web test harness). See `features/planned/P4-001-agent-platform/README.md` and `POC.md`. |

## Naming conventions

- **Planned roadmap**: `P{phase}-{seq}-{name}` (e.g., `P4-001-agent-platform`)
- **Ticket-driven**: `P{phase}-Tkt-{seq}-{name}` (reactive work — bug fixes, feedback)

## Legacy phases (archived)

Phase 1 MVP, Phase 2 (rent reminder, vendor scheduling, automation, payments), and Phase 3 (autonomy, screening, compliance) are complete. Their feature plans, tasks, and code live under `archive/`. See `archive/features/completed/` for historical reference. The legacy Liz app deploys from `archive/apps/web/` via Vercel.

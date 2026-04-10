# Ticket Tracker

All features and bug fixes are tracked here. Every piece of work starts with a ticket.

## Categories

| Category | Description | Deployment |
|----------|-------------|------------|
| `new-feature` | New functionality | PR-based deploy |
| `bug-fix-dev` | Bug in local dev only | Fix + test locally, no deploy |
| `bug-fix-prod` | Bug in production | Fix → test → PR → deploy → verify |

## Status Lifecycle

`open` → `in-progress` → `testing` → `pr-open` → `deployed` → `closed`

## Open Tickets

| Ticket | Date | Category | Description | Branch | Status | PR | Notes |
|--------|------|----------|-------------|--------|--------|----|-------|
| T-003 | 2026-04-08 | new-feature | Clerk Auth — roles, role selection, billing page, withAuth helper, production config | feature/T-003-clerk-auth | in-progress | — | Foundation done (13 items). Tasks 075–085 (4H/4S/3O) for remaining work. |
| T-004 | 2026-04-08 | new-feature | Rent Reminder — rent tracking, due dates, overdue alerts, notification preferences | — | open | — | Phase 2. Depends on P1-002. 16 tasks |
| T-005 | 2026-04-08 | new-feature | Auto-scheduling Vendors — vendor availability, tenant availability, AI schedule matching, Resend + Twilio | — | open | — | Phase 2. 17 tasks |
| T-006 | 2026-04-08 | new-feature | Rule-based Automation — IF/THEN rules engine, rule builder UI, audit trail | — | open | — | Phase 2. Extends P1-003 decision profile. 19 tasks |
| T-007 | 2026-04-08 | new-feature | Payment Integration — Stripe Connect, tenant rent payment, vendor payment tracking, P&L view | — | open | — | Phase 2. 20 tasks |
| T-008 | 2026-04-08 | new-feature | Autonomous Decision-Making — full AI autopilot, confidence scoring, safety rails, audit trail | — | open | — | Phase 3. Depends on P2-003. 22 tasks |
| T-009 | 2026-04-08 | new-feature | AI Tenant Screening — application portal, TransUnion SmartMove, AI analysis, fair housing compliance | — | open | — | Phase 3. 27 tasks |
| T-010 | 2026-04-08 | new-feature | Legal/Compliance Engine — jurisdiction rules, notice generator, communication reviewer, compliance dashboard | — | open | — | Phase 3. 24 tasks |
| T-016 | 2026-04-08 | new-feature | MVP UX Overhaul (P1-Tkt-001) — onboarding refinements, property-centric dashboard, lease & document management, utility integration | — | open | — | Consolidates Liz's feedback (formerly T-011–T-015). Includes slider bug fix. Tasks 025–074 (50 tasks: 7H/14S/29O). |
| T-017 | 2026-04-09 | bug-fix-prod | Onboarding wizard "Failed to create property" — `getRole()` returned null for self-signup users (no `publicMetadata.role` set). Added webhook default + backend fallback + landlord bootstrap. | feature/P1-Tkt-001-mvp-ux-overhaul | deployed | — | Reproduced via `e2e-prod/onboarding-smoke.mjs`. `/test-fix-prod` skill is now implemented. |

## Closed Tickets

| Ticket | Date | Category | Description | Branch | Status | PR | Notes |
|--------|------|----------|-------------|--------|--------|----|-------|
| T-002 | 2026-04-06 | new-feature | Landlord Onboarding & Decision Profile — risk appetite, delegation mode, auto-approve thresholds, vendor preferences | feature/T-002-landlord-onboarding-decision-profile | closed | — | Foundational for Phase 2 automation |
| T-001 | 2026-04-01 | new-feature | AI Maintenance Intake MVP — The Core Four: Gatekeeper, Estimator, Matchmaker, Ledger | feature/T-001-ai-maintenance-intake-mvp | closed | #1 | Full MVP scope |

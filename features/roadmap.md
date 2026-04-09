# Feature Roadmap

Feature plans live at `features/planned/P{phase}-{seq}-{name}/README.md` (planned) or `features/inprogress/P{phase}-{seq}-{name}/` (active, with `backlog/`, `doing/`, `done/` task dirs).

Ticket-driven work within an existing phase uses `P{phase}-Tkt-{seq}-{name}/` naming (e.g., `P1-Tkt-001-mvp-ux-overhaul`). See CLAUDE.md for convention details.

## Phase 1 — MVP

| ID | Feature | Status | Ticket | Notes |
|----|---------|--------|--------|-------|
| P1-001 | AI Maintenance Intake MVP | COMPLETE | T-001 | "The Core Four" — Gatekeeper, Estimator, Matchmaker, Ledger. 15 tasks complete. Merged PR #1. |
| P1-002 | Clerk Auth | PLANNED | T-003 | Authentication, roles, role selection, billing page, withAuth helper. 10 tasks (3H/4S/3O). |
| P1-003 | Landlord Onboarding & Decision Profile | COMPLETE | T-002 | Tasks 016–024 (3 Haiku, 4 Sonnet, 2 Opus). Risk appetite, delegation mode, auto-approve thresholds, vendor preferences. 5-step onboarding wizard with property/tenant/vendor collection. |
| P1-Tkt-001 | MVP UX Overhaul | IN PROGRESS | T-016 | Consolidated from Liz's feedback. 4 work streams: onboarding refinements, property-centric dashboard, lease & document mgmt, utility integration. Tasks 025–074 (50 tasks: 7H/14S/29O). |

## Phase 2

| ID | Feature | Status | Ticket | Notes |
|----|---------|--------|--------|-------|
| P2-001 | Rent Reminder | PLANNED | T-004 | Rent tracking, due dates, overdue alerts, Vercel Cron, notification bell. 16 tasks (3H/9S/4O). |
| P2-002 | Auto-scheduling Vendors | PLANNED | T-005 | Vendor/tenant availability, AI schedule matching, Resend + Twilio. 17 tasks (4H/7S/4O). |
| P2-003 | Rule-based Automation | PLANNED | T-006 | IF/THEN rules engine, visual rule builder, test panel, audit trail. 19 tasks (4H/8S/5O). |
| P2-004 | Payment Integration | PLANNED | T-007 | Stripe Connect, tenant rent payment, vendor payment tracking, financial P&L. 20 tasks (4H/10S/4O). |

## Phase 3 — Full Vision

| ID | Feature | Status | Ticket | Notes |
|----|---------|--------|--------|-------|
| P3-001 | Autonomous Decision-Making | PLANNED | T-008 | Full AI autopilot, confidence scoring, safety rails, monthly reports. 22 tasks (6H/9S/5O). |
| P3-002 | AI Tenant Screening | PLANNED | T-009 | Application portal, TransUnion SmartMove, AI analysis, fair housing compliance. 27 tasks (5H/12S/5O). |
| P3-003 | Legal/Compliance Engine | PLANNED | T-010 | Jurisdiction rules, notice generator, communication reviewer, compliance dashboard. 24 tasks (4H/10S/6O). |

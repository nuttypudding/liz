# Feature Roadmap

Feature plans live at `features/planned/P{phase}-{seq}-{name}/README.md` (planned) or `features/inprogress/P{phase}-{seq}-{name}/` (active, with `backlog/`, `doing/`, `done/` task dirs).

Ticket-driven work within an existing phase uses `P{phase}-Tkt-{seq}-{name}/` naming (e.g., `P1-Tkt-001-mvp-ux-overhaul`). See CLAUDE.md for convention details.

## Phase 1 — MVP

| ID | Feature | Status | Ticket | Notes |
|----|---------|--------|--------|-------|
| P1-001 | AI Maintenance Intake MVP | COMPLETE | T-001 | "The Core Four" — Gatekeeper, Estimator, Matchmaker, Ledger. 15 tasks complete. Merged PR #1. |
| P1-002 | Clerk Auth | COMPLETE | T-003 | All 11 tasks complete. Merged to main. |
| P1-003 | Landlord Onboarding & Decision Profile | COMPLETE | T-002 | Tasks 016–024 (3 Haiku, 4 Sonnet, 2 Opus). Risk appetite, delegation mode, auto-approve thresholds, vendor preferences. 5-step onboarding wizard with property/tenant/vendor collection. |
| P1-Tkt-001 | MVP UX Overhaul | COMPLETE | T-016 | Consolidated from Liz's feedback. 4 work streams: onboarding refinements, property-centric dashboard, lease & document mgmt, utility integration. Tasks 025–074 (50 tasks: 7H/14S/29O). |
| P1-Tkt-002 | LLM Wiki | IN PROGRESS | T-018 | Persistent LLM-maintained knowledge base replacing docs/ and plan/. Three audiences: Claude Code, developer, Liz. Obsidian + qmd + Streamlit chat. Tasks 247–279 (33 tasks: 8H/19S/6O). |

## Phase 2

| ID | Feature | Status | Ticket | Notes |
|----|---------|--------|--------|-------|
| P2-001 | Rent Reminder | IN PROGRESS | T-004 | Rent tracking, due dates, overdue alerts, Vercel Cron, notification bell. 16 tasks (3H/9S/4O). Tasks 231–246. |
| P2-002 | Auto-scheduling Vendors | COMPLETE | T-005 | Vendor/tenant availability, AI schedule matching, Resend + Twilio. 4 done, 13 remaining. Tasks 102–118. |
| P2-003 | Rule-based Automation | COMPLETE | T-006 | IF/THEN rules engine, visual rule builder, test panel, audit trail. 19 tasks (4H/8S/5O). |
| P2-004 | Payment Integration | COMPLETE | T-007 | Stripe Connect, tenant rent payment, vendor payment tracking, financial P&L. 20 tasks (4H/10S/4O). |

## Phase 3 — Full Vision

| ID | Feature | Status | Ticket | Notes |
|----|---------|--------|--------|-------|
| P3-001 | Autonomous Decision-Making | COMPLETE | T-008 | Full AI autopilot, confidence scoring, safety rails, monthly reports. 22 tasks (6H/9S/5O). |
| P3-002 | AI Tenant Screening | COMPLETE | T-009 | Application portal, TransUnion SmartMove, AI analysis, fair housing compliance. 27 tasks (5H/12S/5O). |
| P3-003 | Legal/Compliance Engine | COMPLETE | T-010 | Jurisdiction rules, notice generator, communication reviewer, compliance dashboard. 24 tasks (4H/10S/6O). |

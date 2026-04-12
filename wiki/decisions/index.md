---
type: project
tags: [decisions, index]
created: 2026-04-11
updated: 2026-04-11
source_ids: []
confidence: high
---

# Decisions Index

This catalog replaces `plan/DECISION_LOG.md` as the canonical record of architectural, technical, and strategic decisions for the Liz platform. Each decision is its own page with full rationale, consequences, and cross-links. Entries are in reverse-chronological order (newest first).

For the migration history, see [plan/DECISION_LOG.md](/plan/DECISION_LOG.md) (kept intact until task 256 removes source files).

---

## 2026-04-12

- [[decisions/2026-04-12-adopt-llm-wiki-pattern]] — Replace docs/plan/intake with persistent LLM wiki (P1-Tkt-002, T-018)

## 2026-04-08

- [[decisions/2026-04-08-tkt-naming-convention]] — Introduce P{phase}-Tkt-{seq}-{name} for ticket-driven features
- [[decisions/2026-04-08-consolidate-feedback-p1-tkt-001]] — Merge P1-004–007 and T-011 into P1-Tkt-001-mvp-ux-overhaul
- [[decisions/2026-04-08-hybrid-ai-manual-utility-lookup]] — Claude Haiku suggests utilities; landlord confirms (P1-007)
- [[decisions/2026-04-08-lease-fields-on-tenants-table]] — Lease data on tenants table, not a separate leases table (P1-006)
- [[decisions/2026-04-08-property-centric-dashboard-url-state]] — Selected property as URL search param, responsive affordances (P1-005)
- [[decisions/2026-04-08-rename-ai-to-agent-copy]] — Use "your agent" over "AI" or "Liz" in user-facing copy (P1-004)
- [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]] — Product review generated four new Phase 1 features
- [[decisions/2026-04-08-jurisdiction-rules-curated-supabase-table]] — Legal rules are curated DB rows, not AI-generated (P3-003)
- [[decisions/2026-04-08-transunion-smartmove-tenant-screening]] — TransUnion SmartMove for screening; SSNs never on Liz servers (P3-002)
- [[decisions/2026-04-08-resend-twilio-notifications]] — Resend (email) + Twilio (SMS) wrapped in NotificationService (P2-002)
- [[decisions/2026-04-08-stripe-connect-express-payments]] — Stripe Connect Express for KYC/payouts; Checkout for tenant payments (P2-004)
- [[decisions/2026-04-08-plan-all-roadmap-features]] — Upfront detailed plans for all 8 remaining roadmap features

## 2026-04-06

- [[decisions/2026-04-06-onboarding-redirect-gated-wizard]] — New landlords redirected to /onboarding until profile exists
- [[decisions/2026-04-06-auto-delegation-mode-disabled-mvp]] — "Auto" dispatch visible but disabled; deferred to Phase 2/3
- [[decisions/2026-04-06-landlord-decision-profile-separate-table]] — landlord_profiles table keyed on Clerk user ID

## 2026-04-01

- [[decisions/2026-04-01-auth-clerk-not-supabase]] — Clerk for auth/roles/billing; Supabase is pure DB + storage
- [[decisions/2026-04-01-vendor-dispatch-db-only-mvp]] — Work orders DB-only in MVP; Twilio deferred to Phase 2
- [[decisions/2026-04-01-mvp-scope-core-four]] — MVP = Gatekeeper, Estimator, Matchmaker, Ledger
- [[decisions/2026-04-01-local-first-development-supabase-cli]] — supabase start for local full-stack; cloud for production only
- [[decisions/2026-04-01-tech-stack-nextjs-tailwind-supabase-claude]] — Next.js + Tailwind + Supabase + Claude API on Vercel
- [[decisions/2026-04-01-adopt-brightstep-process]] — BrightStep ticket-first workflow, model tiers, automated task runner

## Strategic Framing

- [[decisions/scale-or-die-roadmap]] — "Hands-free yield machine" strategy; Hormozi-style four-phase roadmap to $100M

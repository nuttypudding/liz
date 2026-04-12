# Wiki Index

Catalog of every wiki page. Entries are alphabetical within each section.

## Entities

- [[entities/claude-code-agent]] — The Claude Code agent as an active participant
- [[entities/landlord]] — Small-landlord persona (1–20 units)
- [[entities/liz-product-owner]] — Liz, the human product owner
- [[entities/tenant]] — Tenant persona in the maintenance intake flow
- [[entities/vendor]] — Vendor persona (plumbers, electricians, etc.)

## Concepts

- [[concepts/brightstep-process]] — Ticket-first development methodology
- [[concepts/clerk-roles]] — landlord/tenant role resolution via publicMetadata
- [[concepts/confidence-scoring]] — How Claude emits confidence and thresholds for human review
- [[concepts/feature-branch-lifecycle]] — Per-feature branches and `.claude/feature-lifecycle.json`
- [[concepts/intake-json-schema]] — `ai_maintenance_intake` data structure
- [[concepts/maintenance-category-taxonomy]] — Category taxonomy (plumbing, electrical, hvac, structural, pest, appliance, general)
- [[concepts/model-tier-system]] — Haiku/Sonnet/Opus tier routing; front-end = Opus
- [[concepts/skills-catalog]] — Slash-command skills Claude Code uses to drive Liz
- [[concepts/supabase-local-dev]] — Docker-based local Supabase stack
- [[concepts/tech-stack]] — Next.js + Tailwind + Supabase + Clerk + Claude API + Vercel
- [[concepts/the-core-four]] — Gatekeeper, Estimator, Matchmaker, Ledger
- [[concepts/ticket-lifecycle]] — open → in-progress → testing → pr-open → deployed → closed
- [[concepts/urgency-triage]] — low / medium / emergency triage rubric

## Sources

_(none yet — first `/ingest` will populate)_

## Synthesis

_(none yet — `/wiki-query` file-backs will populate)_

## Decisions

Reverse-chronological. Full catalog at [[decisions/index]].

- [[decisions/2026-04-12-adopt-llm-wiki-pattern]] — Replace docs/plan/intake with persistent LLM wiki
- [[decisions/2026-04-08-consolidate-feedback-p1-tkt-001]] — Merge P1-004–007 + T-011 into P1-Tkt-001
- [[decisions/2026-04-08-hybrid-ai-manual-utility-lookup]] — Claude Haiku suggests utilities; landlord confirms
- [[decisions/2026-04-08-jurisdiction-rules-curated-supabase-table]] — Legal rules are curated DB rows
- [[decisions/2026-04-08-lease-fields-on-tenants-table]] — Lease data on tenants table
- [[decisions/2026-04-08-plan-all-roadmap-features]] — Upfront plans for all 8 remaining roadmap features
- [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]] — Product review → four new Phase 1 features
- [[decisions/2026-04-08-property-centric-dashboard-url-state]] — Property selected via URL search param
- [[decisions/2026-04-08-rename-ai-to-agent-copy]] — "Your agent" over "AI" in user-facing copy
- [[decisions/2026-04-08-resend-twilio-notifications]] — Resend + Twilio wrapped in NotificationService
- [[decisions/2026-04-08-stripe-connect-express-payments]] — Stripe Connect Express for payments
- [[decisions/2026-04-08-tkt-naming-convention]] — P{phase}-Tkt-{seq} naming for ticket-driven features
- [[decisions/2026-04-08-transunion-smartmove-tenant-screening]] — TransUnion SmartMove; SSNs off Liz servers
- [[decisions/2026-04-06-auto-delegation-mode-disabled-mvp]] — Auto dispatch visible but disabled in MVP
- [[decisions/2026-04-06-landlord-decision-profile-separate-table]] — landlord_profiles table keyed on Clerk user ID
- [[decisions/2026-04-06-onboarding-redirect-gated-wizard]] — Redirect to /onboarding until profile exists
- [[decisions/2026-04-01-adopt-brightstep-process]] — BrightStep ticket-first workflow and model tiers
- [[decisions/2026-04-01-auth-clerk-not-supabase]] — Clerk for auth; Supabase is pure data layer
- [[decisions/2026-04-01-local-first-development-supabase-cli]] — `supabase start` for local dev
- [[decisions/2026-04-01-mvp-scope-core-four]] — MVP = Gatekeeper, Estimator, Matchmaker, Ledger
- [[decisions/2026-04-01-tech-stack-nextjs-tailwind-supabase-claude]] — Next.js + Tailwind + Supabase + Claude API
- [[decisions/2026-04-01-vendor-dispatch-db-only-mvp]] — Work orders DB-only in MVP
- [[decisions/scale-or-die-roadmap]] — "Hands-free yield machine" four-phase strategy

## Project

- [[project/clerk-production-setup]] — Clerk production configuration
- [[project/clerk-setup-guide]] — Clerk local dev setup
- [[project/endpoints]] — All environment URLs, API routes, and app pages
- [[project/macmini-qa-setup]] — Mac Mini QA environment setup
- [[project/stripe-setup-guide]] — Stripe Connect configuration
- [[project/system-architecture]] — System design + build plan
- [[project/testing-framework]] — Test structure, feature-to-test mapping, coverage gaps
- [[project/ui-process]] — UI design/build/polish pipeline
- [[project/ux-plan-intake-mvp]] — UX plan for AI Maintenance Intake MVP
- [[project/web-app-readme]] — Web app bootstrapping notes

### Project — Testing guides
- [[project/testing-guides/01-auth-onboarding]]
- [[project/testing-guides/02-landlord-dashboard]]
- [[project/testing-guides/03-properties]]
- [[project/testing-guides/04-vendors]]
- [[project/testing-guides/05-requests-landlord]]
- [[project/testing-guides/06-tenant-submit]]
- [[project/testing-guides/07-tenant-my-requests]]
- [[project/testing-guides/08-settings]]
- [[project/testing-guides/09-navigation-layout]]
- [[project/testing-guides/10-edge-cases]]
- [[project/testing-guides/claude-code-prompt-testing-guide]]
- [[project/testing-guides/manual-test-guide]]

### Project — Workflow
- [[project/workflow/brightstep-process]] — BrightStep development process reference
- [[project/workflow/brightstep-readme]] — Portable process export overview
- [[project/workflow/claude-md-template]] — CLAUDE.md template for new projects
- [[project/workflow/qmd-search]] — qmd search install + usage
- [[project/workflow/wiki-chat]] — wiki chat app operator guide

## Root pages

- [[WIKI]] — Authoritative schema for `wiki/**`
- [[for-liz]] — Liz's plain-language landing page
- [[qa-queue]] — What needs testing now (auto-refreshed)
- [[status]] — Where the project is at (auto-refreshed)
- [[log]] — Append-only chronological record

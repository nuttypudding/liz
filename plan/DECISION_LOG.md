# Decision Log

All architectural, technical, and strategic decisions are recorded here.

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-04-01 | Adopt BrightStep development process | Provides ticket-first workflow, model tier system, automated task runner, and structured feature planning | Active |
| 2026-04-01 | Tech stack: Next.js + Tailwind + Supabase + Claude API | Mobile-first MVP. Next.js App Router for SSR + API routes, Tailwind for responsive UI, Supabase for auth/DB/storage/realtime, Claude API (Sonnet) for vision + text classification. Deploy to Vercel. No separate backend needed for MVP. | Active |
| 2026-04-01 | Local-first development with Supabase CLI | `supabase start` runs full stack locally (Postgres, Auth, Storage, Studio) via Docker. Supabase cloud for production only. Migrations work in both environments. | Active |
| 2026-04-01 | MVP scope: "The Core Four" | Gatekeeper (AI triage + troubleshooting), Estimator (vision + cost estimate), Matchmaker (vendor dispatch + work orders), Ledger (spend vs rent dashboard). Consolidates AI Maintenance Intake + Vendor Suggestion + Tenant Communication into one feature. Rent reminders deferred to Phase 2. | Active |
| 2026-04-01 | Vendor dispatch is DB-only for MVP | Work orders saved to database, no SMS/email to vendors in v1. Add Twilio in Phase 2. | Active |
| 2026-04-01 | Auth: Clerk (not Supabase Auth) | Clerk handles auth, roles (landlord/tenant via metadata), Google OAuth, and subscription billing. Supabase is pure DB + storage — API routes use service-role key with app-level access control. | Active |
| 2026-04-06 | Landlord Decision Profile as separate table | `landlord_profiles` (1:1 with Clerk user) rather than adding columns to a non-existent users table. Keeps profile data clean and queryable. Vendor preferences use `preferred` + `priority_rank` columns on existing `vendors` table. | Active |
| 2026-04-06 | "Auto" delegation mode disabled for MVP | Show option but mark "Coming soon." Full autonomous dispatch needs escalation layer, spending limits, and safety rails. Defer to Phase 2/3. | Active |
| 2026-04-06 | Onboarding as redirect-gated wizard | New landlords redirected to `/onboarding` if no profile exists. After completion, redirected to dashboard. Settings page allows editing anytime. | Active |
| 2026-04-08 | Plan all roadmap features (P1-002 through P3-003) | Created detailed feature plans with UX designs for all 8 remaining features. Tickets T-003–T-010. Total: ~155 tasks across 3 phases. Plans include component hierarchies, data models, API routes, and testing checklists. | Active |
| 2026-04-08 | Stripe Connect Express for payments (P2-004) | Stripe Connect handles landlord KYC and payouts. Stripe Checkout (hosted) for tenant payments — zero PCI scope. Vendor payments are manual entry for Phase 2. | Active |
| 2026-04-08 | Resend + Twilio for notifications (P2-002) | Resend for email (React templates, Next.js integration). Twilio for SMS. Both wrapped in a NotificationService abstraction. | Active |
| 2026-04-08 | TransUnion SmartMove for tenant screening (P3-002) | SSNs never touch Liz servers — applicants verify on TransUnion's hosted page. Provider abstraction allows swapping. Four-layer fair housing defense. | Active |
| 2026-04-08 | Jurisdiction rules as curated Supabase table (P3-003) | Not AI-generated at runtime. Curated legal rules per state/city. AI used for communication review and notice personalization, not rule generation. | Active |
| 2026-04-08 | Product owner feedback → 4 new Phase 1 features (P1-004 through P1-007) | Liz reviewed deployed onboarding + dashboard. Feedback organized into: onboarding UX refinements, property-centric dashboard, lease/document management, utility company integration. Bug T-011 (slider) also logged. | Active |
| 2026-04-08 | Rename "AI" to "Agent" in user-facing copy (P1-004) | Product owner prefers "your agent" over "AI" or "Liz" in onboarding. More professional, less anthropomorphized. | Active |
| 2026-04-08 | Property-centric dashboard with URL-based state (P1-005) | Selected property stored as `?property={id}` search param for bookmarkability. House icons on desktop, Select dropdown on mobile. | Active |
| 2026-04-08 | Lease fields on tenants table, not separate leases table (P1-006) | MVP: one active lease per tenant. Separate table would be over-engineering for 1-20 unit landlords. Can migrate later if multi-lease history needed. | Active |
| 2026-04-08 | Hybrid AI + manual for utility lookup (P1-007) | Claude Haiku suggests providers by address, landlord confirms/edits. One row per utility type per property in `property_utilities` table. Account numbers stored but never sent to AI or shown to tenants. | Active |
| 2026-04-08 | Consolidate Liz's feedback into P1-Tkt-001-mvp-ux-overhaul | P1-004 through P1-007 + bug T-011 merged into one feature (T-016). All originated from the same product review session. Keeps related work together, reduces ticket overhead. | Active |
| 2026-04-08 | New naming convention: `P{phase}-Tkt-{seq}-{name}` | For ticket-driven work (bug fixes, feedback, enhancements) within an existing phase. Distinguishes planned roadmap features (`P{phase}-{seq}`) from reactive work. Planned features are pre-roadmap; Tkt features are driven by tickets/feedback after initial plans. | Active |

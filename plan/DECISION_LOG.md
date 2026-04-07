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

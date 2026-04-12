---
type: entity
tags: [landlord, persona, onboarding, mvp]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Landlord (Small Portfolio Owner)

The primary user of Liz. A small-to-mid landlord managing 1–20 residential units, typically self-managed without a property management company. This is the persona Liz is built for and the lens all product decisions are filtered through.

## Defining Characteristics

- Portfolio size: 1–20 units (see [[decisions/2026-04-01-mvp-scope-core-four]])
- Time-constrained: maintenance consumes 4+ hours per incident manually; Liz targets 4 minutes
- Risk-averse by default — prefers to approve before any action is taken
- Vendor relationships are personal: may have preferred contractors or a short list of trusted tradespeople
- Financially oriented: wants to see maintenance spend vs. monthly rent at a glance

## Goals

1. Eliminate the friction of responding to tenant maintenance requests
2. Avoid being overcharged by vendors (wants a price anchor before calling)
3. Maintain habitability and legal compliance without a legal team
4. Keep a paper trail for tax and insurance purposes

## Pain Points

- Gets woken up for non-emergencies because tenants don't know what qualifies as urgent
- No baseline cost estimate when a vendor quotes a job
- Manual vendor outreach — finding contact info, sending details, confirming receipt
- No single view of which units are profitable vs. a money pit

## Decision Profile

Liz captures per-landlord preferences at onboarding per [[decisions/2026-04-06-onboarding-redirect-gated-wizard]]:

| Preference | Options |
|------------|---------|
| Risk appetite | cost-first, speed-first, balanced |
| Delegation mode | manual, assist (auto disabled in MVP) |
| Max auto-approve | dollar threshold (e.g. $150) |
| Vendor preferences | preferred list or open market |

The decision profile is stored in `landlord_profiles` (Supabase), keyed on Clerk user ID. See [[decisions/2026-04-06-landlord-decision-profile-separate-table]].

## Approval Authority

All work orders require explicit landlord approval before dispatch. The "Auto" delegation mode is visible in the UI but disabled in Phase 1 per [[decisions/2026-04-06-auto-delegation-mode-disabled-mvp]]. This is a hard product constraint: AI assists, never acts autonomously.

## Onboarding Flow

New landlords are redirected to a 5-step wizard (`/onboarding`) before accessing the dashboard. The wizard collects:
- Risk appetite and delegation mode
- Property and unit details
- Tenant contacts
- Preferred vendors
- Max auto-approve threshold

## Related

- [[decisions/2026-04-06-landlord-decision-profile-separate-table]] — data model for landlord preferences
- [[decisions/2026-04-06-onboarding-redirect-gated-wizard]] — onboarding wizard routing
- [[decisions/2026-04-06-auto-delegation-mode-disabled-mvp]] — why full automation is deferred
- [[decisions/2026-04-01-mvp-scope-core-four]] — the four features built around landlord pain points
- [[concepts/the-core-four]] — Gatekeeper, Estimator, Matchmaker, Ledger

---
type: decision
tags: [product, mvp, scope]
created: 2026-04-01
updated: 2026-04-01
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# MVP Scope: "The Core Four"

## Decision

Define the MVP as four integrated features: **Gatekeeper** (AI triage + troubleshooting), **Estimator** (vision + cost estimate), **Matchmaker** (vendor dispatch + work orders), and **Ledger** (spend vs. rent dashboard).

## Rationale

This consolidation merges AI Maintenance Intake, Vendor Suggestion, and Tenant Communication into a coherent product story. "The Core Four" is memorable for sales and design discussions. Rent reminders are deferred to Phase 2 to keep MVP scope manageable. Each feature maps to a distinct landlord pain point: missing a gas leak, guessing repair costs, finding a vendor, and tracking spend.

## Consequences

- Rent reminders are Phase 2, not MVP.
- All four features must ship together for the MVP to have a coherent value proposition.
- The "Gatekeeper" is the entry point — accuracy here makes or breaks trust in the rest of the system.

## Related

- [[project/ux-plan-intake-mvp]] — UX plan for the AI Maintenance Intake (Gatekeeper) feature
- [[project/system-architecture]] — system architecture overview

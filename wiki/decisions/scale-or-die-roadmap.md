---
type: decision
tags: [strategy, roadmap, growth, product]
created: 2026-04-01
updated: 2026-04-01
source_ids: []
confidence: high
status: active
source_migration: .claude/plans/Liz and Noel - Scale or Die Roadmap.md
---

# Scale or Die Roadmap

## Decision

Pursue a "hands-free yield machine for landlords" go-to-market strategy structured as four sequential phases (Arena → Foundation → Vision & Dispatch → Pocket Manager), with Noel as product architect and Liz as growth engine.

## Rationale

The framing draws on a Hormozi-style "Grand Slam Offer" structure: deliver undeniable value (95%+ accurate Gatekeeper) before scaling distribution. The division of labor — Noel builds, Liz sells and verifies — prevents both "cool tool with no users" and "sold promise with no product." The phased roadmap aligns product milestones with go-to-market checkpoints:

- **Phase 0 (Arena):** Prove the AI brain works. Recruit 10 design partners with real maintenance logs.
- **Phase 1 (Foundation):** Move from proof-of-concept to a real platform. Backend, auth, vendor list.
- **Phase 2 (Vision & Dispatch):** Ship Estimator (photo → cost estimate) and Matchmaker (vendor dispatch). The "wow" feature.
- **Phase 3 (Pocket Manager):** React Native mobile app, Ledger dashboard, paid subscription launch.

The "Grand Slam Metric" is 95% Gatekeeper accuracy against human baseline — if that's true, the rest of the business is "just math."

## Consequences

- Liz is a co-owner of growth, not just a product owner — she owns vendor outreach, beta user management, and subscription setup.
- The Arena (LLM comparison tool) is Phase 0 infrastructure, not a product feature.
- Design partners (Beta 10) provide real maintenance logs to validate classification accuracy before launch.
- Mobile (React Native/Expo) is explicitly Phase 3, not MVP scope.

## Related

- [[decisions/2026-04-01-mvp-scope-core-four]] — MVP product scope derived from this strategic framing
- [[decisions/2026-04-08-plan-all-roadmap-features]] — detailed feature planning that operationalizes this roadmap
- [[project/system-architecture]] — technical architecture built to support this vision

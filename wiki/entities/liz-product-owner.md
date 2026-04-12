---
type: entity
tags: [product-owner, feedback, planning, stakeholder]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Liz (Product Owner)

Liz is the human product owner of the Liz platform. She reviews deployed software, provides product feedback that drives ticket-driven features, and is one of the three audiences the wiki is explicitly designed to serve. Her name is shared with the product, which is intentional — she is building her own AI property manager.

## What Liz Cares About

- **Outcome over feature**: The product sells free time and zero headaches, not software. The value proposition is "10 hours back per week" not "AI maintenance intake." This framing is documented in `intake/readme.md`.
- **Adoption risk over legal risk**: The biggest product risk is a UI that takes more than 2 minutes to set up. Landlords quit. This is the North Star constraint on UX decisions.
- **North Star Metric**: Time from tenant complaint to vendor dispatched. Manual: 4 hours. Liz target: 4 minutes.
- **Landlord autonomy**: The AI adapts to each landlord's risk tolerance and decision style, not a one-size-fits-all agent (from `inbox/liz msg.md`).

## How She Reviews Work

Liz reviews deployed Phase 1 software and generates product feedback that becomes ticket-driven features. Her April 2026 review of deployed onboarding and dashboard generated four new Phase 1 work streams — onboarding UX refinements, property-centric dashboard, lease/document management, and utility integration — per [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]].

These were later consolidated into a single feature (`P1-Tkt-001-mvp-ux-overhaul`) per [[decisions/2026-04-08-consolidate-feedback-p1-tkt-001]]. Direct product owner feedback on deployed software is treated as the highest-signal product input.

## What She Needs from the Wiki

The wiki was adopted specifically to give Liz a self-serve surface per [[decisions/2026-04-12-adopt-llm-wiki-pattern]]. She reads:

| Page | Purpose |
|------|---------|
| `for-liz.md` | Plain-language project status — what's been built, what's next |
| `qa-queue.md` | Items ready for her to test, with links to testing guides |
| Chat app (Streamlit) | Conversational Q&A backed by wiki search via qmd |

She does not read technical pages (`entities/`, `decisions/`, `project/`) — those are developer-facing. The plain-language boundary is enforced by [[project/workflow/qmd-search]] conventions.

## Naming Convention Influence

When Liz requests changes to an existing phase, those tickets use the `Tkt` naming convention (e.g., `P1-Tkt-001`). This signals reactive work from product feedback rather than pre-planned roadmap items per [[decisions/2026-04-08-tkt-naming-convention]].

## Voice Sample

From `inbox/liz msg.md` — Liz's own framing of the product architecture:
> "We're not building one generic agent — we're building an agent that adapts to each landlord's risk tolerance and decision style. That's the differentiator."

## Related

- [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]] — her feedback generated 4 new Phase 1 features
- [[decisions/2026-04-08-tkt-naming-convention]] — naming convention for ticket-driven features from her reviews
- [[decisions/2026-04-12-adopt-llm-wiki-pattern]] — wiki adopted to give her a self-serve project surface
- [[decisions/2026-04-01-mvp-scope-core-four]] — MVP scope reflects her product vision

---
type: concept
tags: [maintenance, ai, classification, urgency, safety]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Urgency Triage

Urgency triage is Liz's system for classifying tenant-submitted maintenance requests into three urgency levels: `emergency`, `medium`, and `low`. The level determines response target, notification behavior, and whether the request surfaces at the top of the landlord dashboard.

Urgency is assigned by the [[concepts/the-core-four]] Gatekeeper alongside a [[concepts/maintenance-category-taxonomy]] label. Both are stored in the [[concepts/intake-json-schema]] under `ai_output.urgency`.

---

## The Three Levels

| Level | Criteria | Response Target | Dashboard behavior |
|-------|----------|----------------|--------------------|
| `emergency` | Safety hazard, habitability threat, active damage | Immediate (< 2 hours) | Emergency alert banner; always sorted to top |
| `medium` | Broken appliance, persistent leak, HVAC malfunction, pest infestation | 24–48 hours | Standard queue, visible urgency badge |
| `low` | Cosmetic damage, minor inconvenience, routine maintenance | 1–2 weeks | Standard queue, lowest priority |

---

## Emergency Criteria

A request is `emergency` when it meets any of the following:

- **Safety hazard**: fire risk (exposed wiring, sparking outlets, overloaded extension cords — see [[sources/intake-sample-07-electrical-unsafe-adapter]]), gas leak, carbon monoxide risk
- **Habitability**: sewage overflow or sewer line failure rendering the unit uninhabitable (see [[sources/intake-sample-01-plumbing-sewer]]), no heat in winter, black mold in HVAC with health symptoms
- **Structural failure**: ceiling collapse or imminent structural failure (see [[sources/intake-sample-10-structural-ceiling-caved]]), balcony railing failure
- **Active damage**: burst pipe with ongoing water damage, roof leak in rain

The four canonical emergency samples from the intake dataset: `sample_01` (sewer line), `sample_07` (electrical fire hazard), `sample_10` (ceiling collapse), and `sample_04` (HVAC black mold).

---

## Medium Criteria

A request is `medium` when there is significant inconvenience or risk of escalation but no immediate safety threat:

- HVAC malfunction (no heat in moderate weather, AC out in non-extreme heat)
- Persistent dripping or slow leak not yet causing active flooding
- Pest infestation (cockroaches, rats) — ongoing problem but not an acute crisis
- Broken major appliance (refrigerator, washer/dryer, stove)
- Building-wide issues from a neighboring unit (e.g., roaches from a vacant apartment)

---

## Low Criteria

A request is `low` when the issue is cosmetic, minor, or routine:

- Cosmetic damage: paint peeling, carpet stains, scuffed walls
- Minor inconvenience: slow drain (no overflow), dripping faucet, broken door hinge
- Routine maintenance: filter replacement, mailbox damage, intercom issues
- Non-safety appliance issues: ice maker broken, range hood noise

---

## Edge Cases and Escalation Rules

- **Mold + health symptoms**: Starts at `medium` (structural/hvac mold). Escalates to `emergency` if tenant reports coughing, respiratory issues, or children/elderly occupants.
- **"No hot water"**: `emergency` in winter (habitability risk), `medium` in summer.
- **Ambiguous threat**: When the [[concepts/confidence-scoring]] is below threshold and urgency is unclear, default to the higher level (over-classify rather than under-classify).
- **Repeated reports**: A prior unresolved ticket for the same issue increases urgency. The [[concepts/the-core-four]] Gatekeeper does not yet check history automatically — this is a Phase 2 enhancement.
- **Pest**: Cockroaches and rats are `medium` by default; a building-wide infestation from a vacant unit may escalate to `emergency` given health code implications.

---

## Related

- [[concepts/maintenance-category-taxonomy]] — the category assigned alongside urgency
- [[concepts/intake-json-schema]] — where urgency lives in the data model
- [[concepts/the-core-four]] — Gatekeeper feature that performs triage
- [[concepts/confidence-scoring]] — how confidence affects triage review routing
- [[project/ux-plan-intake-mvp]] — dashboard UI behavior for each urgency level

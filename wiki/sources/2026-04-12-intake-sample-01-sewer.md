---
type: source
raw_path: raw/2026-04-12-intake-sample-01-sewer.json
raw_type: transcript
source_url: https://www.reddit.com/r/mildlyinfuriating/comments/131qsdr/landlord_said_there_wasnt_an_issue_i_hired/
ingested_by: /ingest 2026-04-12
tags: [intake-sample, plumbing, emergency, landlord-dismissal, real-world]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Intake Sample 01 — Rusted Sewer Line (r/mildlyinfuriating, 2023-04-27)

A labeled intake sample sourced from a Reddit post on r/mildlyinfuriating. It pairs a tenant maintenance message with four photos and a hand-curated `ai_output` that Liz's AI intake is expected to produce. The case is one of the cleanest real-world illustrations of the exact failure mode Liz exists to prevent: a landlord dismissing a genuine emergency.

## Summary

- A tenant reports a months-long sewage smell inside and outside their unit.
- Landlord **initially told them there was no issue**.
- Tenant hires their own plumber, who finds the main sewer line rusted out and clogged with toilet paper / paper towel.
- Landlord ends up paying for hotel accommodation; the unit is effectively uninhabitable pending sewer line replacement and interior rebuild.
- The labeled AI output classifies this as `category: plumbing`, `urgency: emergency`, with a confidence of `0.97`.

## Verbatim quotes

> "It's been smelling like poop in my room and outside for months so I contacted my landlord about it. He said there wasn't an issue and so I went and got a plumber to come take a look at it. Main sewer line has rusted out and looks like clogged from toilet paper and most likely paper towel. Am now staying in a hotel paid for by landlord."

Labeled AI recommended action:

> "Dispatch emergency plumber immediately. Main sewer line has rusted out and is clogged. Unit is uninhabitable due to sewage smell — arrange temporary hotel accommodation for tenant. Walls and floors in affected room will need to be ripped out and replaced after sewer line repair."

## Relevance to Liz

- **Failure mode catalogued**: landlord-dismissal-of-real-emergency. This is the archetypal scenario Liz's AI intake is designed to short-circuit — a 0.97-confidence emergency classification would force the landlord to at least acknowledge the issue instead of denying it.
- **Photos matter**: the four photos accompanying the message are load-bearing for the severity assessment. Text-only classifiers would under-rate this; the vision capability is what makes it a 0.97 rather than a 0.70.
- **Downstream cost signal**: when the AI output recommends hotel accommodation and demolition, we're effectively modeling cost-of-inaction. This isn't yet surfaced to the landlord in the MVP dashboard — potential Phase 2 feature.
- **Category cleanliness**: unambiguous `plumbing / emergency` — a good gold-standard sample for urgency-triage regression tests.

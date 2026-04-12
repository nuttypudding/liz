---
type: concept
tags: [ai, classification, confidence, review-routing]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: medium
---

# Confidence Scoring

Confidence scoring is the mechanism by which Liz's AI signals how certain it is about a classification decision. Every call to the [[concepts/the-core-four]] Gatekeeper produces a `confidence_score` float (0.0–1.0) alongside the category and urgency labels. The score is stored in `ai_output.confidence_score` of the [[concepts/intake-json-schema]].

---

## How Confidence Emerges

The Claude API (Sonnet) is prompted to classify the tenant message and, optionally, attached photos, then return a structured JSON response that includes a numeric confidence score. The score is self-reported by the model — it reflects the model's internal assessment of how well the input maps to one of the seven categories and three urgency levels.

Factors that drive higher confidence:
- Explicit keywords matching a category (e.g., "sewer", "cockroaches", "no heat")
- Clear visual evidence in uploaded photos confirming the text description
- Unambiguous urgency signals ("ceiling collapsed", "sparking outlet", "gas smell")

Factors that drive lower confidence:
- Vague or low-detail tenant messages (e.g., "something is wrong with my apartment")
- Conflicting signals — message suggests `plumbing` but photo shows an electrical issue
- Edge cases that span two categories (e.g., water heater electrical failure)
- Novel issue types not well-represented in the training distribution

---

## Observed Score Range

Based on the 10 initial labeled intake samples, scores for clear-cut cases range from **0.91 to 0.99**. The lowest (0.91, `sample_02`) is a genuinely ambiguous case — multiple duct-tape repairs with no single dominant category signal. Emergency cases consistently score 0.94–0.99. See [[sources/intake-sample-01-plumbing-sewer]], [[sources/intake-sample-07-electrical-unsafe-adapter]], and [[sources/intake-sample-10-structural-ceiling-caved]] for high-confidence emergency examples.

---

## Thresholds

The MVP uses a single review threshold:

| Threshold | Behavior |
|-----------|----------|
| `score >= 0.70` | Auto-proceed — classification shown to landlord as-is |
| `score < 0.70` | Flag for landlord review — classification is displayed with a warning |

A confidence score below 0.70 does not block the ticket; it adds a "Review recommended" indicator in the landlord UI so the landlord can verify the AI's category and urgency before approving any action. The landlord can override both fields.

> **Note**: The 0.70 threshold is the initial MVP value. It is not yet validated against real production data. Monitor false-negative rate (emergencies classified as medium/low with score > 0.70) post-launch and recalibrate. The [[wiki/WIKI.md]] synthesis example suggests 0.75 may be more conservative and appropriate if over-classification becomes a complaint.

---

---

## Implementation Status

The confidence score is currently specified in the [[concepts/intake-json-schema]] and present in all intake samples. The review-routing logic (flagging below 0.70) is described in the UX plan (see [[project/ux-plan-intake-mvp]] — confidence bar shown as `role="progressbar"` in the `AIClassificationCard`). Actual model prompting implementation lives in `apps/web/app/api/intake/route.ts` and `apps/web/app/api/classify/route.ts`.

---

## Related

- [[concepts/intake-json-schema]] — where `confidence_score` lives in the data model
- [[concepts/urgency-triage]] — the urgency classification whose certainty this measures
- [[concepts/maintenance-category-taxonomy]] — the category classification whose certainty this measures
- [[concepts/the-core-four]] — the Gatekeeper feature that produces confidence scores
- [[project/ux-plan-intake-mvp]] — confidence display in the landlord request detail UI

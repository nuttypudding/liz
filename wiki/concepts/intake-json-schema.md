---
type: concept
tags: [maintenance, ai, schema, api, data-model]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Intake JSON Schema

The `ai_maintenance_intake` object is the canonical data structure for a single maintenance request flowing through Liz's [[concepts/the-core-four]] Gatekeeper. It captures the tenant's input, the AI's output, and the source attribution in one envelope.

---

## Schema Diagram

```
ai_maintenance_intake
├── input
│   ├── tenant_message          (string)  — free-text description from tenant
│   └── photo_upload[]          (array)   — zero or more attached photos
│       ├── file_url            (string)  — path or URL to uploaded file
│       ├── file_type           (string)  — MIME type, e.g. "image/jpeg"
│       └── uploaded_at         (string)  — ISO 8601 timestamp
├── ai_output
│   ├── category                (enum)    — see maintenance-category-taxonomy
│   ├── urgency                 (enum)    — see urgency-triage
│   ├── recommended_action      (string)  — plain-language landlord action
│   └── confidence_score        (float)   — 0.0–1.0, see confidence-scoring
└── source
    ├── origin                  (string)  — e.g. "reddit", "tenant-portal"
    ├── subreddit               (string)  — if origin is reddit
    ├── post_url                (string)  — source URL
    └── post_title              (string)  — source post title
```

---

## Key Field Notes

- `input.tenant_message`: Free-text from tenant; primary classification signal when no photos present.
- `input.photo_upload[]`: Up to 5 photos per request (Supabase Storage paths). Vision AI reads these in the Estimator flow.
- `ai_output.category`: One of seven values — see [[concepts/maintenance-category-taxonomy]].
- `ai_output.urgency`: One of three values — see [[concepts/urgency-triage]].
- `ai_output.recommended_action`: Plain-language landlord action written by Claude Sonnet; editable before work order approval.
- `ai_output.confidence_score`: 0.0–1.0 certainty signal — see [[concepts/confidence-scoring]]. Observed range 0.91–0.99 for clear-cut samples.
- `source`: Read-only attribution (origin, subreddit, URL). Does not affect classification.

---

## API Integration

The `ai_maintenance_intake` object is produced by `POST /api/intake` (Next.js MVP) or `POST /api/v1/gatekeeper/triage` (FastAPI). See [[project/system-architecture]] for endpoint mapping. Persisted to the `maintenance_tickets` table in Supabase with `ai_output` fields as structured columns.

---

## Related

- [[concepts/maintenance-category-taxonomy]] — valid values for `category`
- [[concepts/urgency-triage]] — valid values for `urgency` and their criteria
- [[concepts/confidence-scoring]] — how `confidence_score` is generated and used
- [[concepts/the-core-four]] — the Gatekeeper feature that populates `ai_output`
- [[project/system-architecture]] — API endpoint and database mapping

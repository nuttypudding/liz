---
type: decision
tags: [ux, dashboard, routing, product]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Property-Centric Dashboard with URL-Based State (P1-005)

## Decision

The selected property is stored as a `?property={id}` search parameter for bookmarkability. Desktop uses house icons; mobile uses a Select dropdown.

## Rationale

URL-based state makes the selected property bookmarkable and shareable, which is valuable for landlords who manage multiple properties and want to link directly to a specific property's dashboard. Storing state in the URL also makes the back button work correctly. Desktop and mobile use different affordances (icons vs. dropdown) appropriate to their available space.

## Consequences

- Dashboard layout must read `?property` from the URL on load and default to the first property if absent.
- Property switching updates the URL without a full page reload (use `router.push` with shallow routing).
- Server-side rendering can pre-render the correct property view using the search param.

## Related

- [[project/endpoints]] — dashboard route structure
- [[decisions/2026-04-08-product-owner-feedback-four-new-p1-features]] — feedback session this came from

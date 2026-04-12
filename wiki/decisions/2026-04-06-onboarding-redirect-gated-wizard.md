---
type: decision
tags: [onboarding, ux, routing]
created: 2026-04-06
updated: 2026-04-06
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Onboarding as Redirect-Gated Wizard

## Decision

New landlords are redirected to `/onboarding` if no profile exists in `landlord_profiles`. After completing onboarding, they are redirected to the dashboard. The Settings page allows editing profile data at any time.

## Rationale

A redirect gate ensures every landlord completes setup before accessing the main dashboard, preventing a broken first-run experience. The wizard pattern is familiar and provides progressive disclosure of required information. Allowing editing from Settings avoids users feeling trapped by onboarding choices.

## Consequences

- Middleware (or a layout check) must detect missing profile and issue the redirect.
- The onboarding route must be accessible without a complete profile but protected from unauthenticated users.
- Settings and onboarding share the same form logic/components.

## Related

- [[decisions/2026-04-06-landlord-decision-profile-separate-table]] — profile existence drives the redirect check
- [[project/endpoints]] — `/onboarding` route details

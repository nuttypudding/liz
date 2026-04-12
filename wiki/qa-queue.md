# QA Queue

_Initial hand-crafted snapshot. `/wiki-qa-refresh` (task 266) will regenerate this from tickets + feature state going forward._

This is the short list of what needs your attention in testing. If nothing is here, you're caught up.

## Ready for you to test

_(nothing currently in `testing` status — all shipped features have moved on to `deployed`)_

## Live in production — sanity-check when you can

### Onboarding "failed to create property" fix — LIVE
**What it does**: When a new landlord signs up and immediately tries to create a property, it now works. Previously it errored because the system didn't yet know their role.
**Try it at**: the production URL (see [[project/endpoints]])
**Testing guide**: [[project/testing-guides/01-auth-onboarding]]
**What to watch for**: sign up with a brand-new Google account, confirm you land on onboarding and can create your first property without error.
**Ticket**: T-017

### Rent Reminders — LIVE
**What it does**: Automatic reminders to tenants when rent is due, with overdue alerts. You can tune notification preferences.
**Testing guide**: No dedicated guide yet — follow [[project/testing-guides/08-settings]] for the notification preferences.
**What to watch for**: check that reminders fire at the right time, that overdue alerts appear, and that you can turn specific notifications off.
**Ticket**: T-004 (tracking document for the feature)

## Recently closed (no action needed)

- **T-001 — AI Maintenance Intake MVP** — the Core Four. Closed after final sign-off.
- **T-002 — Landlord Onboarding & Decision Profile** — risk appetite, delegation, vendor preferences. Closed.

## Still in development (not ready to test)

- **LLM Wiki (this!)** — being built right now. You'll know it's ready when this page refreshes itself.

---
_Generated 2026-04-12 by task 261 (hand-crafted initial). Regenerate by running `/wiki-qa-refresh`._

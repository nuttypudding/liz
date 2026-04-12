---
type: decision
tags: [notifications, email, sms]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Resend + Twilio for Notifications (P2-002)

## Decision

Use Resend for email notifications and Twilio for SMS notifications. Both are wrapped in a `NotificationService` abstraction.

## Rationale

Resend has first-class Next.js/React integration via `react-email`, making it easy to create well-designed transactional emails. Twilio is the standard for programmatic SMS. Wrapping both in a `NotificationService` abstraction allows swapping providers without changing call sites, and enables future addition of push notifications. The abstraction also makes testing easier — mock the service, not individual provider SDKs.

## Consequences

- Twilio and Resend credentials required in production environment variables.
- `NotificationService` is the only interface for sending notifications — direct provider calls are not permitted.
- Phase 1 vendor dispatch remains DB-only; this enables vendor SMS notifications in Phase 2.

## Related

- [[decisions/2026-04-01-vendor-dispatch-db-only-mvp]] — Phase 1 deferral this decision resolves in Phase 2
- [[project/system-architecture]] — notification flow in system architecture

---
type: decision
tags: [payments, stripe, billing]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# Stripe Connect Express for Payments (P2-004)

## Decision

Use Stripe Connect Express for landlord KYC and payouts. Use Stripe Checkout (hosted) for tenant payments. Vendor payments are manual entry for Phase 2.

## Rationale

Stripe Connect Express handles landlord identity verification (KYC) and payout routing without Liz storing sensitive financial data. Stripe Checkout's hosted payment page means zero PCI scope for Liz — Stripe handles card data entirely. Vendor payments being manual in Phase 2 reduces scope while still allowing the financial ledger to function.

## Consequences

- Landlords must complete Stripe Connect onboarding before receiving tenant payments.
- Tenant payment flow redirects to Stripe Checkout and returns to Liz on completion.
- Liz never stores card numbers, bank account details, or SSNs.
- Vendor payment automation is deferred to Phase 3.

## Related

- [[project/stripe-setup-guide]] — Stripe configuration and setup
- [[decisions/2026-04-01-mvp-scope-core-four]] — payments are Phase 2, not MVP

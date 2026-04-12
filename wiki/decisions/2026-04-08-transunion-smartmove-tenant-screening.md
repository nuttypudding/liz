---
type: decision
tags: [tenant-screening, compliance, privacy]
created: 2026-04-08
updated: 2026-04-08
source_ids: []
confidence: high
status: accepted
source_migration: plan/DECISION_LOG.md
---

# TransUnion SmartMove for Tenant Screening (P3-002)

## Decision

Use TransUnion SmartMove for tenant screening. SSNs never touch Liz servers — applicants verify on TransUnion's hosted page. A provider abstraction allows swapping screening vendors.

## Rationale

TransUnion SmartMove is a well-established tenant screening service with a hosted verification flow that keeps PII (SSNs, financial data) off Liz's servers entirely. This eliminates significant compliance and security risk. A four-layer fair housing defense is built into the integration to reduce discrimination liability. The provider abstraction future-proofs against vendor changes.

## Consequences

- Liz never stores or processes SSNs or credit report data.
- Applicants are redirected to TransUnion's hosted page for identity and financial verification.
- Fair housing compliance is a first-class concern in the screening workflow design.
- Switching screening vendors requires only updating the provider implementation, not call sites.

## Related

- [[decisions/2026-04-01-mvp-scope-core-four]] — screening is Phase 3, not MVP

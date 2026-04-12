---
type: concept
tags: [product, mvp, architecture, ai, features]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# The Core Four

The Core Four is the product architecture for Liz's MVP: four integrated AI features that together cover the full maintenance lifecycle for a small landlord. The name is intentionally memorable for sales and design discussions.

See the origin of this framing in [[decisions/2026-04-01-mvp-scope-core-four]].

---

## The Four Features

### 1. Gatekeeper (Triage + Communication)

The entry point for every maintenance request. Applies a "Need vs. Want" filter to incoming tenant messages, sends automated troubleshooting guides before creating a ticket (e.g., "Check the breaker" for power issues), and classifies issues by [[concepts/maintenance-category-taxonomy]] and [[concepts/urgency-triage]]. Kills ~20% of tickets before they reach the landlord.

- **AI role**: Text + vision classification via Claude API (Sonnet)
- **Key output**: Classified ticket with category, urgency, confidence score
- **Trust lever**: Accuracy here makes or breaks landlord trust in the rest of the system

### 2. Estimator (Vision + Cost Estimate)

Tenant submits a photo → Vision AI analyzes damage → AI generates a rough market cost estimate. Gives landlords a price anchor before they call a vendor, reducing the risk of being overcharged.

- **AI role**: Vision model analyzes damage severity and scope
- **Key output**: Cost range + repair scope narrative
- **Phase**: Part of MVP; cost estimate is approximate, not a binding quote

### 3. Matchmaker (Vendor Dispatch + Work Orders)

Turns the AI classification into a draft work order and dispatches it to the right vendor with one landlord click. Drafts the work order text (vendor name, photo, address, tenant contact) — the landlord reviews and hits "Approve & Send."

- **AI role**: Work order drafting (Claude Sonnet for writing quality)
- **Key output**: Approved work order sent to vendor
- **Gate**: Landlord approval required before any message leaves the system
- **Tier**: Locked to Tier 2+ in the subscription model

### 4. Ledger (Operations Dashboard)

Monitors "Money In vs. Money Out" — maintenance spend vs. monthly rent per property in real time. Shows landlords their ROI and flags properties with abnormally high maintenance costs.

- **AI role**: Data aggregation and anomaly detection
- **Key output**: Spend vs. rent chart per property
- **North star**: Time from tenant complaint to vendor dispatched (target: 4 minutes vs. 4 hours manual)

---

## Why Four, Not One

Each feature maps to a distinct landlord pain point: missing a gas leak (Gatekeeper), guessing repair costs (Estimator), finding a reliable vendor (Matchmaker), and tracking spend (Ledger). All four ship together — the MVP has no coherent value proposition if any one is missing.

---

## Related

- [[decisions/2026-04-01-mvp-scope-core-four]] — decision record adopting this scope
- [[project/system-architecture]] — per-feature model assignments and API structure
- [[project/ux-plan-intake-mvp]] — UX plan for the Gatekeeper (AI Maintenance Intake) feature
- [[concepts/urgency-triage]] — classification model used by the Gatekeeper
- [[concepts/maintenance-category-taxonomy]] — the seven categories the Gatekeeper assigns

# Vision update — Landlord Shield (2026-04-30)

Source: comment from Liz, 2026-04-30. Preserved verbatim below; an "interpreted" section follows for typos and one truncated header. This document captures product direction for downstream feature plans — it is not yet a binding architectural decision.

---

## Verbatim (as received)

> Project Iteration: The "Landlord Shield" AI Assistant
>
> The Pitch: We are moving away from a "chatbot" and toward a "Compliance-Assisted Triage" system. The goal is to act as a secretary, not a conversation partner, focusing on asset history and California's 2026 legal standards.
>
> 1. Threaded Issue Architecture (The "Case" System)
> - Concept: No more endless text scrolls. Every interaction must be grouped into a Case (e.g., "Unit 4—Leaking Sink").
> - Branching Logic: If a tenant reports a problem (e.g., "The hood stopped working"), the AI scans the property history. If it finds a match, it links this to the previous case as a "Recurring Issue."
> - UI Requirement: A central chat window for the active thread, but with a "Case Resolved/Closed" button to archive the topic and stop the active "Compliance Clock."
>
> 2. The California Habitability Dashboard (AB 628)
> - The Law: As of January 1, 2026, CA AB 628 updated Civil Code §1941.1 to mandate that landlords provide and maiigerators. These are now legally essential for habitability.
> - Feature: Urgency Overrides. If the AI detects keywords like "stove," "fridge," "leaks," or "sparks," it must immediately flag the thread.
> - UI Requirement: A sidebar showing "Compliance Timers." For habitability issues, a countdown starts (e.g., "24-hour window for emergency" or "30-day window for recall/repair"). If a timer hits yellow or red, the landlord gets a high-priority push notification.
>
> 3. Human-in-the-Loop Safeguard (AB 316 & ADMT)
> - The Law: CA AB 316 (2026) prohibits landlords from using an "autonomous AI" defense for harm. Additionally, new ADMT (Automated Decision-Making Technology) rules require transparency when AI makes "significant decisions" in housing.
> - Feature: Draft-First Approval. The AI drafts the technical advice or repair suggestion, but it stays in a Yellow Draft State invisible to the tenant.
> - UI Requirement: Two clear buttons for the landlord: [Approve & Send] or [Override/Take Over]. This ensures the landlord is always the "human-in-the-loop" for legal liability.
>
> 4. The "Institutional Memory" Vault
> - Concept: Use the app's history to save money on unnecessary service calls.
> - Feature: Predictive Diagnostics. When a tenant reports a failure, the AI pulls the appliance purchase date and past fixes.
> - UI Requirement (Right Pane): A "Property Health Card" that pops up.
>   - Example: "Range Hood (5 yrs old). Last fix: 2021—Main switch reset. Suggesting reset to tenant now?"
>   - Result: One-tap button to send a "How-to-Reset" photo or video from the 2021 records.
>
> 5. One-Tap "Vendor Dispatch"
> - Concept: Close the loop between triage and repair.
> - Feature: If the troubleshooting fails, the AI should offer a button to "Dispatch Vendor."
> - UI Requirement: A button that pulls from the landlord's saved contact list (e.g., "Call Joe the Plumber"). Clicking it generates a PDF work order containing the tenant's contne Layout)
>   1. Left Pane: Risk Profile & Compliance Clocks (Visualizing legal deadlines).
>   2. Center Pane: The "Issue" Thread (Active chat + Yellow Drafted AI suggestions).
>   3. Right Pane: Asset History Vault (Purchase dates, past repair photos, and original raw text logs for the "Audit Trail").

---

## Interpreted (typos / truncations resolved)

Two passages in the verbatim text appear to be truncated mid-word. Reasonable readings:

- **§2 (AB 628):** "mandate that landlords provide and ma**iigerators**" → likely "mandate that landlords provide and **maintain refrigerators**" (consistent with the rest of that section calling refrigerators "legally essential for habitability"). **Verify the actual statute** before relying on this — refrigerators were a notable AB 628 addition in late-2025 reporting, but the canonical text of CA Civil Code §1941.1 should be the authority for any UI copy or compliance timer thresholds.
- **§5 (Vendor Dispatch + start of §6 layout):** "containing the tenant's con**tne Layout)**" → reads as "containing the tenant's con**tact info. Final UI Note (The Three-Pane Layout)**". The numbered layout list is then the start of §6, not a continuation of §5. **Confirm with Liz** whether §6 was meant to be its own top-level section (e.g., "6. Three-Pane Layout") before encoding it that way in feature plans.

## Implications for the agent platform (P4-001)

The current platform plan (`features/planned/P4-001-agent-platform/`) was built around a stateless triage *call* — single request in, structured `gatekeeper` + `classification` out. The Landlord Shield framing turns that single call into one node in a **stateful, case-scoped, time-aware** workflow. Specifically:

| Landlord Shield ask | Maps to current plan | Net new work |
|---|---|---|
| Case threading + recurring-issue detection (§1) | — | New: stateful "case" entity (db schema), retrieval over property history, recurrence-link inference |
| Compliance timers / AB 628 keyword overrides (§2) | Adjacent to `urgency` field already in POC-3 | New: `compliance_clock` field on classification (start time, deadline, statute reference). Net-new dashboard + push surface in Liz |
| Draft-first approval / AB 316 HITL (§3) | — | New: response state machine — `draft` (landlord-only) → `approved` → `sent`. The agent must never directly message the tenant. POC-7 (Liz integration) is the natural insertion point — wire `client.ts` to Liz's existing approval queue rather than auto-send |
| Institutional Memory Vault (§4) | — | New: per-property history retrieval; appliance metadata schema. Closer to a *second agent* (`property-history` retrieval agent) than a feature of `maintenance-triage`. The framework-per-agent decision in `plan/DECISION_LOG.md` (2026-04-28) supports this cleanly |
| One-tap vendor dispatch (§5) | Adjacent to the `vendor-dispatch` agent named in earlier scoping (`agents.brightstep.ai/vendor-dispatch/v1/run` in P4-001 README) | Validates that the second agent is `vendor-dispatch`, not something else. Confirms the work-order PDF generation belongs to that agent, not `maintenance-triage` |
| Three-pane layout (§6) | — | UI redesign. Liz has its own existing UI (`archive/apps/web`) — open question whether Landlord Shield is a redesign of that surface or a new surface |

## Open questions for Liz

1. **AB 628 wording** — the verbatim text trails off mid-word ("maiigerators"). What's the authoritative statute reference + appliance scope? Refrigerators only, or refrigerators + something else?
2. **AB 316 / ADMT scope** — does "significant decision" include the gatekeeper's `self_resolvable: true` recommendation (since it deflects a service request), or only repair-cost decisions?
3. **Compliance timer triggers** — should the timer start when the tenant *messages*, when the landlord *opens* the case, or when the agent *classifies* the urgency? Each gives a different legal posture.
4. **Three-pane layout** — replacing Liz's current single-column UI, or a new dashboard surface? If replacing, what happens to the existing intake form?
5. **Case-recurrence threshold** — what makes "The hood stopped working" *the same* case as a 2021 hood reset? Same appliance? Same category? Same room? Same complaint text? This is a real algorithmic choice with false-positive cost.

## Status

- **Captured:** 2026-04-30, this file.
- **Decision log entry:** see `plan/DECISION_LOG.md` for the cross-link.
- **Not yet:** feature plans, roadmap updates, or POC scope changes. Those follow once Liz answers the open questions above.

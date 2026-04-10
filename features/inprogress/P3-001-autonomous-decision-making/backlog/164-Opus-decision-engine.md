---
id: 164
title: Decision engine — confidence scoring + safety rails evaluation via Claude API
tier: Opus
depends_on: [162, 163]
feature: P3-001-autonomous-decision-making
---

# 164 — Decision Engine — Confidence Scoring & Safety Rails

## Objective
Build the core autonomous decision-making engine that evaluates confidence scores, checks safety constraints, and generates reasoning via Claude API.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The decision engine is the AI brain of autonomy. It computes a weighted confidence score from historical data, rule-based analysis, cost estimation, vendor availability, and category rules. It evaluates safety rails (spending caps, exclusions, emergency handling). If all checks pass and confidence exceeds the threshold, it recommends dispatch. Otherwise, it escalates.

## Implementation

1. Create module: `apps/web/lib/autonomy/engine.ts`
2. Export async function: `evaluateAutonomousDecision(request, settings, landlord)`
   - Input: maintenance request, autonomy settings, landlord context
   - Output: { decision_type, confidence_score, reasoning, factors, safety_checks, actions_taken }
3. Implement confidence scoring (weighted average):
   - **Historical factor (35%)**: analyze past similar requests (same category/urgency). Success rate of previous dispatches (0-1 score).
   - **Rules factor (25%)**: rule-based confidence based on category, urgency, complexity. Emergency requests get higher score (0.9+). Simple requests (electrical outlet) get 0.8+. Complex (structural damage) get 0.6.
   - **Cost factor (20%)**: estimate cost via historical data or Claude API. If within vendor's typical range, boost. If exceeds per-decision cap, reduce confidence.
   - **Vendor factor (10%)**: availability and reliability. Check preferred vendors. If vendor is available and has good track record (>0.8 success rate), boost.
   - **Category factor (10%)**: whether category is excluded. If in excluded_categories, confidence = 0. Otherwise, neutral.
4. Implement safety rails evaluation:
   - Spending cap check: sum of month's autonomous dispatches + current estimate > monthly_cap? fail.
   - Per-decision cap check: estimated cost > per_decision_cap? fail.
   - Category exclusion check: is category in excluded_categories? fail.
   - Vendor availability check: is preferred_vendors_only true and no preferred vendor available? fail.
   - Emergency escalation: if urgency='emergency' and emergency_auto_dispatch=true, override other checks and set high confidence.
   - Cost estimate required: if require_cost_estimate=true and no estimate available, escalate.
5. Call Claude API for reasoning:
   - If confidence >= threshold and safety rails pass: prompt Claude to generate concise reasoning (2-3 bullets) for auto-dispatch decision.
   - If safety rail failed: prompt Claude to generate reasoning for escalation.
   - Use structured prompt to ensure consistent format.
6. Determine decision_type:
   - If confidence >= settings.confidence_threshold and all safety rails pass: 'dispatch'
   - If emergency_auto_dispatch=true and urgency='emergency': 'dispatch'
   - Otherwise: 'escalate' (default to human review)
7. Return structured decision object with all factors, safety checks, and reasoning
8. Add error handling for Claude API timeouts/failures (default to escalate)
9. Unit tests for confidence calculation and safety rails logic

## Acceptance Criteria
1. [ ] Module created at apps/web/lib/autonomy/engine.ts
2. [ ] Confidence scoring weights sum to 100%
3. [ ] Historical factor queries past requests correctly
4. [ ] Rules factor assigns correct base scores by category
5. [ ] Cost factor estimates realistically or queries past data
6. [ ] Vendor factor checks availability and success rate
7. [ ] Category exclusion prevents dispatch
8. [ ] Spending cap checks prevent over-budget decisions
9. [ ] Per-decision cap prevents individual overspends
10. [ ] Emergency requests can bypass rules when enabled
11. [ ] Claude API call generates clear reasoning bullets
12. [ ] Claude API failures gracefully escalate decisions
13. [ ] safety_checks object correctly reports all checks
14. [ ] Decision type correctly determined (dispatch vs escalate)
15. [ ] Function handles missing data gracefully

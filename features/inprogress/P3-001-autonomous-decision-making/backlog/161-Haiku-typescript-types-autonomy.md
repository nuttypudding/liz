---
id: 161
title: TypeScript types — AutonomySettings, AutonomousDecision, MonthlyReportData, etc.
tier: Haiku
depends_on: []
feature: P3-001-autonomous-decision-making
---

# 161 — TypeScript Types — Autonomy Module

## Objective
Define all TypeScript interfaces for the autonomy feature, matching the database schema and API contracts.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

Create a centralized types file to ensure type safety across the autonomy engine, API routes, and UI components.

## Implementation

1. Create file: `apps/web/lib/types/autonomy.ts`
2. Define the following interfaces:
   - `AutonomySettings`: confidence_threshold, per_decision_cap, monthly_cap, excluded_categories, preferred_vendors_only, require_cost_estimate, emergency_auto_dispatch, rollback_window_hours, paused, timestamps
   - `ConfidenceFactors`: breakdown of historical_weight, rules_weight, cost_weight, vendor_weight, category_weight (all 0-1)
   - `SafetyChecks`: spending_cap_ok, category_excluded, vendor_available, emergency_eligible (all boolean)
   - `AutonomousDecision`: id, request_id, landlord_id, decision_type, confidence_score, reasoning, factors, safety_checks, actions_taken, status, reviewed_at, review_action, review_notes, timestamps
   - `DecisionType`: 'dispatch' | 'escalate' | 'hold'
   - `DecisionStatus`: 'pending_review' | 'confirmed' | 'overridden'
   - `AutonomyMonthlyStats`: landlord_id, month, total_decisions, auto_dispatched, escalated, overridden, total_spend, trust_score, timestamps
   - `AutonomyMonthlyReport`: month, stats, spending_by_category, decisions_by_category, confidence_distribution, ai_recommendation, timestamps
   - `ConfidenceDistribution`: buckets (0-0.5, 0.5-0.7, 0.7-0.85, 0.85-1.0) with counts
3. Export all types from a barrel export `index.ts`
4. Add JSDoc comments to each type for clarity
5. Run `tsc --noEmit` to verify type compilation

## Acceptance Criteria
1. [ ] File created at apps/web/lib/types/autonomy.ts
2. [ ] All required interfaces defined
3. [ ] Interfaces match database schema
4. [ ] Optional fields marked correctly
5. [ ] Union types for enums (decision_type, status)
6. [ ] JSONB fields typed as nested objects
7. [ ] JSDoc comments present
8. [ ] No TypeScript compilation errors

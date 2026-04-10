---
id: 159
title: Database migration — autonomous_decisions table
tier: Haiku
depends_on: [158]
feature: P3-001-autonomous-decision-making
---

# 159 — Database Migration — Autonomous Decisions Table

## Objective
Create the `autonomous_decisions` table to record all AI-generated autonomous decisions, their confidence scores, reasoning, and review outcomes.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

This table is the core audit trail for autonomous decision-making. Each decision record captures the AI's reasoning, safety checks passed, actions taken, and any landlord reviews/overrides.

## Implementation

1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_create_autonomous_decisions.sql`
2. Define the `autonomous_decisions` table with columns:
   - `id` (UUID, primary key)
   - `request_id` (UUID, foreign key to maintenance_requests, not null)
   - `landlord_id` (UUID, foreign key to users, not null)
   - `decision_type` (text: 'dispatch', 'escalate', 'hold', not null)
   - `confidence_score` (numeric 0-1, not null)
   - `reasoning` (text, not null)
   - `factors` (JSONB, not null) — weights applied to each confidence factor
   - `safety_checks` (JSONB, not null) — results of spending cap, category exclusion, vendor checks
   - `actions_taken` (JSONB, not null) — list of actions (vendor dispatch, notifications, etc.)
   - `status` (text: 'pending_review', 'confirmed', 'overridden', default 'pending_review')
   - `reviewed_at` (timestamp, nullable)
   - `review_action` (text: 'confirmed', 'overridden', nullable)
   - `review_notes` (text, nullable)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
3. Add indexes on `landlord_id`, `request_id`, `status`, `created_at`
4. Enable RLS policy: landlords can only view/edit their own decisions
5. Run migration locally and verify schema

## Acceptance Criteria
1. [ ] Migration file created and named correctly
2. [ ] Table exists with all required columns and data types
3. [ ] JSONB columns correctly store nested data
4. [ ] Indexes created for query performance
5. [ ] RLS policies restrict access to own decisions
6. [ ] Foreign key relationships validate
7. [ ] Migration runs without errors
8. [ ] Schema verified in Supabase Studio

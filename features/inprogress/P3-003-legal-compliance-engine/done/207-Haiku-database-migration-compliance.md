---
id: 207
title: Database migration — jurisdiction_rules, property_jurisdictions, compliance_notices, compliance_audit_log, compliance_checklist_items tables
tier: Haiku
depends_on: []
feature: P3-003-legal-compliance-engine
---

# 207 — Database Migration — Compliance Tables

## Objective
Create five database tables to support the legal compliance engine: `jurisdiction_rules`, `property_jurisdictions`, `compliance_notices`, `compliance_audit_log`, and `compliance_checklist_items`. Each table is indexed appropriately for lookups and filtering.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

The compliance engine relies on a structured schema to store jurisdiction-specific legal rules, property jurisdiction assignments, generated notices, audit trails, and compliance checklists.

## Implementation

1. **jurisdiction_rules table**
   - `id` (uuid, primary key)
   - `state_code` (varchar(2), not null) — e.g., "CA", "NY", "TX"
   - `city` (varchar(255), nullable) — specific city or NULL for statewide rules
   - `topic` (varchar(100), not null) — e.g., "notice_period_entry", "security_deposit_limit", "habitability_requirement"
   - `rule_text` (text, not null) — full text of the rule
   - `statute_citation` (varchar(255), not null) — e.g., "CA Civil Code § 1950.7"
   - `last_verified_at` (timestamp, not null) — when rule was last checked for accuracy
   - `details` (jsonb, nullable) — flexible JSON for rule-specific data (min/max amounts, duration in days, exemptions, etc.)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
   - **Indexes**: `(state_code, city, topic)`, `(state_code)`, `(topic)`

2. **property_jurisdictions table**
   - `id` (uuid, primary key)
   - `property_id` (uuid, not null, foreign key → properties.id)
   - `state_code` (varchar(2), not null)
   - `city` (varchar(255), not null)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
   - **Indexes**: `(property_id)`, `(state_code, city)`
   - **Constraints**: unique `(property_id)` (one jurisdiction per property)

3. **compliance_notices table**
   - `id` (uuid, primary key)
   - `property_id` (uuid, not null, foreign key → properties.id)
   - `landlord_id` (uuid, not null, foreign key → users.id)
   - `type` (varchar(50), not null) — e.g., "entry", "lease_violation", "rent_increase", "eviction"
   - `status` (varchar(50), not null) — e.g., "draft", "generated", "sent", "acknowledged"
   - `content` (text, not null) — the full notice text
   - `jurisdiction_data` (jsonb, nullable) — snapshot of jurisdiction rules used to generate notice
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
   - `sent_at` (timestamp, nullable)
   - **Indexes**: `(property_id)`, `(landlord_id)`, `(status)`, `(created_at)`

4. **compliance_audit_log table**
   - `id` (uuid, primary key)
   - `property_id` (uuid, not null, foreign key → properties.id)
   - `landlord_id` (uuid, not null, foreign key → users.id)
   - `action_type` (varchar(100), not null) — e.g., "rule_reviewed", "notice_generated", "notice_sent", "checklist_item_completed"
   - `details` (jsonb, nullable) — action-specific context
   - `timestamp` (timestamp, not null, default now())
   - **Indexes**: `(property_id)`, `(landlord_id)`, `(action_type)`, `(timestamp)`

5. **compliance_checklist_items table**
   - `id` (uuid, primary key)
   - `property_id` (uuid, not null, foreign key → properties.id)
   - `topic` (varchar(100), not null) — corresponds to jurisdiction_rules.topic
   - `description` (text, not null) — human-readable description of the checklist item
   - `completed` (boolean, default false)
   - `completed_at` (timestamp, nullable)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
   - **Indexes**: `(property_id)`, `(completed)`, `(topic)`

## Acceptance Criteria
1. [ ] All five tables created in Supabase with exact schema as specified
2. [ ] All indexes created for optimal query performance
3. [ ] Foreign key constraints enforced with appropriate cascading
4. [ ] RLS policies applied (authenticated users can only view/edit their own properties)
5. [ ] Migration file created and applied successfully
6. [ ] No TypeScript errors when generating types via `supabase gen types`

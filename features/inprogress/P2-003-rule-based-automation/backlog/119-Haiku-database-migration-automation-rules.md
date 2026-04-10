---
id: 119
title: Database migration — automation_rules + rule_execution_logs tables + maintenance_requests columns
tier: Haiku
depends_on: []
feature: P2-003-rule-based-automation
---

# 119 — Database Migration: Automation Rules Tables

## Objective
Create Supabase migration for automation_rules and rule_execution_logs tables, and add tracking columns to maintenance_requests.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

This is the foundational database layer for rule-based automation. Rules are evaluated against maintenance requests and must track execution history.

## Implementation

1. Create a new Supabase migration file in `supabase/migrations/`:
   - Filename: `{TIMESTAMP}_create_automation_rules_and_logs.sql`

2. Define `automation_rules` table:
   ```sql
   CREATE TABLE automation_rules (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     landlord_id UUID NOT NULL REFERENCES auth.users(id),
     name VARCHAR(255) NOT NULL,
     description TEXT,
     enabled BOOLEAN DEFAULT true,
     priority INT DEFAULT 0,
     conditions JSONB NOT NULL,
     actions JSONB NOT NULL,
     times_matched INT DEFAULT 0,
     last_matched_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(landlord_id, name)
   );
   ```

3. Define `rule_execution_logs` table:
   ```sql
   CREATE TABLE rule_execution_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     request_id UUID NOT NULL REFERENCES maintenance_requests(id),
     rule_id UUID NOT NULL REFERENCES automation_rules(id),
     landlord_id UUID NOT NULL REFERENCES auth.users(id),
     matched BOOLEAN DEFAULT false,
     conditions_result JSONB,
     actions_executed JSONB,
     evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. Alter `maintenance_requests` table:
   ```sql
   ALTER TABLE maintenance_requests
   ADD COLUMN auto_approved BOOLEAN DEFAULT false,
   ADD COLUMN auto_approved_by_rule_id UUID REFERENCES automation_rules(id),
   ADD COLUMN rules_evaluated_at TIMESTAMP WITH TIME ZONE;
   ```

5. Create indexes for query performance:
   - `automation_rules(landlord_id, enabled, priority)`
   - `rule_execution_logs(request_id)`
   - `rule_execution_logs(landlord_id, evaluated_at)`

6. Enable RLS policies:
   - Users can see/modify only their own rules
   - Logs visible to rule owner

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] Migration file created and named correctly
3. [ ] automation_rules table has all required columns
4. [ ] rule_execution_logs table has all required columns
5. [ ] maintenance_requests columns added (auto_approved, auto_approved_by_rule_id, rules_evaluated_at)
6. [ ] Indexes created for performance
7. [ ] RLS policies enabled and tested
8. [ ] Run `supabase db push` locally and confirm tables exist
9. [ ] Verify foreign key constraints
10. [ ] Document schema in `docs/database-schema.md` (if it exists)

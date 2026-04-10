-- Add tenant_availability column to scheduling_tasks
-- Stores array of { date: string, dayPart: 'morning'|'afternoon'|'evening' } objects
ALTER TABLE scheduling_tasks
  ADD COLUMN IF NOT EXISTS tenant_availability JSONB;

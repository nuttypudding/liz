-- Allow rule_execution_logs to record decision_profile fallback entries (no rule)
ALTER TABLE rule_execution_logs
  ALTER COLUMN rule_id DROP NOT NULL,
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'rule';

-- Index to filter by source type
CREATE INDEX rule_execution_logs_source_type_idx
  ON rule_execution_logs(source_type);

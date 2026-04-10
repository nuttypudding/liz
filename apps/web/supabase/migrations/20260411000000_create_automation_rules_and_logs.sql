-- Create automation_rules table
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id TEXT NOT NULL,  -- Clerk user ID
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

-- Create rule_execution_logs table
CREATE TABLE rule_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id),
  rule_id UUID NOT NULL REFERENCES automation_rules(id),
  landlord_id TEXT NOT NULL,  -- Clerk user ID
  matched BOOLEAN DEFAULT false,
  conditions_result JSONB,
  actions_executed JSONB,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alter maintenance_requests table to add rule-related columns
ALTER TABLE maintenance_requests
ADD COLUMN auto_approved BOOLEAN DEFAULT false,
ADD COLUMN auto_approved_by_rule_id UUID REFERENCES automation_rules(id),
ADD COLUMN rules_evaluated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for query performance
CREATE INDEX automation_rules_landlord_enabled_priority_idx
  ON automation_rules(landlord_id, enabled, priority);

CREATE INDEX rule_execution_logs_request_id_idx
  ON rule_execution_logs(request_id);

CREATE INDEX rule_execution_logs_landlord_evaluated_at_idx
  ON rule_execution_logs(landlord_id, evaluated_at);

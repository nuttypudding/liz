-- reschedule_tokens: stores secure one-time-use tokens for vendor reschedule links
-- Tokens are included in vendor emails as /reschedule/[token] and expire after 72 hours.
-- request_count tracks rate limiting (max 5 per 24 hours per token).
CREATE TABLE IF NOT EXISTS reschedule_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES scheduling_tasks(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  last_request_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reschedule_tokens_token ON reschedule_tokens(token);
CREATE INDEX idx_reschedule_tokens_task_id ON reschedule_tokens(task_id);

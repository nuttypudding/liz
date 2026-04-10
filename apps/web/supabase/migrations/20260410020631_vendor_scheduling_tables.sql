-- Create enum types for vendor scheduling
CREATE TYPE scheduling_status AS ENUM (
  'pending',
  'awaiting_tenant',
  'awaiting_vendor',
  'confirmed',
  'rescheduling',
  'completed'
);

CREATE TYPE recipient_type AS ENUM (
  'landlord',
  'tenant',
  'vendor'
);

CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'in_app'
);

CREATE TYPE notification_status AS ENUM (
  'sent',
  'failed',
  'bounced'
);

-- vendor_availability_rules table
CREATE TABLE IF NOT EXISTS vendor_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- scheduling_tasks table
CREATE TABLE IF NOT EXISTS scheduling_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status scheduling_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  reschedule_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type recipient_type NOT NULL,
  recipient_id UUID NOT NULL,
  channel notification_channel NOT NULL,
  template VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status notification_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for query performance
CREATE INDEX idx_vendor_availability_rules_vendor_id ON vendor_availability_rules(vendor_id);
CREATE INDEX idx_vendor_availability_rules_day_of_week ON vendor_availability_rules(day_of_week);
CREATE INDEX idx_scheduling_tasks_request_id ON scheduling_tasks(request_id);
CREATE INDEX idx_scheduling_tasks_vendor_id ON scheduling_tasks(vendor_id);
CREATE INDEX idx_scheduling_tasks_tenant_id ON scheduling_tasks(tenant_id);
CREATE INDEX idx_scheduling_tasks_status ON scheduling_tasks(status);
CREATE INDEX idx_notification_log_recipient_id ON notification_log(recipient_id);
CREATE INDEX idx_notification_log_channel ON notification_log(channel);
CREATE INDEX idx_notification_log_status ON notification_log(status);

export type VendorAvailabilityRules = {
  id: string;
  vendor_id: string;
  day_of_week: number; // 0-6 (Sun-Sat)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type SchedulingTask = {
  id: string;
  request_id: string;
  vendor_id: string;
  tenant_id: string;
  status: "pending" | "awaiting_tenant" | "awaiting_vendor" | "confirmed" | "rescheduling" | "completed";
  scheduled_date: string | null; // YYYY-MM-DD
  scheduled_time_start: string | null; // HH:MM:SS
  scheduled_time_end: string | null; // HH:MM:SS
  reschedule_count: number;
  created_at: string;
  updated_at: string;
};

export type NotificationLog = {
  id: string;
  recipient_type: "landlord" | "tenant" | "vendor";
  recipient_id: string;
  channel: "email" | "sms" | "in_app";
  template: string;
  sent_at: string;
  status: "sent" | "failed" | "bounced";
  created_at: string;
};

export type TenantAvailabilityWindow = {
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
};

export type ScheduleSlotSuggestion = {
  start: string; // ISO 8601
  end: string; // ISO 8601
  reason: string;
  score: number; // 0-1
};

export type NotificationType = "schedule-confirmed" | "availability-prompt" | "reschedule-request";

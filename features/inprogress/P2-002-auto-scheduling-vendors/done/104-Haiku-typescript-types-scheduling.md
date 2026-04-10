---
id: 104
title: TypeScript types — VendorAvailabilityRules, SchedulingTask, notification types
tier: Haiku
depends_on: [102]
feature: P2-002-auto-scheduling-vendors
---

# 104 — TypeScript types for Scheduling

## Objective

Define TypeScript interfaces and types for vendor availability rules, scheduling tasks, and notification data used throughout the scheduling feature.

## Context

Task 102 created the Supabase tables. This task creates the corresponding TypeScript types for use in API routes, components, and the notification service.

Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation

Create `apps/web/lib/types/scheduling.ts`:

```typescript
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
```

Update `apps/web/lib/types/index.ts` to export scheduling types.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] All types defined in `lib/types/scheduling.ts`
3. [ ] Types exported from `lib/types/index.ts`
4. [ ] Types match Supabase schema from task 102
5. [ ] No TypeScript errors when importing

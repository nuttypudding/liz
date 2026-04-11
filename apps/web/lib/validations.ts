import { z } from "zod";

export const setRoleSchema = z.object({
  role: z.enum(["landlord", "tenant"]),
});

export const intakeSchema = z.object({
  tenant_message: z.string().min(1).max(5000),
  photo_paths: z.array(z.string()).max(5).optional(),
  property_id: z.string().uuid(),
});

export const propertySchema = z.object({
  name: z.string().min(1).max(200),
  address_line1: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  postal_code: z.string().min(1).max(20),
  apt_or_unit_no: z.string().max(50).optional().or(z.literal("")),
  unit_count: z.number().int().min(1).max(999).default(1),
  monthly_rent: z.number().min(0).optional(),
  rent_due_day: z.number().int().min(1).max(28).default(1),
});

export const tenantSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  unit_number: z.string().max(20).optional().or(z.literal("")),
  move_in_date: z.string().optional().or(z.literal("")),
  lease_type: z.enum(["yearly", "month_to_month"]).optional().nullable(),
  lease_start_date: z.string().optional().nullable(),
  lease_end_date: z.string().optional().nullable(),
  rent_due_day: z.number().int().min(1).max(28).optional().nullable(),
  custom_fields: z.record(z.string(), z.string()).optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  specialty: z.enum([
    "plumbing",
    "electrical",
    "hvac",
    "structural",
    "pest",
    "appliance",
    "general",
  ]),
  notes: z.string().max(1000).optional().or(z.literal("")),
  priority_rank: z.number().int().min(0).optional(),
  custom_fields: z.record(z.string(), z.string()).optional(),
});

export const dispatchSchema = z.object({
  vendor_id: z.string().uuid(),
  work_order_text: z.string().min(1).max(5000),
});

export const landlordProfileSchema = z.object({
  risk_appetite: z.enum(["cost_first", "speed_first", "balanced"]),
  delegation_mode: z.enum(["manual", "assist", "auto"]),
  max_auto_approve: z.number().min(0).max(10000),
  notify_emergencies: z.boolean(),
  notify_all_requests: z.boolean(),
  onboarding_completed: z.boolean(),
});

export const documentUploadSchema = z.object({
  property_id: z.string().uuid(),
  document_type: z.enum([
    "lease",
    "receipt",
    "inspection_move_in",
    "inspection_move_out",
    "property_photo",
    "other",
  ]),
  tenant_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const rentPaymentSchema = z.object({
  amount: z.number().positive(),
  paid_at: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  tenant_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const tenantAvailabilitySubmitSchema = z.object({
  taskId: z.string().uuid(),
  availableSlots: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
      dayPart: z.enum(["morning", "afternoon", "evening"]),
    })
  ).min(1),
});

export const confirmScheduleSchema = z.object({
  taskId: z.string().uuid(),
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "selectedDate must be YYYY-MM-DD"),
  selectedTimeStart: z.string().regex(/^\d{2}:\d{2}$/, "selectedTimeStart must be HH:MM"),
  selectedTimeEnd: z.string().regex(/^\d{2}:\d{2}$/, "selectedTimeEnd must be HH:MM"),
});

export const rescheduleSchema = z.object({
  reason: z.string().max(1000).optional(),
  requestedBy: z.enum(["vendor", "tenant", "landlord"]),
});

export const createSchedulingTaskSchema = z.object({
  request_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
});

export const utilityUpsertSchema = z.object({
  utilities: z.array(z.object({
    utility_type: z.enum([
      "electric",
      "gas",
      "water_sewer",
      "trash_recycling",
      "internet_cable",
      "hoa",
    ]),
    provider_name: z.string().max(200).nullable(),
    provider_phone: z.string().max(30).nullable(),
    provider_website: z.string().max(500).nullable(),
    account_number: z.string().max(100).nullable(),
    confirmation_status: z.enum(["ai_suggested", "confirmed", "not_applicable"]),
    notes: z.string().max(500).nullable(),
  })),
});

export const autonomySettingsUpdateSchema = z.object({
  confidence_threshold: z.number().min(0).max(1).optional(),
  per_decision_cap: z.number().positive().optional(),
  monthly_cap: z.number().positive().optional(),
  excluded_categories: z
    .array(
      z.enum([
        "plumbing",
        "electrical",
        "hvac",
        "structural",
        "pest",
        "appliance",
        "general",
      ])
    )
    .optional(),
  preferred_vendors_only: z.boolean().optional(),
  require_cost_estimate: z.boolean().optional(),
  emergency_auto_dispatch: z.boolean().optional(),
  rollback_window_hours: z.number().int().min(0).optional(),
  paused: z.boolean().optional(),
});

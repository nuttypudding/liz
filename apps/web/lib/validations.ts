import { z } from "zod";

export const intakeSchema = z.object({
  tenant_message: z.string().min(1).max(5000),
  photo_paths: z.array(z.string()).max(5).optional(),
  property_id: z.string().uuid(),
});

export const propertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  unit_count: z.number().int().min(1).max(999).default(1),
  monthly_rent: z.number().min(0).optional(),
});

export const tenantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  unit_number: z.string().max(20).optional().or(z.literal("")),
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

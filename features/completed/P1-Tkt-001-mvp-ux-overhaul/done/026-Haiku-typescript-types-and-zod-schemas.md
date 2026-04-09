---
id: 026
title: Update TypeScript types and Zod schemas for all new fields
tier: Haiku
depends_on: [25]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 026 — Update TypeScript Types and Zod Schemas

## Objective

Update `apps/web/lib/types.ts` and `apps/web/lib/validations.ts` with all new interfaces, types, and schemas needed across all 4 work streams.

## Context

All 4 sub-plans define new types and schema extensions. Batching them here avoids repeated edits to the same files. See Data Model sections in each sub-plan under `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/`.

## Implementation

### 1. Update `apps/web/lib/types.ts`

**Extend existing interfaces:**

```typescript
// Property — add fields
export interface Property {
  // ... existing fields ...
  apt_or_unit_no: string | null;
  rent_due_day: number;
}

// Tenant — add lease + custom fields
export interface Tenant {
  // ... existing fields ...
  move_in_date: string | null;
  lease_type: 'yearly' | 'month_to_month' | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  rent_due_day: number | null;
  custom_fields: Record<string, string> | null;
}

// Vendor — add custom fields
export interface Vendor {
  // ... existing fields ...
  custom_fields: Record<string, string> | null;
}
```

**Add new interfaces:**

```typescript
export interface RentPayment {
  id: string;
  property_id: string;
  tenant_id: string | null;
  amount: number;
  paid_at: string;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
}

export interface RentStatus {
  property_id: string;
  monthly_rent: number;
  rent_due_day: number;
  last_paid_at: string | null;
  last_paid_amount: number | null;
  is_overdue: boolean;
  days_overdue: number;
}

export type DocumentType =
  | 'lease'
  | 'receipt'
  | 'inspection_move_in'
  | 'inspection_move_out'
  | 'property_photo'
  | 'other';

export interface Document {
  id: string;
  property_id: string;
  tenant_id: string | null;
  landlord_id: string;
  document_type: DocumentType;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description: string | null;
  uploaded_at: string;
  tenant_name?: string | null;
}

export type UtilityType =
  | 'electric'
  | 'gas'
  | 'water_sewer'
  | 'trash_recycling'
  | 'internet_cable'
  | 'hoa';

export type ConfirmationStatus = 'ai_suggested' | 'confirmed' | 'not_applicable';
export type AiConfidence = 'high' | 'medium' | 'low';

export interface PropertyUtility {
  id: string;
  property_id: string;
  utility_type: UtilityType;
  provider_name: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  account_number: string | null;
  confirmation_status: ConfirmationStatus;
  ai_confidence: AiConfidence | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UtilitySuggestion {
  utility_type: UtilityType;
  provider_name: string | null;
  provider_phone: string | null;
  provider_website: string | null;
  confidence: AiConfidence;
}

export interface UtilityUpsertPayload {
  utilities: Array<{
    utility_type: UtilityType;
    provider_name: string | null;
    provider_phone: string | null;
    provider_website: string | null;
    account_number: string | null;
    confirmation_status: ConfirmationStatus;
    notes: string | null;
  }>;
}
```

### 2. Update `apps/web/lib/validations.ts`

**Update existing schemas:**

```typescript
export const propertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  apt_or_unit_no: z.string().max(50).optional().or(z.literal("")),
  unit_count: z.number().int().min(1).max(999).default(1),
  monthly_rent: z.number().min(0).optional(),
});

export const tenantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  move_in_date: z.string().optional().or(z.literal("")),
  lease_type: z.enum(["yearly", "month_to_month"]).optional().nullable(),
  lease_start_date: z.string().optional().nullable(),
  lease_end_date: z.string().optional().nullable(),
  rent_due_day: z.number().int().min(1).max(31).optional().nullable(),
  custom_fields: z.record(z.string()).optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  specialty: z.enum([
    "plumbing", "electrical", "hvac", "structural",
    "pest", "appliance", "general",
  ]),
  notes: z.string().max(1000).optional().or(z.literal("")),
  priority_rank: z.number().int().min(0).optional(),
  custom_fields: z.record(z.string()).optional(),
});
```

**Add new schemas:**

```typescript
export const documentUploadSchema = z.object({
  property_id: z.string().uuid(),
  document_type: z.enum([
    "lease", "receipt", "inspection_move_in",
    "inspection_move_out", "property_photo", "other",
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

export const utilityUpsertSchema = z.object({
  utilities: z.array(z.object({
    utility_type: z.enum([
      "electric", "gas", "water_sewer",
      "trash_recycling", "internet_cable", "hoa",
    ]),
    provider_name: z.string().max(200).nullable(),
    provider_phone: z.string().max(30).nullable(),
    provider_website: z.string().max(500).nullable(),
    account_number: z.string().max(100).nullable(),
    confirmation_status: z.enum(["ai_suggested", "confirmed", "not_applicable"]),
    notes: z.string().max(500).nullable(),
  })),
});
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] `Property` interface extended with `apt_or_unit_no`, `rent_due_day`
3. [ ] `Tenant` interface extended with all lease fields + `custom_fields`
4. [ ] `Vendor` interface extended with `custom_fields`
5. [ ] New interfaces: `RentPayment`, `RentStatus`, `Document`, `PropertyUtility`, `UtilitySuggestion`, `UtilityUpsertPayload`
6. [ ] New type aliases: `DocumentType`, `UtilityType`, `ConfirmationStatus`, `AiConfidence`
7. [ ] Existing Zod schemas updated: `propertySchema`, `tenantSchema`, `vendorSchema`
8. [ ] New Zod schemas: `documentUploadSchema`, `rentPaymentSchema`, `utilityUpsertSchema`
9. [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)

---
id: 143
title: Payment periods generation — on-demand function to create/update periods
tier: Sonnet
depends_on: [138]
feature: P2-004-payment-integration
---

# 143 — Payment periods generation — on-demand function to create/update periods

## Objective
Create a utility function that generates payment_periods for all active tenants in a property. This function is called on-demand when:
- Tenant visits /pay page (generates current + next month)
- Landlord visits payments dashboard (generates current month + next 3 months for planning)

Prevent duplicates (check existing periods before inserting).

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Payment periods are not auto-generated. Instead, they are created on-demand:
- **For tenants**: When they visit /pay, generate current month's period if missing
- **For landlords**: When they view the dashboard, generate upcoming periods for forecasting

The function must:
1. Accept property_id and optional month/year range
2. Fetch active tenants (lease active on target month)
3. Check for existing periods (avoid duplicates)
4. Create new periods with rent_amount from lease or property default
5. Return created/existing period count

## Implementation

**File**: `apps/web/lib/payments.ts` (create new file or add to existing)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export interface PaymentPeriodGenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Generate payment periods for a property and date range.
 * Prevents duplicates by checking existing periods.
 *
 * @param propertyId - Property UUID
 * @param startMonth - Month (1-12), defaults to current month
 * @param startYear - Year, defaults to current year
 * @param monthCount - Number of months to generate, defaults to 1
 */
export async function generatePaymentPeriods(
  propertyId: string,
  startMonth: number = new Date().getMonth() + 1,
  startYear: number = new Date().getFullYear(),
  monthCount: number = 1
): Promise<PaymentPeriodGenerationResult> {
  const result: PaymentPeriodGenerationResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Get property with default rent amount
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, default_rent_amount')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      result.errors.push('Property not found');
      return result;
    }

    // Generate periods for each month in range
    for (let i = 0; i < monthCount; i++) {
      let month = startMonth + i;
      let year = startYear;

      // Handle month overflow
      if (month > 12) {
        month = month % 12;
        year += 1;
      }

      // Get active tenants for this property (lease overlaps target month)
      const targetDate = new Date(year, month - 1, 1);
      const { data: tenants, error: tenantsError } = await supabase
        .from('leases')
        .select('tenant_id, monthly_rent')
        .eq('property_id', propertyId)
        .lte('start_date', targetDate.toISOString().split('T')[0])
        .or(`end_date.is.null,end_date.gte.${targetDate.toISOString().split('T')[0]}`);

      if (tenantsError) {
        result.errors.push(`Failed to fetch tenants for ${month}/${year}`);
        continue;
      }

      if (!tenants || tenants.length === 0) {
        continue;
      }

      // Create period for each active tenant
      for (const lease of tenants) {
        // Check if period already exists
        const { data: existingPeriod, error: checkError } = await supabase
          .from('payment_periods')
          .select('id')
          .eq('property_id', propertyId)
          .eq('tenant_id', lease.tenant_id)
          .eq('month', month)
          .eq('year', year)
          .single();

        if (existingPeriod) {
          result.skipped += 1;
          continue;
        }

        // Calculate due date (5 days after first of month, or property custom due day)
        const dueDate = new Date(year, month - 1, 5); // Default: 5th of month
        const rentAmount = lease.monthly_rent || property.default_rent_amount;

        // Create period
        const { error: insertError } = await supabase
          .from('payment_periods')
          .insert({
            property_id: propertyId,
            tenant_id: lease.tenant_id,
            year,
            month,
            rent_amount: rentAmount,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
          });

        if (insertError) {
          result.errors.push(
            `Failed to create period for tenant ${lease.tenant_id}: ${insertError.message}`
          );
        } else {
          result.created += 1;
        }
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Generate current and next month's periods (tenant-facing).
 * Called when tenant visits /pay.
 */
export async function generateCurrentPaymentPeriod(propertyId: string, tenantId: string) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Check if current month already exists
  const { data: existingPeriod } = await supabase
    .from('payment_periods')
    .select('id')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .single();

  if (existingPeriod) {
    return existingPeriod;
  }

  // Get property and lease info
  const { data: property } = await supabase
    .from('properties')
    .select('default_rent_amount')
    .eq('id', propertyId)
    .single();

  const { data: lease } = await supabase
    .from('leases')
    .select('monthly_rent')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .single();

  const rentAmount = lease?.monthly_rent || property?.default_rent_amount || 0;

  // Create period
  const dueDate = new Date(currentYear, currentMonth - 1, 5);
  const { data: newPeriod, error } = await supabase
    .from('payment_periods')
    .insert({
      property_id: propertyId,
      tenant_id: tenantId,
      year: currentYear,
      month: currentMonth,
      rent_amount: rentAmount,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
    })
    .select()
    .single();

  return newPeriod;
}
```

## Acceptance Criteria
1. [ ] File created: `apps/web/lib/payments.ts`
2. [ ] `generatePaymentPeriods` function exports and works as documented
3. [ ] `generateCurrentPaymentPeriod` function exports and works as documented
4. [ ] Duplicate prevention: checks existing periods before inserting
5. [ ] Handles month/year overflow correctly
6. [ ] Fetches active tenants based on lease dates
7. [ ] Uses lease.monthly_rent if available, falls back to property.default_rent_amount
8. [ ] Returns PaymentPeriodGenerationResult with created, skipped, errors
9. [ ] Calculates due_date (5th of month, or property custom day)
10. [ ] No TypeScript errors
11. [ ] Functions accept correct parameters
12. [ ] Error messages are descriptive
13. [ ] Used in task 147 (tenant /pay page) and task 148 (landlord dashboard)

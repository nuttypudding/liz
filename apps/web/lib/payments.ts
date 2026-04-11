import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  const result: PaymentPeriodGenerationResult = { created: 0, skipped: 0, errors: [] };
  const supabase = createServerSupabaseClient();

  try {
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, monthly_rent, rent_due_day')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      result.errors.push('Property not found');
      return result;
    }

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id')
      .eq('property_id', propertyId);

    if (tenantsError) {
      result.errors.push('Failed to fetch tenants');
      return result;
    }

    if (!tenants || tenants.length === 0) {
      return result;
    }

    for (let i = 0; i < monthCount; i++) {
      let month = startMonth + i;
      let year = startYear;

      while (month > 12) {
        month -= 12;
        year += 1;
      }

      const dueDay = (property.rent_due_day as number | null) ?? 1;
      const dueDate = new Date(year, month - 1, dueDay);

      for (const tenant of tenants) {
        const { data: existingPeriod } = await supabase
          .from('payment_periods')
          .select('id')
          .eq('property_id', propertyId)
          .eq('tenant_id', tenant.id)
          .eq('month', month)
          .eq('year', year)
          .maybeSingle();

        if (existingPeriod) {
          result.skipped += 1;
          continue;
        }

        const { error: insertError } = await supabase
          .from('payment_periods')
          .insert({
            property_id: propertyId,
            tenant_id: tenant.id,
            year,
            month,
            rent_amount: property.monthly_rent,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
          });

        if (insertError) {
          result.errors.push(
            `Failed to create period for tenant ${tenant.id}: ${insertError.message}`
          );
        } else {
          result.created += 1;
        }
      }
    }

    return result;
  } catch (error) {
    result.errors.push(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}

/**
 * Generate current month's period for a specific tenant (tenant-facing).
 * Called when tenant visits /pay.
 */
export async function generateCurrentPaymentPeriod(propertyId: string, tenantId: string) {
  const supabase = createServerSupabaseClient();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const { data: existingPeriod } = await supabase
    .from('payment_periods')
    .select('id')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .maybeSingle();

  if (existingPeriod) {
    return existingPeriod;
  }

  const { data: property } = await supabase
    .from('properties')
    .select('monthly_rent, rent_due_day')
    .eq('id', propertyId)
    .single();

  const rentAmount = (property?.monthly_rent as number | null) ?? 0;
  const dueDay = (property?.rent_due_day as number | null) ?? 1;
  const dueDate = new Date(currentYear, currentMonth - 1, dueDay);

  const { data: newPeriod } = await supabase
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

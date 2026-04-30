---
id: 146
title: Financial summary API route — monthly P&L aggregation query
tier: Sonnet
depends_on: [138, 144, 145]
feature: P2-004-payment-integration
---

# 146 — Financial summary API route — monthly P&L aggregation query

## Objective
Create GET /api/payments/summary that returns aggregated financial data (Profit & Loss) for a given month:
- Rent expected (from payment_periods)
- Rent collected (from payments with status='completed')
- Collection rate (%)
- Maintenance/vendor costs (from vendor_payments)
- Net income

Also return PropertyFinancials breakdown (per-property summaries).

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Landlords use financial summary on the dashboard to:
- See quick P&L overview (cards on summary tab)
- Track collection rate (% of rent collected vs. owed)
- Review maintenance spending trends
- Compare performance across properties

## Implementation

**File**: `apps/web/app/api/payments/summary/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export interface PropertyFinancials {
  property_id: string;
  property_name: string;
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;
  maintenance_costs: number;
  net_income: number;
}

export interface FinancialSummary {
  month: number;
  year: number;
  rent_expected: number;
  rent_collected: number;
  collection_rate: number; // Percentage: 0-100
  maintenance_costs: number;
  vendor_payments_total: number;
  net_income: number;
  properties: PropertyFinancials[];
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const url = new URL(req.url);
    const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()));

    // Validate month
    if (month < 1 || month > 12) {
      return new Response('Invalid month (1-12)', { status: 400 });
    }

    // Get landlord's properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('landlord_id', userId);

    if (propertiesError || !properties || properties.length === 0) {
      return new Response('No properties found', { status: 404 });
    }

    const propertyIds = properties.map((p) => p.id);
    const summary: FinancialSummary = {
      month,
      year,
      rent_expected: 0,
      rent_collected: 0,
      collection_rate: 0,
      maintenance_costs: 0,
      vendor_payments_total: 0,
      net_income: 0,
      properties: [],
    };

    // Process each property
    for (const property of properties) {
      // Get expected rent for the month
      const { data: expectedRent, error: expectedError } = await supabase
        .from('payment_periods')
        .select('rent_amount')
        .eq('property_id', property.id)
        .eq('month', month)
        .eq('year', year);

      const rentExpected = expectedRent?.reduce((sum, p) => sum + (p.rent_amount || 0), 0) || 0;

      // Get collected rent (completed payments)
      const { data: collectedRent, error: collectedError } = await supabase
        .from('payments')
        .select('amount')
        .eq('property_id', property.id)
        .eq('status', 'completed')
        .gte('paid_at', `${year}-${String(month).padStart(2, '0')}-01`)
        .lt('paid_at', `${year}-${String(month + 1).padStart(2, '0')}-01`);

      const rentCollected = collectedRent?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Get vendor payments for the month
      const { data: vendorPayments, error: vendorError } = await supabase
        .from('vendor_payments')
        .select('amount')
        .eq('property_id', property.id)
        .gte('payment_date', `${year}-${String(month).padStart(2, '0')}-01`)
        .lt('payment_date', `${year}-${String(month + 1).padStart(2, '0')}-01`);

      const maintenanceCosts = vendorPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Calculate metrics
      const collectionRate = rentExpected > 0 ? (rentCollected / rentExpected) * 100 : 0;
      const netIncome = rentCollected - maintenanceCosts;

      // Add to property breakdown
      summary.properties.push({
        property_id: property.id,
        property_name: property.name,
        rent_expected: rentExpected,
        rent_collected: rentCollected,
        collection_rate: Math.round(collectionRate),
        maintenance_costs: maintenanceCosts,
        net_income: netIncome,
      });

      // Aggregate to summary
      summary.rent_expected += rentExpected;
      summary.rent_collected += rentCollected;
      summary.maintenance_costs += maintenanceCosts;
      summary.vendor_payments_total += maintenanceCosts;
    }

    // Calculate overall metrics
    summary.collection_rate =
      summary.rent_expected > 0
        ? Math.round((summary.rent_collected / summary.rent_expected) * 100)
        : 0;
    summary.net_income = summary.rent_collected - summary.maintenance_costs;

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Financial summary error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

## Acceptance Criteria
1. [ ] GET /api/payments/summary created at `apps/web/app/api/payments/summary/route.ts`
2. [ ] Route requires Clerk authentication
3. [ ] Route accepts query parameters:
   - [ ] month (1-12, defaults to current month)
   - [ ] year (defaults to current year)
4. [ ] Returns FinancialSummary object with:
   - [ ] month, year
   - [ ] rent_expected (sum of payment_periods for month)
   - [ ] rent_collected (sum of completed payments for month)
   - [ ] collection_rate (percentage, rounded)
   - [ ] maintenance_costs (sum of vendor_payments for month)
   - [ ] vendor_payments_total (same as maintenance_costs)
   - [ ] net_income (rent_collected - maintenance_costs)
5. [ ] Returns PropertyFinancials array with per-property breakdown:
   - [ ] property_id, property_name
   - [ ] rent_expected, rent_collected, collection_rate
   - [ ] maintenance_costs, net_income
6. [ ] Data includes only landlord's properties
7. [ ] Handles month overflow correctly (month 13 wraps to next year)
8. [ ] Handles months with no data (returns 0 values)
9. [ ] All monetary values are accurate (no rounding errors)
10. [ ] Collection rate is percentage (0-100)
11. [ ] No TypeScript errors
12. [ ] Unit tests (task 156) cover aggregation logic

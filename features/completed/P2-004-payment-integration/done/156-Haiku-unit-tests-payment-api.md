---
id: 156
title: Unit tests for payment API routes
tier: Haiku
depends_on: [144, 145, 146]
feature: P2-004-payment-integration
---

# 156 — Unit tests for payment API routes

## Objective
Write unit tests for the payment API routes:
- GET /api/payments (list, filtering)
- GET /api/payments/[id] (single payment)
- GET /api/payments/vendor (vendor payments list)
- POST /api/payments/vendor (create vendor payment)
- GET /api/payments/summary (financial summary)

Test both happy paths and error cases (auth, permissions, validation).

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

These tests ensure:
- RLS (Row Level Security) is enforced
- Filtering works correctly
- Pagination works
- Authorization checks prevent unauthorized access
- Error responses are correct (404, 403, 400)

## Implementation

**File**: `apps/web/__tests__/api/payments.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase and Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

describe('Payments API Routes', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/payments', () => {
    it('should return tenant payments when user is tenant', async () => {
      const tenantId = 'tenant-123';
      vi.mocked(auth).mockResolvedValue({ userId: tenantId } as any);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Test execution would go here
      // For this example, we're showing the structure
    });

    it('should return landlord properties when user is landlord', async () => {
      const landlordId = 'landlord-123';
      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      // Test that landlord sees only their properties' payments
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);
      // Should return 401 Unauthorized
    });

    it('should support pagination (limit, offset)', async () => {
      // Test with limit=10, offset=0
      // Verify range() is called with correct values
    });

    it('should filter by status', async () => {
      // Test filter by status=completed
      // Verify eq('status', 'completed') is called
    });

    it('should filter by property_id', async () => {
      // Test filter by property_id
      // Verify eq('property_id', propertyId) is called for landlords
    });
  });

  describe('GET /api/payments/[id]', () => {
    it('should return payment detail for payment owner (tenant)', async () => {
      const paymentId = 'payment-123';
      const tenantId = 'tenant-123';

      vi.mocked(auth).mockResolvedValue({ userId: tenantId } as any);

      // Payment belongs to tenant
      // Should return 200 with payment details
    });

    it('should return payment detail for landlord of property', async () => {
      const paymentId = 'payment-123';
      const landlordId = 'landlord-123';

      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      // Landlord owns the property
      // Should return 200 with payment details
    });

    it('should return 403 when user is not owner or landlord', async () => {
      const paymentId = 'payment-123';
      const otherId = 'other-user-123';

      vi.mocked(auth).mockResolvedValue({ userId: otherId } as any);

      // Neither owner nor landlord
      // Should return 403 Forbidden
    });

    it('should return 404 when payment not found', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user-123' } as any);

      // Payment doesn't exist
      // Should return 404 Not Found
    });

    it('should include Stripe details if available', async () => {
      // Should fetch Stripe charge details
      // Should include payment_method, last4, receipt_url in response
    });
  });

  describe('GET /api/payments/vendor', () => {
    it('should return vendor payments for landlord', async () => {
      const landlordId = 'landlord-123';
      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      // Should return list of vendor payments for landlord's properties
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      // Should return 401 Unauthorized
    });

    it('should filter by property_id', async () => {
      // Test filter by property_id parameter
      // Verify only that property's vendor payments are returned
    });

    it('should support pagination', async () => {
      // Test limit and offset parameters
    });

    it('should prevent tenant from viewing vendor payments', async () => {
      const tenantId = 'tenant-123';
      vi.mocked(auth).mockResolvedValue({ userId: tenantId } as any);

      // Should return empty list or 403
    });
  });

  describe('POST /api/payments/vendor', () => {
    it('should create vendor payment for landlord', async () => {
      const landlordId = 'landlord-123';
      const propertyId = 'property-123';

      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      const payload = {
        property_id: propertyId,
        vendor_name: 'John Plumbing',
        amount: 500.00,
        payment_date: '2024-04-10',
        description: 'Fixed kitchen pipe',
      };

      // Should return 201 Created with vendor payment record
    });

    it('should return 403 when landlord does not own property', async () => {
      const landlordId = 'landlord-123';
      const otherPropertyId = 'other-property-123';

      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      const payload = {
        property_id: otherPropertyId,
        vendor_name: 'John Plumbing',
        amount: 500.00,
        payment_date: '2024-04-10',
      };

      // Should return 403 Forbidden
    });

    it('should return 400 for missing required fields', async () => {
      const landlordId = 'landlord-123';
      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      const payload = {
        vendor_name: 'John Plumbing',
        // missing property_id, amount, payment_date
      };

      // Should return 400 Bad Request
    });

    it('should link to maintenance request if provided', async () => {
      const payload = {
        property_id: 'property-123',
        vendor_name: 'John Plumbing',
        amount: 500.00,
        payment_date: '2024-04-10',
        request_id: 'request-123',
      };

      // Should verify request belongs to same property
      // Should include request_id in vendor payment record
    });

    it('should return 404 if linked request not found', async () => {
      const payload = {
        property_id: 'property-123',
        vendor_name: 'John Plumbing',
        amount: 500.00,
        payment_date: '2024-04-10',
        request_id: 'nonexistent-request',
      };

      // Should return 404 Not Found
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const payload = {
        property_id: 'property-123',
        vendor_name: 'John Plumbing',
        amount: 500.00,
        payment_date: '2024-04-10',
      };

      // Should return 401 Unauthorized
    });
  });

  describe('GET /api/payments/summary', () => {
    it('should return financial summary for given month', async () => {
      const landlordId = 'landlord-123';
      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      // Should return FinancialSummary with:
      // rent_expected, rent_collected, collection_rate, maintenance_costs, net_income
    });

    it('should include per-property breakdown', async () => {
      // Should return PropertyFinancials array with each property's metrics
    });

    it('should calculate collection rate correctly', async () => {
      // collection_rate = (rent_collected / rent_expected) * 100
      // Should be 0 if rent_expected is 0
    });

    it('should aggregate across all landlord properties', async () => {
      // Should sum rent_expected, rent_collected, maintenance_costs across all properties
    });

    it('should support month and year parameters', async () => {
      // Test with ?month=5&year=2024
      // Should return summary for May 2024
    });

    it('should return 404 if landlord has no properties', async () => {
      const landlordId = 'landlord-no-props';
      vi.mocked(auth).mockResolvedValue({ userId: landlordId } as any);

      // Should return 404 or empty summary
    });

    it('should validate month (1-12)', async () => {
      // month=0 or month=13 should return 400 Bad Request
    });

    it('should calculate net_income correctly', async () => {
      // net_income = rent_collected - maintenance_costs
    });

    it('should handle months with no payment data', async () => {
      // If no payments recorded, should return 0 values (not errors)
    });
  });

  describe('Authorization & RLS', () => {
    it('should never expose payments from other landlords', async () => {
      // Landlord A should not see Landlord B's payments
    });

    it('should never expose payments for other tenants', async () => {
      // Tenant A should not see Tenant B's payments
    });

    it('should enforce property ownership check', async () => {
      // Landlord should only see data for properties they own
    });

    it('should handle deleted/archived properties', async () => {
      // Should not return data for deleted properties
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on database connection error', async () => {
      // Simulate Supabase error
      // Should return 500 Internal Server Error
    });

    it('should return 500 on Stripe API error', async () => {
      // Simulate Stripe.charges.retrieve failure
      // Should still return payment data, just without Stripe details
    });

    it('should log errors to console for debugging', async () => {
      // Should call console.error with error details
    });
  });
});
```

## Acceptance Criteria
1. [ ] Test file created: `apps/web/__tests__/api/payments.test.ts`
2. [ ] Tests cover GET /api/payments:
   - [ ] Returns tenant's own payments
   - [ ] Returns landlord's tenant payments
   - [ ] Enforces RLS (401 unauthenticated, 403 unauthorized)
   - [ ] Supports pagination (limit, offset)
   - [ ] Supports filtering (status, property_id)
3. [ ] Tests cover GET /api/payments/[id]:
   - [ ] Returns payment if owner or landlord
   - [ ] Returns 403 if unauthorized
   - [ ] Returns 404 if not found
   - [ ] Includes Stripe details if available
4. [ ] Tests cover GET /api/payments/vendor:
   - [ ] Returns vendor payments for landlord only
   - [ ] Supports property_id filter
   - [ ] Supports pagination
   - [ ] Returns 401 unauthenticated
5. [ ] Tests cover POST /api/payments/vendor:
   - [ ] Creates vendor payment with all required fields
   - [ ] Returns 403 if landlord doesn't own property
   - [ ] Returns 400 for missing fields
   - [ ] Links to maintenance request if provided
   - [ ] Returns 404 if request not found
   - [ ] Returns 401 unauthenticated
6. [ ] Tests cover GET /api/payments/summary:
   - [ ] Returns correct financial summary
   - [ ] Includes per-property breakdown
   - [ ] Calculates collection_rate correctly
   - [ ] Aggregates across all properties
   - [ ] Supports month/year parameters
   - [ ] Validates month (1-12)
   - [ ] Calculates net_income correctly
7. [ ] Authorization tests:
   - [ ] Prevents cross-landlord data access
   - [ ] Prevents cross-tenant data access
   - [ ] Enforces property ownership
8. [ ] Error handling tests:
   - [ ] Database errors return 500
   - [ ] Missing auth returns 401
   - [ ] Invalid permissions return 403
9. [ ] Tests use Vitest or Jest
10. [ ] All tests pass before merging
11. [ ] Mocks for Clerk and Supabase are set up correctly
12. [ ] Test coverage > 80% for these routes

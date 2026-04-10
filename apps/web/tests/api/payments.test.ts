import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetAllMocks,
  setMockAuth,
  setMockRole,
  setSupabaseResults,
  buildRequest,
  mockAuth,
  mockCreateServerSupabaseClient,
  mockGetRole,
} from "../helpers";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/clerk", () => ({
  getRole: () => mockGetRole(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

// Mock Stripe to avoid requiring API keys in tests
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      charges: {
        retrieve: vi.fn().mockResolvedValue({
          id: "ch_test_123",
          amount: 150000,
          currency: "usd",
          payment_method_details: {
            card: {
              brand: "visa",
              last4: "4242",
            },
          },
          receipt_url: "https://example.com/receipt",
        }),
      },
    })),
  };
});

import { GET as getPayments } from "@/app/api/payments/route";
import { GET as getPaymentById } from "@/app/api/payments/[id]/route";
import { GET as getVendorPayments, POST as createVendorPayment } from "@/app/api/payments/vendor/route";
import { GET as getPaymentSummary } from "@/app/api/payments/summary/route";

describe("GET /api/payments", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await getPayments(buildRequest("http://localhost:3000/api/payments"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no role", async () => {
    setMockRole(null);
    const res = await getPayments(buildRequest("http://localhost:3000/api/payments"));
    expect(res.status).toBe(403);
  });

  it("returns tenant's own payments as tenant", async () => {
    setMockRole("tenant");
    setMockAuth("tenant-123");

    const mockPayments = [
      {
        id: "pay-1",
        amount: 1500,
        status: "completed",
        paid_at: "2026-04-01",
        created_at: "2026-04-01",
        tenant_id: "tenant-123",
        property_id: "prop-1",
        payment_period_id: "pp-1",
        stripe_charge_id: null,
        payment_method: "card",
        payment_periods: [{ month: 4, year: 2026, due_date: "2026-04-05" }],
        properties: [{ name: "123 Main St" }],
      },
    ];

    setSupabaseResults([
      { data: mockPayments, error: null },
    ]);

    const res = await getPayments(buildRequest("http://localhost:3000/api/payments"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toHaveLength(1);
    expect(json.payments[0].tenant_id).toBe("tenant-123");
  });

  it("returns only landlord's properties' payments as landlord", async () => {
    setMockRole("landlord");
    setMockAuth("landlord-123");

    const mockPayments = [
      {
        id: "pay-1",
        amount: 1500,
        status: "completed",
        tenant_id: "tenant-1",
        property_id: "prop-1",
        payment_periods: [{ month: 4, year: 2026, due_date: "2026-04-05" }],
        properties: [{ name: "123 Main St" }],
      },
    ];

    setSupabaseResults([
      // Landlord properties query
      { data: [{ id: "prop-1" }], error: null },
      // Payments query
      { data: mockPayments, error: null },
    ]);

    const res = await getPayments(buildRequest("http://localhost:3000/api/payments"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments[0].property_id).toBe("prop-1");
  });

  it("returns empty list when landlord has no properties", async () => {
    setMockRole("landlord");
    setMockAuth("landlord-123");

    setSupabaseResults([
      // Landlord properties query returns empty
      { data: [], error: null },
    ]);

    const res = await getPayments(buildRequest("http://localhost:3000/api/payments"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toEqual([]);
  });

  it("supports pagination with limit and offset", async () => {
    setMockRole("tenant");

    setSupabaseResults([
      { data: [], error: null },
    ]);

    const res = await getPayments(
      buildRequest("http://localhost:3000/api/payments?limit=10&offset=5")
    );
    const json = await res.json();
    expect(json.limit).toBe(10);
    expect(json.offset).toBe(5);
  });

  it("caps limit at 100", async () => {
    setMockRole("tenant");

    setSupabaseResults([
      { data: [], error: null },
    ]);

    const res = await getPayments(
      buildRequest("http://localhost:3000/api/payments?limit=200")
    );
    const json = await res.json();
    expect(json.limit).toBe(100);
  });

  it("filters by status when provided", async () => {
    setMockRole("tenant");

    setSupabaseResults([
      { data: [{ status: "completed" }], error: null },
    ]);

    const res = await getPayments(
      buildRequest("http://localhost:3000/api/payments?status=completed")
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 on database error", async () => {
    setMockRole("tenant");

    setSupabaseResults([
      { data: null, error: { message: "Database error" } },
    ]);

    const res = await getPayments(buildRequest("http://localhost:3000/api/payments"));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/payments/[id]", () => {
  const PARAMS = Promise.resolve({ id: "pay-123" });

  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await getPaymentById(
      buildRequest("http://localhost:3000/api/payments/pay-123"),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when payment not found", async () => {
    setSupabaseResults([
      { data: null, error: { message: "Not found" } },
    ]);

    const res = await getPaymentById(
      buildRequest("http://localhost:3000/api/payments/pay-123"),
      { params: PARAMS }
    );
    expect(res.status).toBe(404);
  });

  it("returns payment for tenant who owns it", async () => {
    setMockAuth("tenant-123");
    setSupabaseResults([
      {
        data: {
          id: "pay-123",
          amount: 1500,
          status: "completed",
          tenant_id: "tenant-123",
          property_id: "prop-1",
          stripe_charge_id: null,
          payment_periods: [{ month: 4, year: 2026 }],
          properties: [{ name: "123 Main" }],
        },
        error: null,
      },
    ]);

    const res = await getPaymentById(
      buildRequest("http://localhost:3000/api/payments/pay-123"),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("pay-123");
  });

  it("returns payment for landlord who owns the property", async () => {
    setMockAuth("landlord-123");
    setSupabaseResults([
      {
        data: {
          id: "pay-123",
          amount: 1500,
          status: "completed",
          tenant_id: "tenant-1",
          property_id: "prop-1",
          stripe_charge_id: null,
          payment_periods: [{ month: 4, year: 2026 }],
          properties: [{ name: "123 Main" }],
        },
        error: null,
      },
      // Landlord property ownership check
      { data: { id: "prop-1" }, error: null },
    ]);

    const res = await getPaymentById(
      buildRequest("http://localhost:3000/api/payments/pay-123"),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
  });

  it("returns 403 when user is not owner or landlord", async () => {
    setMockAuth("other-user-123");
    setSupabaseResults([
      {
        data: {
          id: "pay-123",
          tenant_id: "tenant-1",
          property_id: "prop-1",
        },
        error: null,
      },
      // Landlord property ownership check fails
      { data: null, error: { message: "Not found" } },
    ]);

    const res = await getPaymentById(
      buildRequest("http://localhost:3000/api/payments/pay-123"),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when payment data retrieval fails", async () => {
    setSupabaseResults([
      { data: null, error: { message: "Database error" } },
    ]);

    const res = await getPaymentById(
      buildRequest("http://localhost:3000/api/payments/pay-123"),
      { params: PARAMS }
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/payments/vendor", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await getVendorPayments(
      buildRequest("http://localhost:3000/api/payments/vendor")
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is tenant", async () => {
    setMockRole("tenant");
    const res = await getVendorPayments(
      buildRequest("http://localhost:3000/api/payments/vendor")
    );
    expect(res.status).toBe(403);
  });

  it("returns vendor payments for landlord's properties", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    const mockVendorPayments = [
      {
        id: "vp-1",
        property_id: "prop-1",
        vendor_name: "Plumbing Co",
        amount: 500,
        payment_date: "2026-04-01",
      },
    ];

    setSupabaseResults([
      // Get landlord properties
      { data: [{ id: "prop-1" }], error: null },
      // Get vendor payments
      { data: mockVendorPayments, error: null },
    ]);

    const res = await getVendorPayments(
      buildRequest("http://localhost:3000/api/payments/vendor")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toHaveLength(1);
    expect(json.payments[0].vendor_name).toBe("Plumbing Co");
  });

  it("returns empty list when landlord has no properties", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    setSupabaseResults([
      // Get landlord properties (empty)
      { data: [], error: null },
    ]);

    const res = await getVendorPayments(
      buildRequest("http://localhost:3000/api/payments/vendor")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toEqual([]);
  });

  it("filters by property_id when provided", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    setSupabaseResults([
      // Property ownership check
      { data: { id: "prop-1" }, error: null },
      // Get vendor payments for property
      { data: [], error: null },
    ]);

    const res = await getVendorPayments(
      buildRequest("http://localhost:3000/api/payments/vendor?property_id=prop-1")
    );
    expect(res.status).toBe(200);
  });

  it("returns 403 when property_id not owned by landlord", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    setSupabaseResults([
      // Property ownership check fails
      { data: null, error: { message: "Not found" } },
    ]);

    const res = await getVendorPayments(
      buildRequest("http://localhost:3000/api/payments/vendor?property_id=other-prop")
    );
    expect(res.status).toBe(403);
  });

  it("handles missing properties gracefully", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    setSupabaseResults([
      // Properties query fails, falls back to empty
      { data: null, error: { message: "Database error" } },
    ]);

    const res = await getVendorPayments(
      buildRequest("http://localhost:3000/api/payments/vendor")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toEqual([]);
  });
});

describe("POST /api/payments/vendor", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await createVendorPayment(
      buildRequest("http://localhost:3000/api/payments/vendor", {
        method: "POST",
        body: {
          property_id: "prop-1",
          vendor_name: "Plumbing Co",
          amount: 500,
          payment_date: "2026-04-01",
        },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is tenant", async () => {
    setMockRole("tenant");
    const res = await createVendorPayment(
      buildRequest("http://localhost:3000/api/payments/vendor", {
        method: "POST",
        body: {
          property_id: "prop-1",
          vendor_name: "Plumbing Co",
          amount: 500,
          payment_date: "2026-04-01",
        },
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    setMockRole("landlord");

    const testCases = [
      { vendor_name: "Plumbing Co", amount: 500, payment_date: "2026-04-01" }, // missing property_id
      { property_id: "prop-1", amount: 500, payment_date: "2026-04-01" }, // missing vendor_name
      { property_id: "prop-1", vendor_name: "Plumbing Co", payment_date: "2026-04-01" }, // missing amount
      { property_id: "prop-1", vendor_name: "Plumbing Co", amount: 500 }, // missing payment_date
    ];

    for (const body of testCases) {
      const res = await createVendorPayment(
        buildRequest("http://localhost:3000/api/payments/vendor", {
          method: "POST",
          body,
        })
      );
      expect(res.status).toBe(400);
    }
  });

  it("creates vendor payment with valid data", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    const payload = {
      property_id: "prop-1",
      vendor_name: "Plumbing Co",
      amount: 500,
      payment_date: "2026-04-01",
      description: "Fixed kitchen pipe",
    };

    setSupabaseResults([
      // Property ownership check
      { data: { id: "prop-1" }, error: null },
      // Create vendor payment
      {
        data: {
          id: "vp-1",
          ...payload,
          created_by: "landlord-123",
        },
        error: null,
      },
    ]);

    const res = await createVendorPayment(
      buildRequest("http://localhost:3000/api/payments/vendor", {
        method: "POST",
        body: payload,
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.vendor_name).toBe("Plumbing Co");
    expect(json.amount).toBe(500);
  });

  it("returns 403 when landlord does not own property", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    setSupabaseResults([
      // Property ownership check fails
      { data: null, error: { message: "Not found" } },
    ]);

    const res = await createVendorPayment(
      buildRequest("http://localhost:3000/api/payments/vendor", {
        method: "POST",
        body: {
          property_id: "other-prop",
          vendor_name: "Plumbing Co",
          amount: 500,
          payment_date: "2026-04-01",
        },
      })
    );
    expect(res.status).toBe(403);
  });

  it("links to maintenance request if provided", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    const payload = {
      property_id: "prop-1",
      vendor_name: "Plumbing Co",
      amount: 500,
      payment_date: "2026-04-01",
      request_id: "req-1",
    };

    setSupabaseResults([
      // Property ownership check
      { data: { id: "prop-1" }, error: null },
      // Request ownership check
      { data: { id: "req-1" }, error: null },
      // Create vendor payment
      {
        data: { id: "vp-1", ...payload },
        error: null,
      },
    ]);

    const res = await createVendorPayment(
      buildRequest("http://localhost:3000/api/payments/vendor", {
        method: "POST",
        body: payload,
      })
    );
    expect(res.status).toBe(201);
  });

  it("returns 404 if linked request not found", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    setSupabaseResults([
      // Property ownership check
      { data: { id: "prop-1" }, error: null },
      // Request not found
      { data: null, error: { message: "Not found" } },
    ]);

    const res = await createVendorPayment(
      buildRequest("http://localhost:3000/api/payments/vendor", {
        method: "POST",
        body: {
          property_id: "prop-1",
          vendor_name: "Plumbing Co",
          amount: 500,
          payment_date: "2026-04-01",
          request_id: "nonexistent",
        },
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 on database error", async () => {
    setMockAuth("landlord-123");
    setMockRole("landlord");

    setSupabaseResults([
      // Property ownership check
      { data: { id: "prop-1" }, error: null },
      // Insert fails
      { data: null, error: { message: "Database error" } },
    ]);

    const res = await createVendorPayment(
      buildRequest("http://localhost:3000/api/payments/vendor", {
        method: "POST",
        body: {
          property_id: "prop-1",
          vendor_name: "Plumbing Co",
          amount: 500,
          payment_date: "2026-04-01",
        },
      })
    );
    expect(res.status).toBe(500);
  });
});

describe("GET /api/payments/summary", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await getPaymentSummary(
      buildRequest("http://localhost:3000/api/payments/summary")
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when landlord has no properties", async () => {
    setMockAuth("landlord-123");

    setSupabaseResults([
      // Get properties
      { data: [], error: null },
    ]);

    const res = await getPaymentSummary(
      buildRequest("http://localhost:3000/api/payments/summary")
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid month", async () => {
    setMockAuth("landlord-123");

    const testCases = ["?month=0", "?month=13"];
    for (const query of testCases) {
      const res = await getPaymentSummary(
        buildRequest(`http://localhost:3000/api/payments/summary${query}`)
      );
      expect(res.status).toBe(400);
    }
  });

  it("returns financial summary for current month by default", async () => {
    setMockAuth("landlord-123");

    const mockProperty = { id: "prop-1", name: "123 Main St" };
    const mockPaymentPeriods = [{ rent_amount: 1500 }];
    const mockPayments = [{ amount: 1500 }];
    const mockVendorPayments = [{ amount: 300 }];

    setSupabaseResults([
      // Get properties
      { data: [mockProperty], error: null },
      // Get expected rent
      { data: mockPaymentPeriods, error: null },
      // Get collected rent
      { data: mockPayments, error: null },
      // Get vendor payments
      { data: mockVendorPayments, error: null },
    ]);

    const res = await getPaymentSummary(
      buildRequest("http://localhost:3000/api/payments/summary")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rent_expected).toBe(1500);
    expect(json.rent_collected).toBe(1500);
    expect(json.collection_rate).toBe(100);
    expect(json.maintenance_costs).toBe(300);
    expect(json.net_income).toBe(1200);
  });

  it("calculates collection rate correctly", async () => {
    setMockAuth("landlord-123");

    const mockProperty = { id: "prop-1", name: "123 Main St" };
    const mockPaymentPeriods = [{ rent_amount: 1500 }];
    const mockPayments = [{ amount: 1200 }]; // 80% collected
    const mockVendorPayments = [];

    setSupabaseResults([
      { data: [mockProperty], error: null },
      { data: mockPaymentPeriods, error: null },
      { data: mockPayments, error: null },
      { data: mockVendorPayments, error: null },
    ]);

    const res = await getPaymentSummary(
      buildRequest("http://localhost:3000/api/payments/summary")
    );
    const json = await res.json();
    expect(json.collection_rate).toBe(80);
  });

  it("supports month and year parameters", async () => {
    setMockAuth("landlord-123");

    const mockProperty = { id: "prop-1", name: "123 Main St" };

    setSupabaseResults([
      { data: [mockProperty], error: null },
      { data: [], error: null }, // No rent expected
      { data: [], error: null }, // No rent collected
      { data: [], error: null }, // No vendor payments
    ]);

    const res = await getPaymentSummary(
      buildRequest("http://localhost:3000/api/payments/summary?month=5&year=2024")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.month).toBe(5);
    expect(json.year).toBe(2024);
  });

  it("includes per-property breakdown in summary", async () => {
    setMockAuth("landlord-123");

    const mockProperties = [
      { id: "prop-1", name: "123 Main St" },
      { id: "prop-2", name: "456 Oak Ave" },
    ];

    setSupabaseResults([
      // Get properties
      { data: mockProperties, error: null },
      // Property 1: expected rent
      { data: [{ rent_amount: 1500 }], error: null },
      // Property 1: collected rent
      { data: [{ amount: 1500 }], error: null },
      // Property 1: vendor payments
      { data: [], error: null },
      // Property 2: expected rent
      { data: [{ rent_amount: 2000 }], error: null },
      // Property 2: collected rent
      { data: [], error: null },
      // Property 2: vendor payments
      { data: [{ amount: 500 }], error: null },
    ]);

    const res = await getPaymentSummary(
      buildRequest("http://localhost:3000/api/payments/summary")
    );
    const json = await res.json();
    expect(json.properties).toHaveLength(2);
    expect(json.properties[0].property_name).toBe("123 Main St");
    expect(json.properties[1].property_name).toBe("456 Oak Ave");
  });

  it("returns 500 on database error", async () => {
    setMockAuth("landlord-123");

    setSupabaseResults([
      // Properties query fails
      { data: null, error: { message: "Database error" } },
    ]);

    const res = await getPaymentSummary(
      buildRequest("http://localhost:3000/api/payments/summary")
    );
    expect(res.status).toBe(500);
  });
});

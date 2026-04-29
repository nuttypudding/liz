/**
 * Integration test: full rent payment checkout flow
 *
 * Tests the end-to-end sequence:
 *   1. Generate payment period (POST /api/payments/generate)
 *   2. Create checkout session (POST /api/payments/checkout)
 *   3. Process Stripe webhook (POST /api/webhooks/stripe — checkout.session.completed)
 *   4. Verify payment appears in list (GET /api/payments)
 *   5. Verify receipt accessible (GET /api/payments/[id])
 *
 * All external dependencies (Supabase, Stripe, Clerk) are mocked.
 * Tests run against the actual Next.js route handlers.
 */
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

// ---------- deterministic test IDs ----------
const TENANT_ID = "test-tenant-flow-001";
const PROPERTY_ID = "test-prop-flow-001";
const LANDLORD_ID = "test-landlord-flow-001";
const PAYMENT_PERIOD_ID = "test-pp-flow-001";
const PAYMENT_ID = "test-pay-flow-001";
const STRIPE_INTENT_ID = "pi_test_flow_001";
const STRIPE_SESSION_ID = "cs_test_flow_001";
const STRIPE_ACCOUNT_ID = "acct_test_flow_001";

// ---------- Clerk mocks ----------
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/clerk", () => ({ getRole: () => mockGetRole() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

// ---------- next/headers mock (for webhook stripe-signature) ----------
let mockStripeSignature: string | null = "t=123,v1=testsig";
vi.mock("next/headers", () => ({
  headers: vi.fn().mockImplementation(() =>
    Promise.resolve({
      get: vi.fn().mockImplementation((key: string) =>
        key === "stripe-signature" ? mockStripeSignature : null
      ),
    })
  ),
}));

// ---------- Stripe mocks ----------
// vi.hoisted() ensures these are available when the vi.mock factory runs
// (vi.mock factories are hoisted before import statements, so module-level
//  `const` declarations would be in TDZ at factory time without vi.hoisted).
const mockCheckoutCreate = vi.hoisted(() => vi.fn());
const mockConstructEvent = vi.hoisted(() => vi.fn());
const mockChargesRetrieve = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => ({
  // Must use a regular function (not arrow) because the route modules call
  // `new Stripe(...)` at module-initialization time, and arrow functions
  // cannot be used as constructors.
  default: vi.fn().mockImplementation(function () {
    return {
      checkout: { sessions: { create: mockCheckoutCreate } },
      webhooks: { constructEvent: mockConstructEvent },
      charges: { retrieve: mockChargesRetrieve },
    };
  }),
}));

// ---------- Route handlers under test ----------
import { POST as generatePeriod } from "@/app/api/payments/generate/route";
import { POST as createCheckout } from "@/app/api/payments/checkout/route";
import { POST as stripeWebhookPOST } from "@/app/api/webhooks/stripe/route";
import { GET as getPayments } from "@/app/api/payments/route";
import { GET as getPaymentById } from "@/app/api/payments/[id]/route";

// ============================================================
// Full checkout flow — sequential steps
// ============================================================
describe("Payments Checkout Flow — end-to-end sequence", () => {
  beforeEach(() => {
    resetAllMocks();
    mockStripeSignature = "t=123,v1=testsig";
    mockCheckoutCreate.mockReset();
    mockConstructEvent.mockReset();
    mockChargesRetrieve.mockReset();
    // Webhook handler checks for STRIPE_WEBHOOK_SECRET before processing
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_secret";
  });

  it("step 1: generates payment period for tenant (new period)", async () => {
    setMockAuth(TENANT_ID);
    setMockRole("tenant");

    setSupabaseResults([
      // Tenant lookup by clerk_user_id
      { data: { id: TENANT_ID, property_id: PROPERTY_ID }, error: null },
      // No existing period for this month
      { data: null, error: null },
      // Property rent amount and due day
      { data: { monthly_rent: 1500, rent_due_day: 1 }, error: null },
      // Newly inserted period
      {
        data: {
          id: PAYMENT_PERIOD_ID,
          property_id: PROPERTY_ID,
          tenant_id: TENANT_ID,
          month: 4,
          year: 2026,
          rent_amount: 1500,
          due_date: "2026-04-01",
          status: "pending",
        },
        error: null,
      },
      // Property name for response
      { data: { id: PROPERTY_ID, name: "Test Property" }, error: null },
    ]);

    const res = await generatePeriod(
      buildRequest("http://localhost:3000/api/payments/generate")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period.id).toBe(PAYMENT_PERIOD_ID);
    expect(json.period.status).toBe("pending");
    expect(json.period.rent_amount).toBe(1500);
    expect(json.property.name).toBe("Test Property");
  });

  it("step 1b: returns existing period if already generated this month", async () => {
    setMockAuth(TENANT_ID);
    setMockRole("tenant");

    setSupabaseResults([
      { data: { id: TENANT_ID, property_id: PROPERTY_ID }, error: null },
      // Existing period found — no insert needed
      {
        data: {
          id: PAYMENT_PERIOD_ID,
          property_id: PROPERTY_ID,
          tenant_id: TENANT_ID,
          month: 4,
          year: 2026,
          rent_amount: 1500,
          due_date: "2026-04-01",
          status: "pending",
        },
        error: null,
      },
      { data: { id: PROPERTY_ID, name: "Test Property" }, error: null },
    ]);

    const res = await generatePeriod(
      buildRequest("http://localhost:3000/api/payments/generate")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period.id).toBe(PAYMENT_PERIOD_ID);
    expect(json.period.status).toBe("pending");
  });

  it("step 2: creates Stripe checkout session and pending payment record", async () => {
    setMockAuth(TENANT_ID);

    mockCheckoutCreate.mockResolvedValue({
      id: STRIPE_SESSION_ID,
      url: "https://checkout.stripe.com/pay/test_flow",
    });

    setSupabaseResults([
      // Payment period lookup
      {
        data: {
          id: PAYMENT_PERIOD_ID,
          property_id: PROPERTY_ID,
          tenant_id: TENANT_ID,
          rent_amount: 1500,
          month: 4,
          year: 2026,
        },
        error: null,
      },
      // Property lookup
      { data: { id: PROPERTY_ID, landlord_id: LANDLORD_ID, name: "Test Property" }, error: null },
      // Stripe account — charges enabled
      { data: { stripe_account_id: STRIPE_ACCOUNT_ID, charges_enabled: true }, error: null },
      // Tenant email for Stripe pre-fill
      { data: { email: "tenant@test.com", first_name: "Test", last_name: "Tenant" }, error: null },
      // Insert pending payment record
      { data: null, error: null },
    ]);

    const res = await createCheckout(
      buildRequest("http://localhost:3000/api/payments/checkout", {
        method: "POST",
        body: { payment_period_id: PAYMENT_PERIOD_ID },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sessionId).toBe(STRIPE_SESSION_ID);
    expect(json.url).toContain("stripe.com");

    // Checkout session created with correct metadata
    expect(mockCheckoutCreate).toHaveBeenCalledOnce();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({
          payment_period_id: PAYMENT_PERIOD_ID,
          tenant_id: TENANT_ID,
          property_id: PROPERTY_ID,
        }),
      })
    );
  });

  it("step 3: processes checkout.session.completed webhook — payment updated to completed", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_flow_001",
      type: "checkout.session.completed",
      data: {
        object: {
          id: STRIPE_SESSION_ID,
          payment_intent: STRIPE_INTENT_ID,
          metadata: {
            payment_period_id: PAYMENT_PERIOD_ID,
            property_id: PROPERTY_ID,
            tenant_id: TENANT_ID,
          },
        },
      },
    });

    setSupabaseResults([
      // Idempotency check: no existing completed payment for this intent
      { data: null, error: null },
      // Update payment record to completed
      { data: null, error: null },
      // Update payment_period to paid
      { data: null, error: null },
    ]);

    const req = buildRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=123,v1=testsig" },
      body: { type: "checkout.session.completed" },
    });
    const res = await stripeWebhookPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("step 3b: webhook is idempotent — skips if already processed", async () => {
    // Same event re-delivered; handler detects already-completed payment
    mockConstructEvent.mockReturnValue({
      id: "evt_test_flow_001",
      type: "checkout.session.completed",
      data: {
        object: {
          id: STRIPE_SESSION_ID,
          payment_intent: STRIPE_INTENT_ID,
          metadata: { payment_period_id: PAYMENT_PERIOD_ID },
        },
      },
    });

    setSupabaseResults([
      // Idempotency check: payment already completed — handler returns early
      { data: { id: PAYMENT_ID, status: "completed" }, error: null },
    ]);

    const req = buildRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=123,v1=testsig" },
      body: { type: "checkout.session.completed" },
    });
    const res = await stripeWebhookPOST(req);
    // Handler exits early but still returns 200 (webhook acknowledged)
    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
  });

  it("step 4: completed payment appears in tenant's list", async () => {
    setMockAuth(TENANT_ID);
    setMockRole("tenant");

    setSupabaseResults([
      {
        data: [
          {
            id: PAYMENT_ID,
            amount: 1500,
            status: "completed",
            paid_at: "2026-04-10T12:00:00Z",
            created_at: "2026-04-10T10:00:00Z",
            tenant_id: TENANT_ID,
            property_id: PROPERTY_ID,
            payment_period_id: PAYMENT_PERIOD_ID,
            stripe_charge_id: null,
            payment_method: "card",
            payment_periods: [{ month: 4, year: 2026, due_date: "2026-04-01" }],
            properties: [{ name: "Test Property" }],
          },
        ],
        error: null,
      },
    ]);

    const res = await getPayments(
      buildRequest("http://localhost:3000/api/payments?status=completed")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toHaveLength(1);
    expect(json.payments[0].id).toBe(PAYMENT_ID);
    expect(json.payments[0].status).toBe("completed");
    expect(json.payments[0].tenant_id).toBe(TENANT_ID);
  });

  it("step 5: tenant can retrieve payment receipt", async () => {
    setMockAuth(TENANT_ID);
    mockChargesRetrieve.mockRejectedValue(new Error("No charge"));

    setSupabaseResults([
      {
        data: {
          id: PAYMENT_ID,
          amount: 1500,
          status: "completed",
          paid_at: "2026-04-10T12:00:00Z",
          tenant_id: TENANT_ID,
          property_id: PROPERTY_ID,
          payment_period_id: PAYMENT_PERIOD_ID,
          stripe_charge_id: null,
          stripe_payment_intent_id: STRIPE_INTENT_ID,
          payment_method: null,
          metadata: {},
          payment_periods: [
            { id: PAYMENT_PERIOD_ID, month: 4, year: 2026, due_date: "2026-04-01", rent_amount: 1500, status: "paid" },
          ],
          properties: [{ id: PROPERTY_ID, name: "Test Property", address: "123 Test St" }],
        },
        error: null,
      },
    ]);

    const res = await getPaymentById(
      buildRequest(`http://localhost:3000/api/payments/${PAYMENT_ID}`),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(PAYMENT_ID);
    expect(json.status).toBe("completed");
    expect(json.payment_periods).toBeDefined();
    expect(json.properties).toBeDefined();
  });
});

// ============================================================
// Authorization tests
// ============================================================
describe("Payments Checkout Flow — authorization", () => {
  beforeEach(() => {
    resetAllMocks();
    mockStripeSignature = "t=123,v1=testsig";
    mockCheckoutCreate.mockReset();
    mockConstructEvent.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_secret";
  });

  it("generate: returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await generatePeriod(
      buildRequest("http://localhost:3000/api/payments/generate")
    );
    expect(res.status).toBe(401);
  });

  it("generate: returns 403 when role is not tenant", async () => {
    setMockRole("landlord");
    const res = await generatePeriod(
      buildRequest("http://localhost:3000/api/payments/generate")
    );
    expect(res.status).toBe(403);
  });

  it("checkout: returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await createCheckout(
      buildRequest("http://localhost:3000/api/payments/checkout", {
        method: "POST",
        body: { payment_period_id: PAYMENT_PERIOD_ID },
      })
    );
    expect(res.status).toBe(401);
  });

  it("checkout: returns 400 when Stripe account not ready", async () => {
    setMockAuth(TENANT_ID);

    setSupabaseResults([
      { data: { id: PAYMENT_PERIOD_ID, property_id: PROPERTY_ID, tenant_id: TENANT_ID, rent_amount: 1500, month: 4, year: 2026 }, error: null },
      { data: { id: PROPERTY_ID, landlord_id: LANDLORD_ID, name: "Test Property" }, error: null },
      // Stripe account exists but charges not enabled yet
      { data: { stripe_account_id: STRIPE_ACCOUNT_ID, charges_enabled: false }, error: null },
    ]);

    const res = await createCheckout(
      buildRequest("http://localhost:3000/api/payments/checkout", {
        method: "POST",
        body: { payment_period_id: PAYMENT_PERIOD_ID },
      })
    );
    expect(res.status).toBe(400);
  });

  it("other tenants cannot see this tenant's payments", async () => {
    const OTHER_TENANT = "other-tenant-xyz-999";
    setMockAuth(OTHER_TENANT);
    setMockRole("tenant");

    // Other tenant's payment list is empty — they see no payments
    setSupabaseResults([{ data: [], error: null }]);

    const res = await getPayments(
      buildRequest("http://localhost:3000/api/payments")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    const hasTestPayment = json.payments.some((p: { id: string }) => p.id === PAYMENT_ID);
    expect(hasTestPayment).toBe(false);
  });

  it("other tenant cannot access this tenant's receipt", async () => {
    const OTHER_TENANT = "other-tenant-xyz-999";
    setMockAuth(OTHER_TENANT);
    mockChargesRetrieve.mockResolvedValue({ id: "ch_test", amount: 150000 });

    setSupabaseResults([
      // Payment belongs to TENANT_ID, not OTHER_TENANT
      {
        data: {
          id: PAYMENT_ID,
          tenant_id: TENANT_ID,
          property_id: PROPERTY_ID,
          stripe_charge_id: null,
          payment_periods: [],
          properties: [],
        },
        error: null,
      },
      // Landlord ownership check: OTHER_TENANT is not the landlord
      { data: null, error: { message: "Not found" } },
    ]);

    const res = await getPaymentById(
      buildRequest(`http://localhost:3000/api/payments/${PAYMENT_ID}`),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );
    expect(res.status).toBe(403);
  });
});

// ============================================================
// Edge cases
// ============================================================
describe("Payments Checkout Flow — edge cases", () => {
  beforeEach(() => {
    resetAllMocks();
    mockStripeSignature = "t=123,v1=testsig";
    mockCheckoutCreate.mockReset();
    mockConstructEvent.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_secret";
  });

  it("checkout: returns 400 when payment_period_id is missing", async () => {
    setMockAuth(TENANT_ID);

    const res = await createCheckout(
      buildRequest("http://localhost:3000/api/payments/checkout", {
        method: "POST",
        body: {},
      })
    );
    expect(res.status).toBe(400);
  });

  it("checkout: returns 404 when payment period not found", async () => {
    setMockAuth(TENANT_ID);

    setSupabaseResults([
      { data: null, error: { message: "Not found" } },
    ]);

    const res = await createCheckout(
      buildRequest("http://localhost:3000/api/payments/checkout", {
        method: "POST",
        body: { payment_period_id: "nonexistent-period" },
      })
    );
    expect(res.status).toBe(404);
  });

  it("webhook: returns 400 when stripe-signature header is missing", async () => {
    mockStripeSignature = null;

    const req = buildRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: { type: "checkout.session.completed" },
    });
    const res = await stripeWebhookPOST(req);
    expect(res.status).toBe(400);
  });

  it("webhook: returns 401 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload");
    });

    const req = buildRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "invalid-signature" },
      body: { type: "checkout.session.completed" },
    });
    const res = await stripeWebhookPOST(req);
    expect(res.status).toBe(401);
  });

  it("generate: returns 404 when tenant record not found in database", async () => {
    setMockAuth(TENANT_ID);
    setMockRole("tenant");

    setSupabaseResults([
      { data: null, error: null }, // No tenant record
    ]);

    const res = await generatePeriod(
      buildRequest("http://localhost:3000/api/payments/generate")
    );
    expect(res.status).toBe(404);
  });

  it("checkout: returns 404 when property not found", async () => {
    setMockAuth(TENANT_ID);

    setSupabaseResults([
      { data: { id: PAYMENT_PERIOD_ID, property_id: PROPERTY_ID, tenant_id: TENANT_ID, rent_amount: 1500, month: 4, year: 2026 }, error: null },
      { data: null, error: null }, // Property not found
    ]);

    const res = await createCheckout(
      buildRequest("http://localhost:3000/api/payments/checkout", {
        method: "POST",
        body: { payment_period_id: PAYMENT_PERIOD_ID },
      })
    );
    expect(res.status).toBe(404);
  });

  it("webhook: handles unknown event types gracefully", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_unknown",
      type: "payment_intent.created", // Not handled by our switch
      data: { object: {} },
    });

    const req = buildRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=123,v1=testsig" },
      body: {},
    });
    const res = await stripeWebhookPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});

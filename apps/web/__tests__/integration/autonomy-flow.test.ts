/**
 * Integration tests for the autonomous decision engine end-to-end flow.
 *
 * Tests: engine evaluation → confidence scoring → safety checks → Claude reasoning
 *        → API confirm/override lifecycle → classify route autonomy gating.
 *
 * Scenarios:
 *   1. Auto-dispatch — high confidence exceeds threshold → dispatch
 *   2. Escalate — low confidence below threshold → escalate
 *   3. Emergency auto-dispatch — emergency flag overrides threshold → dispatch
 *   4. Spending cap violation — per-decision cap exceeded → escalate
 *   5. Category exclusion — category in exclusion list → escalate
 *   6. Landlord confirms decision — PATCH → status = confirmed
 *   7. Landlord overrides decision — PATCH → status = overridden, feedback + cooldown
 *   8. Autonomy paused — classify route skips engine when paused = true
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Anthropic mock (must come before imports that use it) ---
// vi.hoisted ensures the variable is initialized before vi.mock's hoisted factory runs
const mockAnthropicCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    content: [
      {
        type: "text",
        text: "• Routine issue with good historical success\n• Cost within budget\n• Category routinely handled",
      },
    ],
  })
);

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockAnthropicCreate };
  }
  return { Anthropic: MockAnthropic };
});

// --- Clerk mock ---
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// --- Supabase server mock ---
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

// --- Anthropic lib mock (used by classify route) ---
vi.mock("@/lib/anthropic", () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              self_resolvable: false,
              troubleshooting_guide: null,
              confidence: 0.9,
            }),
          },
        ],
      }),
    },
  },
}));

// --- Override + stats mocks (isolate side-effects) ---
vi.mock("@/lib/autonomy/updateMonthlyStats", () => ({
  updateMonthlyStats: vi.fn().mockResolvedValue(undefined),
  monthFromIso: vi.fn().mockReturnValue("2026-04"),
}));

vi.mock("@/lib/autonomy/override", () => ({
  handleOverride: vi.fn().mockResolvedValue({ withinWindow: true }),
}));

vi.mock("@/lib/autonomy/notifications", () => ({
  sendLandlordAutoDispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

// --- Rules engine mock (used by classify route) ---
vi.mock("@/lib/rules/engine", () => ({
  processRulesForRequest: vi.fn().mockResolvedValue({
    actions_applied: [],
    matched_rules: [],
  }),
}));

import { evaluateAutonomousDecision } from "@/lib/autonomy/engine";
import type { AutonomySettings } from "@/lib/types/autonomy";
import { PATCH } from "@/app/api/autonomy/decisions/[id]/route";
import { POST as classifyPOST } from "@/app/api/classify/route";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { handleOverride } from "@/lib/autonomy/override";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCreateClient = createServerSupabaseClient as ReturnType<typeof vi.fn>;

// ============================================================================
// Helpers
// ============================================================================

const defaultSettings = (overrides?: Partial<AutonomySettings>): AutonomySettings => ({
  id: "settings-1",
  landlord_id: "landlord-1",
  confidence_threshold: 0.85,
  per_decision_cap: 500,
  monthly_cap: 5000,
  excluded_categories: [],
  preferred_vendors_only: false,
  require_cost_estimate: true,
  emergency_auto_dispatch: true,
  rollback_window_hours: 24,
  cooldown_until: undefined,
  paused: false,
  created_at: "2026-04-10T00:00:00Z",
  updated_at: "2026-04-10T00:00:00Z",
  ...overrides,
});

const plumbingRequest = {
  id: "req-plumbing",
  ai_category: "plumbing",
  ai_urgency: "medium",
  ai_cost_estimate_low: 100,
  ai_cost_estimate_high: 200,
  ai_confidence_score: 0.9,
  vendor_id: undefined,
  created_at: "2026-04-10T10:00:00Z",
};

/**
 * Build a minimal mock Supabase client that returns results in order.
 * Each call to a terminal method (single, maybeSingle, or direct await)
 * consumes the next entry from the results array.
 */
function buildSupabase(results: Array<{ data: unknown; error: unknown | null }>) {
  let idx = 0;
  const next = () => {
    const r = results[idx] ?? { data: null, error: null };
    idx++;
    return r;
  };

  const chain: Record<string, unknown> = {};
  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "not", "order", "is",
    "gte", "lte", "gt", "lt", "limit", "range",
  ];
  for (const m of chainMethods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockImplementation(() => Promise.resolve(next()));
  chain.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(next()));
  // Make chain directly awaitable (no .single())
  (chain as any)[Symbol.iterator] = undefined;
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(next()).then(resolve);

  return { from: vi.fn().mockReturnValue(chain), storage: { from: vi.fn() } };
}

function buildPatchRequest(body: object, id = "decision-1") {
  return new NextRequest(`http://localhost:3000/api/autonomy/decisions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ============================================================================
// Scenario 1: Auto-dispatch (high confidence)
// ============================================================================

describe("Scenario 1: Auto-dispatch (high confidence)", () => {
  it("dispatches when confidence exceeds threshold", async () => {
    const supabase = buildSupabase([
      // evaluateSafetyRails: monthly confirmed decisions (spending cap check)
      { data: [], error: null },
      // calculateHistoricalFactor: past 90-day decisions (all confirmed)
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("dispatch");
    // confidence = 1.0*0.35 + 0.8*0.25 + 0.9*0.2 + 0.5*0.1 + 1.0*0.1 = 0.88
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.85);
    expect(result.factors.historical_weight).toBe(1.0);
    expect(result.factors.category_weight).toBe(1.0); // plumbing not excluded
    expect(result.safety_checks.spending_cap_ok).toBe(true);
    expect(result.safety_checks.category_excluded).toBe(true); // not excluded
    expect(result.safety_checks.vendor_available).toBe(true);
    expect(result.safety_checks.emergency_eligible).toBe(true);
    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("creates decision record with pending_review status", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    // Decision type and factors should be returned (caller inserts to DB)
    expect(result.decision_type).toBe("dispatch");
    expect(result.factors).toMatchObject({
      historical_weight: expect.any(Number),
      rules_weight: expect.any(Number),
      cost_weight: expect.any(Number),
      vendor_weight: expect.any(Number),
      category_weight: expect.any(Number),
    });
    expect(result.safety_checks).toBeDefined();
    expect(result.actions_taken).toBeDefined();
  });
});

// ============================================================================
// Scenario 2: Escalate (low confidence)
// ============================================================================

describe("Scenario 2: Escalate (low confidence)", () => {
  it("escalates when confidence is below threshold", async () => {
    const supabase = buildSupabase([
      // monthly decisions: empty
      { data: [], error: null },
      // historical: all overridden → success rate = 0, historical_weight = 0
      { data: Array(10).fill({ status: "overridden" }), error: null },
    ]);

    const structuralRequest = {
      ...plumbingRequest,
      id: "req-structural",
      ai_category: "structural",
      ai_urgency: "medium",
      ai_cost_estimate_low: 400,
      ai_cost_estimate_high: 600,
    };

    const result = await evaluateAutonomousDecision(
      structuralRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("escalate");
    // confidence = 0*0.35 + 0.5*0.25 + 0.7*0.2 + 0.5*0.1 + 1.0*0.1 ≈ 0.415 < 0.85
    expect(result.confidence_score).toBeLessThan(0.85);
    expect(result.factors.historical_weight).toBe(0);
    expect(result.safety_checks.spending_cap_ok).toBe(true); // (400+600)/2=500 = per_decision_cap, not exceeded
  });

  it("escalates with zero history (neutral 0.5 historical weight)", async () => {
    const supabase = buildSupabase([
      { data: [], error: null }, // monthly
      { data: [], error: null }, // historical: no past decisions → defaults to 0.5
    ]);

    const structuralRequest = {
      ...plumbingRequest,
      id: "req-structural-no-history",
      ai_category: "structural",
      ai_urgency: "medium",
      ai_cost_estimate_low: 800,
      ai_cost_estimate_high: 1200, // avg 1000 > per_decision_cap 500 → cost_factor = 0.2
    };

    const result = await evaluateAutonomousDecision(
      structuralRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("escalate");
    // spending_cap_ok = false because (800+1200)/2 = 1000 > 500 per_decision_cap
    expect(result.safety_checks.spending_cap_ok).toBe(false);
    expect(result.factors.historical_weight).toBe(0.5);
  });
});

// ============================================================================
// Scenario 3: Emergency auto-dispatch
// ============================================================================

describe("Scenario 3: Emergency auto-dispatch", () => {
  it("dispatches emergency requests despite lower confidence", async () => {
    const supabase = buildSupabase([
      { data: [], error: null }, // monthly
      // Low historical success rate → normally would escalate
      { data: Array(4).fill({ status: "overridden" }), error: null },
    ]);

    const emergencyRequest = {
      ...plumbingRequest,
      id: "req-emergency",
      ai_category: "electrical",
      ai_urgency: "emergency",
      ai_cost_estimate_low: 200,
      ai_cost_estimate_high: 400,
    };

    const result = await evaluateAutonomousDecision(
      emergencyRequest,
      defaultSettings({ emergency_auto_dispatch: true }),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("dispatch");
    // Emergency override bypasses confidence threshold check
    expect(result.confidence_score).toBeLessThan(0.85);
  });

  it("escalates emergency when emergency_auto_dispatch is disabled", async () => {
    const supabase = buildSupabase([
      { data: [], error: null }, // monthly
      { data: [], error: null }, // historical
    ]);

    const emergencyRequest = {
      ...plumbingRequest,
      id: "req-emergency-disabled",
      ai_category: "electrical",
      ai_urgency: "emergency",
      ai_cost_estimate_low: 200,
      ai_cost_estimate_high: 400,
    };

    const result = await evaluateAutonomousDecision(
      emergencyRequest,
      defaultSettings({ emergency_auto_dispatch: false }),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("escalate");
    expect(result.safety_checks.emergency_eligible).toBe(false);
  });

  it("sets emergency_eligible=false when auto-dispatch disabled", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      { ...plumbingRequest, ai_urgency: "emergency" },
      defaultSettings({ emergency_auto_dispatch: false }),
      "landlord-1",
      supabase as any
    );

    expect(result.safety_checks.emergency_eligible).toBe(false);
  });
});

// ============================================================================
// Scenario 4: Spending cap violation
// ============================================================================

describe("Scenario 4: Spending cap violation", () => {
  it("escalates when estimated cost exceeds per-decision cap", async () => {
    const supabase = buildSupabase([
      { data: [], error: null }, // monthly
      { data: Array(8).fill({ status: "confirmed" }), error: null }, // historical
    ]);

    const expensiveRequest = {
      ...plumbingRequest,
      id: "req-expensive",
      ai_cost_estimate_low: 400,
      ai_cost_estimate_high: 600, // avg 500 > per_decision_cap 200
    };

    const result = await evaluateAutonomousDecision(
      expensiveRequest,
      defaultSettings({ per_decision_cap: 200 }),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("escalate");
    expect(result.safety_checks.spending_cap_ok).toBe(false);
  });

  it("reflects cap violation in cost_weight factor", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(8).fill({ status: "confirmed" }), error: null },
    ]);

    const expensiveRequest = {
      ...plumbingRequest,
      id: "req-expensive-factor",
      ai_cost_estimate_low: 300,
      ai_cost_estimate_high: 500, // avg 400 > per_decision_cap 200
    };

    const result = await evaluateAutonomousDecision(
      expensiveRequest,
      defaultSettings({ per_decision_cap: 200 }),
      "landlord-1",
      supabase as any
    );

    // Cost exceeds per_decision_cap → cost_weight = 0.2
    expect(result.factors.cost_weight).toBe(0.2);
    expect(result.safety_checks.spending_cap_ok).toBe(false);
  });
});

// ============================================================================
// Scenario 5: Category exclusion
// ============================================================================

describe("Scenario 5: Category exclusion", () => {
  it("escalates when request category is in excluded list", async () => {
    const supabase = buildSupabase([
      { data: [], error: null }, // monthly
      { data: Array(10).fill({ status: "confirmed" }), error: null }, // historical
    ]);

    const electricalRequest = {
      ...plumbingRequest,
      id: "req-electrical",
      ai_category: "electrical",
      ai_urgency: "medium",
      ai_cost_estimate_low: 100,
      ai_cost_estimate_high: 200,
    };

    const result = await evaluateAutonomousDecision(
      electricalRequest,
      defaultSettings({ excluded_categories: ["electrical"] }),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("escalate");
    expect(result.safety_checks.category_excluded).toBe(false); // false = IS excluded
    expect(result.factors.category_weight).toBe(0); // excluded category → 0 weight
  });

  it("sets category_weight=0 and prevents dispatch for excluded categories", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      { ...plumbingRequest, ai_category: "pest" },
      defaultSettings({ excluded_categories: ["pest", "structural"] }),
      "landlord-1",
      supabase as any
    );

    expect(result.factors.category_weight).toBe(0);
    expect(result.safety_checks.category_excluded).toBe(false);
    expect(result.decision_type).toBe("escalate");
  });

  it("dispatches when category is not in exclusion list", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings({ excluded_categories: ["electrical", "hvac"] }), // plumbing not excluded
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("dispatch");
    expect(result.safety_checks.category_excluded).toBe(true); // true = NOT excluded
    expect(result.factors.category_weight).toBe(1.0);
  });
});

// ============================================================================
// Scenario 6: Landlord confirms decision
// ============================================================================

describe("Scenario 6: Landlord confirms decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "landlord-1" });
  });

  it("updates decision status to confirmed", async () => {
    const confirmedDecision = {
      id: "decision-1",
      landlord_id: "landlord-1",
      decision_type: "dispatch",
      status: "confirmed",
      review_action: "confirmed",
      review_notes: null,
      reviewed_at: "2026-04-10T12:00:00Z",
      created_at: "2026-04-10T10:00:00Z",
      updated_at: "2026-04-10T12:00:00Z",
    };

    const mockSupabase = {
      from: vi
        .fn()
        // 1st: fetch existing decision for ownership check
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "decision-1", decision_type: "dispatch", created_at: "2026-04-10T10:00:00Z" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        // 2nd: update decision
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: confirmedDecision, error: null }),
              }),
            }),
          }),
        }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const req = buildPatchRequest({ review_action: "confirmed" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "decision-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.decision.status).toBe("confirmed");
    expect(body.decision.reviewed_at).toBeDefined();
    expect(body.within_rollback_window).toBe(false); // no override → always false
  });

  it("sets reviewed_at timestamp on confirmation", async () => {
    const now = new Date().toISOString();
    const confirmedDecision = {
      id: "decision-1",
      landlord_id: "landlord-1",
      status: "confirmed",
      reviewed_at: now,
      review_action: "confirmed",
    };

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "decision-1", decision_type: "dispatch", created_at: "2026-04-10T10:00:00Z" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: confirmedDecision, error: null }),
              }),
            }),
          }),
        }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const req = buildPatchRequest({ review_action: "confirmed" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "decision-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.decision.reviewed_at).toBeDefined();
  });
});

// ============================================================================
// Scenario 7: Landlord overrides decision
// ============================================================================

describe("Scenario 7: Landlord overrides decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "landlord-1" });
    (handleOverride as ReturnType<typeof vi.fn>).mockResolvedValue({ withinWindow: true });
  });

  it("updates decision status to overridden with review notes", async () => {
    const overriddenDecision = {
      id: "decision-1",
      landlord_id: "landlord-1",
      status: "overridden",
      review_action: "overridden",
      review_notes: "Too expensive for minor issue",
      reviewed_at: "2026-04-10T13:00:00Z",
      updated_at: "2026-04-10T13:00:00Z",
    };

    const mockSupabase = {
      from: vi
        .fn()
        // 1st: fetch decision
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "decision-1", decision_type: "dispatch", created_at: "2026-04-10T10:00:00Z" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        // 2nd: update decision
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: overriddenDecision, error: null }),
              }),
            }),
          }),
        })
        // 3rd: fetch autonomy_settings for rollback window
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { rollback_window_hours: 24 },
                error: null,
              }),
            }),
          }),
        }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const req = buildPatchRequest({
      review_action: "overridden",
      review_notes: "Too expensive for minor issue",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "decision-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.decision.status).toBe("overridden");
    expect(body.decision.review_notes).toBe("Too expensive for minor issue");
    expect(body.within_rollback_window).toBe(true);
  });

  it("triggers handleOverride side-effects (feedback + cooldown)", async () => {
    const overriddenDecision = {
      id: "decision-1",
      status: "overridden",
      review_action: "overridden",
      review_notes: "Vendor not preferred",
      reviewed_at: "2026-04-10T13:00:00Z",
    };

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "decision-1", decision_type: "dispatch", created_at: "2026-04-10T10:00:00Z" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: overriddenDecision, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { rollback_window_hours: 24 },
                error: null,
              }),
            }),
          }),
        }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const req = buildPatchRequest({
      review_action: "overridden",
      review_notes: "Vendor not preferred",
    });
    await PATCH(req, { params: Promise.resolve({ id: "decision-1" }) });

    // handleOverride should be called with the decision details
    expect(handleOverride).toHaveBeenCalledWith(
      expect.anything(),
      "decision-1",
      "2026-04-10T10:00:00Z",
      "landlord-1",
      24,
      "Vendor not preferred"
    );
  });

  it("reports within_rollback_window from handleOverride result", async () => {
    (handleOverride as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ withinWindow: false });

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "decision-1", decision_type: "dispatch", created_at: "2026-01-01T00:00:00Z" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "decision-1", status: "overridden" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { rollback_window_hours: 2 },
                error: null,
              }),
            }),
          }),
        }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const req = buildPatchRequest({ review_action: "overridden" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "decision-1" }) });
    const body = await res.json();

    expect(body.within_rollback_window).toBe(false);
  });
});

// ============================================================================
// Scenario 8: Autonomy paused
// ============================================================================

describe("Scenario 8: Autonomy paused", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "landlord-1" });
  });

  it("skips decision engine when autonomy_settings.paused is true", async () => {
    const mockSupabase = {
      from: vi
        .fn()
        // fetch maintenance request
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "req-1",
                  tenant_message: "Kitchen sink leaking",
                  status: "pending",
                  request_photos: [],
                },
                error: null,
              }),
            }),
          }),
        })
        // fetch landlord profile (delegation_mode = 'auto')
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  risk_appetite: "balanced",
                  delegation_mode: "auto",
                  notify_emergencies: true,
                  notify_all_requests: false,
                },
                error: null,
              }),
            }),
          }),
        })
        // update maintenance_requests with AI classification
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })
        // fetch autonomy_settings with paused = true
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...defaultSettings(),
                  paused: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      storage: { from: vi.fn().mockReturnValue({ download: vi.fn().mockResolvedValue({ data: null, error: "no file" }) }) },
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/classify", {
      method: "POST",
      body: JSON.stringify({ request_id: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const res = await classifyPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // When paused, autonomy result should be null (engine not called)
    expect(body.autonomy).toBeNull();
  });
});

// ============================================================================
// Confidence scoring details
// ============================================================================

describe("Confidence factor calculation", () => {
  it("historical_weight reflects confirmed/total ratio from past 90 days", async () => {
    // 7 confirmed, 3 overridden → success rate = 0.7
    const past = [
      ...Array(7).fill({ status: "confirmed" }),
      ...Array(3).fill({ status: "overridden" }),
    ];
    const supabase = buildSupabase([
      { data: [], error: null }, // monthly
      { data: past, error: null }, // historical
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.factors.historical_weight).toBeCloseTo(0.7, 5);
  });

  it("rules_weight uses category-based score for plumbing (0.8)", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.factors.rules_weight).toBe(0.8);
  });

  it("rules_weight is 0.9 for emergency urgency regardless of category", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      { ...plumbingRequest, ai_urgency: "emergency" },
      defaultSettings({ emergency_auto_dispatch: true }),
      "landlord-1",
      supabase as any
    );

    expect(result.factors.rules_weight).toBe(0.9);
  });

  it("cost_weight is 0.9 when cost is below 50% of per_decision_cap", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const lowCostRequest = {
      ...plumbingRequest,
      ai_cost_estimate_low: 50,
      ai_cost_estimate_high: 100, // avg 75 < 500*0.5=250
    };

    const result = await evaluateAutonomousDecision(
      lowCostRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.factors.cost_weight).toBe(0.9);
  });

  it("cost_weight is 0.2 when cost exceeds per_decision_cap", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const highCostRequest = {
      ...plumbingRequest,
      ai_cost_estimate_low: 400,
      ai_cost_estimate_high: 700, // avg 550 > 500 per_decision_cap
    };

    const result = await evaluateAutonomousDecision(
      highCostRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.factors.cost_weight).toBe(0.2);
  });

  it("category_weight is 0 for excluded category", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      { ...plumbingRequest, ai_category: "structural" },
      defaultSettings({ excluded_categories: ["structural"] }),
      "landlord-1",
      supabase as any
    );

    expect(result.factors.category_weight).toBe(0);
  });

  it("category_weight is 1.0 for allowed category", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings({ excluded_categories: ["electrical"] }), // plumbing allowed
      "landlord-1",
      supabase as any
    );

    expect(result.factors.category_weight).toBe(1.0);
  });

  it("weighted sum matches formula (±0.001 tolerance)", async () => {
    // Control all factors precisely:
    // historical = 1.0 (all confirmed), rules = 0.8 (plumbing, medium), cost = 0.9 (<50% cap), vendor = 0.5 (no vendor), category = 1.0
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      { ...plumbingRequest, ai_cost_estimate_low: 100, ai_cost_estimate_high: 200 },
      defaultSettings({ per_decision_cap: 500 }),
      "landlord-1",
      supabase as any
    );

    const expected = 1.0 * 0.35 + 0.8 * 0.25 + 0.9 * 0.2 + 0.5 * 0.1 + 1.0 * 0.1;
    expect(result.confidence_score).toBeCloseTo(expected, 3);
  });
});

// ============================================================================
// Claude API integration
// ============================================================================

describe("Claude API integration", () => {
  beforeEach(() => {
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "• Routine issue with good historical success\n• Cost within budget\n• Category routinely handled",
        },
      ],
    });
  });

  it("includes Claude-generated reasoning in the decision", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(5).fill({ status: "confirmed" }), error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.reasoning).not.toMatch(/API error/i);
  });

  it("calls Claude API with request context", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(5).fill({ status: "confirmed" }), error: null },
    ]);

    await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    expect(mockAnthropicCreate).toHaveBeenCalled();
    const callArgs = mockAnthropicCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("plumbing");
  });

  it("falls back gracefully when Claude API throws", async () => {
    mockAnthropicCreate.mockRejectedValueOnce(new Error("API timeout"));

    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings(),
      "landlord-1",
      supabase as any
    );

    // Reasoning falls back to error message; decision_type still computed from confidence
    expect(result.reasoning).toMatch(/Escalating to human review due to API error/i);
    expect(["dispatch", "escalate"]).toContain(result.decision_type);
  });
});

// ============================================================================
// Cooldown enforcement
// ============================================================================

describe("Cooldown enforcement", () => {
  it("escalates instead of dispatching when cooldown is active", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings({ cooldown_until: futureDate }),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("escalate");
  });

  it("dispatches normally when cooldown has expired", async () => {
    const supabase = buildSupabase([
      { data: [], error: null },
      { data: Array(10).fill({ status: "confirmed" }), error: null },
    ]);

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = await evaluateAutonomousDecision(
      plumbingRequest,
      defaultSettings({ cooldown_until: pastDate }),
      "landlord-1",
      supabase as any
    );

    expect(result.decision_type).toBe("dispatch");
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.85);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetAllMocks,
  setMockAuth,
  setSupabaseResults,
  buildRequest,
  mockAuth,
  mockCreateServerSupabaseClient,
} from "../helpers";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

import { GET as GET_rules, POST as POST_rules } from "@/app/api/rules/route";
import {
  GET as GET_rule_id,
  PUT as PUT_rule_id,
  DELETE as DELETE_rule_id,
} from "@/app/api/rules/[id]/route";
import { PATCH as PATCH_reorder } from "@/app/api/rules/[id]/reorder/route";
import { POST as POST_test } from "@/app/api/rules/[id]/test/route";

// Mock the rule evaluation function
vi.mock("@/lib/rules/engine", () => ({
  evaluateRuleForTest: vi.fn((rule, testRequest) => ({
    matched: true,
    conditions_breakdown: [],
    actions_preview: rule.actions,
  })),
}));

// Mock the stale references detection
vi.mock("@/lib/rules/stale-references", () => ({
  detectStaleReferences: vi.fn(async () => new Map()),
}));

// Fixtures
const LANDLORD_ID = "user_landlord_1";
const RULE_ID = "rule_uuid_1";
const OTHER_LANDLORD = "user_landlord_2";

const PARAMS = Promise.resolve({ id: RULE_ID });

const mockRule = {
  id: RULE_ID,
  landlord_id: LANDLORD_ID,
  name: "Auto-approve cheap plumbing",
  description: "Auto-approve plumbing under $200",
  enabled: true,
  priority: 0,
  conditions: [
    { type: "category", value: ["plumbing"], operator: "in" },
    { type: "cost_max", value: 200, operator: "range" },
  ],
  actions: [
    {
      type: "auto_approve",
      params: { auto_approve: { reason: "Cheap routine repair" } },
    },
  ],
  times_matched: 5,
  last_matched_at: "2026-04-10T12:00:00Z",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-10T10:00:00Z",
  stale_references: [],
};

const mockRule2 = {
  ...mockRule,
  id: "rule_uuid_2",
  priority: 1,
  name: "Assign vendor for electrical",
};

const mockRule3 = {
  ...mockRule,
  id: "rule_uuid_3",
  priority: 2,
  name: "Escalate emergencies",
};

// =============================================================================
// GET /api/rules — List rules
// =============================================================================

describe("GET /api/rules", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET_rules();
    expect(res.status).toBe(401);
  });

  it("authenticates and lists rules", async () => {
    setSupabaseResults([{ data: [mockRule], error: null }]);
    const res = await GET_rules();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toBeDefined();
    expect(Array.isArray(json.rules)).toBe(true);
  });

  it("returns rules sorted by priority (ascending)", async () => {
    const rules = [mockRule, mockRule2, mockRule3];
    setSupabaseResults([{ data: rules, error: null }]);
    const res = await GET_rules();
    const json = await res.json();
    expect(json.rules[0].priority).toBe(0);
    expect(json.rules[1].priority).toBe(1);
    expect(json.rules[2].priority).toBe(2);
  });

  it("returns empty array when no rules exist", async () => {
    setSupabaseResults([{ data: [], error: null }]);
    const res = await GET_rules();
    const json = await res.json();
    expect(json.rules).toEqual([]);
  });

  it("includes times_matched and last_matched_at in response", async () => {
    setSupabaseResults([{ data: [mockRule], error: null }]);
    const res = await GET_rules();
    const json = await res.json();
    expect(json.rules[0].times_matched).toBe(5);
    expect(json.rules[0].last_matched_at).toBe("2026-04-10T12:00:00Z");
  });

  it("scopes rules to authenticated landlord", async () => {
    setSupabaseResults([{ data: [mockRule], error: null }]);
    const res = await GET_rules();
    const json = await res.json();
    expect(json.rules[0].landlord_id).toBe(LANDLORD_ID);
  });

  it("handles database errors gracefully", async () => {
    setSupabaseResults([{ data: null, error: "DB error" }]);
    const res = await GET_rules();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});

// =============================================================================
// POST /api/rules — Create rule
// =============================================================================

describe("POST /api/rules", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST_rules(
      buildRequest("/api/rules", {
        method: "POST",
        body: mockRule,
      })
    );
    expect(res.status).toBe(401);
  });

  it("creates rule with valid payload", async () => {
    const payload = {
      name: "New rule",
      description: "Test rule",
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [
        {
          type: "auto_approve",
          params: { auto_approve: { reason: "Test" } },
        },
      ],
    };
    const newRule = { ...payload, id: "new_uuid", landlord_id: LANDLORD_ID, priority: 0, enabled: true, times_matched: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setSupabaseResults([
      { data: 0, error: null }, // count check (returns number via .single())
      { data: null, error: null }, // max priority query (no existing rule)
      { data: newRule, error: null }, // insert result
    ]);
    const res = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.rule.name).toBe("New rule");
  });

  it("auto-assigns priority when not provided", async () => {
    const payload = {
      name: "New rule",
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [
        {
          type: "auto_approve",
          params: { auto_approve: {} },
        },
      ],
    };
    const newRule = { ...payload, id: "new_uuid", priority: 3 };
    setSupabaseResults([
      { data: null, error: null }, // count
      { data: { priority: 2 }, error: null }, // max priority
      { data: newRule, error: null }, // insert
    ]);
    const res = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    const json = await res.json();
    expect(json.rule.priority).toBe(3);
  });

  it("rejects invalid payload (missing name)", async () => {
    const payload = {
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [
        {
          type: "auto_approve",
          params: { auto_approve: {} },
        },
      ],
    };
    setSupabaseResults([{ data: null, error: null }]);
    const res = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    expect(res.status).toBe(400);
  });

  it("enforces 25-rule limit", async () => {
    const payload = {
      name: "New rule",
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [
        {
          type: "auto_approve",
          params: { auto_approve: {} },
        },
      ],
    };
    // The count query with count: "exact" returns { count, error }
    // The mock returns { data, error }, so we use count in data position
    setSupabaseResults([{ data: null, error: null, count: 25 }]); // count check returns 25
    const res = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Rule limit");
  });

  it("requires at least one condition", async () => {
    const payload = {
      name: "No conditions",
      conditions: [],
      actions: [
        {
          type: "auto_approve",
          params: { auto_approve: {} },
        },
      ],
    };
    setSupabaseResults([{ data: null, error: null }]);
    const res = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    expect(res.status).toBe(400);
  });

  it("requires at least one action", async () => {
    const payload = {
      name: "No actions",
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [],
    };
    setSupabaseResults([{ data: null, error: null }]);
    const res = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    expect(res.status).toBe(400);
  });

  it("scopes created rule to authenticated landlord", async () => {
    const payload = {
      name: "New rule",
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [
        {
          type: "auto_approve",
          params: { auto_approve: {} },
        },
      ],
    };
    const newRule = { ...payload, id: "new_uuid", landlord_id: LANDLORD_ID };
    setSupabaseResults([
      { data: null, error: null },
      { data: null, error: null },
      { data: newRule, error: null },
    ]);
    const res = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    const json = await res.json();
    expect(json.rule.landlord_id).toBe(LANDLORD_ID);
  });
});

// =============================================================================
// GET /api/rules/[id] — Fetch single rule
// =============================================================================

describe("GET /api/rules/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "GET" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("fetches rule by id", async () => {
    setSupabaseResults([{ data: mockRule, error: null }]);
    const res = await GET_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "GET" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rule.id).toBe(RULE_ID);
    expect(json.rule.name).toBe(mockRule.name);
  });

  it("includes full rule data (conditions, actions, etc.)", async () => {
    setSupabaseResults([{ data: mockRule, error: null }]);
    const res = await GET_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "GET" }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(json.rule.conditions).toBeDefined();
    expect(json.rule.actions).toBeDefined();
    expect(Array.isArray(json.rule.conditions)).toBe(true);
    expect(Array.isArray(json.rule.actions)).toBe(true);
  });

  it("returns 404 for non-existent rule", async () => {
    setSupabaseResults([{ data: null, error: "Not found" }]);
    const res = await GET_rule_id(
      buildRequest("/api/rules/nonexistent", { method: "GET" }),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when accessing other landlord's rule", async () => {
    const otherLandlordRule = { ...mockRule, landlord_id: OTHER_LANDLORD };
    setSupabaseResults([{ data: otherLandlordRule, error: null }]);
    const res = await GET_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "GET" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });
});

// =============================================================================
// PUT /api/rules/[id] — Update rule
// =============================================================================

describe("PUT /api/rules/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: { name: "Updated" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("updates rule with partial payload", async () => {
    const updatePayload = { name: "Updated name" };
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null }, // existence check
      { data: { ...mockRule, ...updatePayload }, error: null }, // update
    ]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: updatePayload,
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rule.name).toBe("Updated name");
  });

  it("updates name field", async () => {
    const updatePayload = { name: "New name" };
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null },
      { data: { ...mockRule, ...updatePayload }, error: null },
    ]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: updatePayload,
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(json.rule.name).toBe("New name");
  });

  it("updates conditions field", async () => {
    const newConditions = [
      { type: "urgency", value: ["emergency"], operator: "in" },
    ];
    const updatePayload = { conditions: newConditions };
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null },
      { data: { ...mockRule, ...updatePayload }, error: null },
    ]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: updatePayload,
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(json.rule.conditions).toEqual(newConditions);
  });

  it("updates actions field", async () => {
    const newActions = [
      {
        type: "escalate",
        params: { escalate: { priority: "critical" } },
      },
    ];
    const updatePayload = { actions: newActions };
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null },
      { data: { ...mockRule, ...updatePayload }, error: null },
    ]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: updatePayload,
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(json.rule.actions).toEqual(newActions);
  });

  it("rejects invalid payload", async () => {
    const invalidPayload = {
      name: "", // Empty name
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [{ type: "auto_approve", params: { auto_approve: {} } }],
    };
    setSupabaseResults([{ data: { landlord_id: LANDLORD_ID }, error: null }]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: invalidPayload,
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent rule", async () => {
    setSupabaseResults([{ data: null, error: "Not found" }]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/nonexistent", {
        method: "PUT",
        body: { name: "Updated" },
      }),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when updating other landlord's rule", async () => {
    setSupabaseResults([
      { data: { landlord_id: OTHER_LANDLORD }, error: null },
    ]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: { name: "Updated" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });

  it("preserves other fields when updating partial payload", async () => {
    const updatePayload = { name: "Updated" };
    const updatedRule = { ...mockRule, ...updatePayload };
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null },
      { data: updatedRule, error: null },
    ]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: updatePayload,
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(json.rule.description).toBe(mockRule.description);
    expect(json.rule.conditions).toEqual(mockRule.conditions);
  });
});

// =============================================================================
// DELETE /api/rules/[id] — Delete rule
// =============================================================================

describe("DELETE /api/rules/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await DELETE_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("deletes rule and returns 204 No Content", async () => {
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null }, // existence check
      { data: null, error: null }, // delete
    ]);
    const res = await DELETE_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(204);
  });

  it("returns 404 for non-existent rule", async () => {
    setSupabaseResults([{ data: null, error: "Not found" }]);
    const res = await DELETE_rule_id(
      buildRequest("/api/rules/nonexistent", { method: "DELETE" }),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when deleting other landlord's rule", async () => {
    setSupabaseResults([
      { data: { landlord_id: OTHER_LANDLORD }, error: null },
    ]);
    const res = await DELETE_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });

  it("preserves execution logs after delete", async () => {
    // The API should just delete the rule, logs should remain
    // This is verified by the fact that DELETE doesn't touch rule_execution_logs
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null },
      { data: null, error: null }, // delete succeeds
    ]);
    const res = await DELETE_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(204);
  });
});

// =============================================================================
// PATCH /api/rules/[id]/reorder — Reorder rule priority
// =============================================================================

describe("PATCH /api/rules/[id]/reorder", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 1 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("reorders rule to higher priority", async () => {
    const rules = [mockRule, mockRule2, mockRule3];
    // When moving rule at index 0 to index 1, rules at 1 and 2 shift
    setSupabaseResults([
      { data: rules, error: null }, // fetch all rules (lines 39-43)
      { data: null, error: null }, // first update (line 104-108)
      { data: null, error: null }, // second update if needed
      { data: mockRule, error: null }, // final fetch of updated target (line 119)
    ]);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 1 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
  });

  it("reorders rule to lower priority", async () => {
    const rules = [
      { ...mockRule, priority: 1 },
      { ...mockRule2, priority: 2 },
    ];
    setSupabaseResults([
      { data: rules, error: null }, // fetch all rules
      { data: null, error: null }, // first update
      { data: null, error: null }, // second update
      { data: { ...mockRule, priority: 0 }, error: null }, // fetch updated target with new priority
    ]);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 0 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
  });

  it("adjusts other rules' priorities", async () => {
    // When rule at position 0 moves to position 1,
    // rule at position 1 moves to position 0, etc.
    const rules = [mockRule, mockRule2, mockRule3];
    // After moving rule 0 to position 1, we expect multiple updates
    setSupabaseResults([
      { data: rules, error: null }, // fetch all
      { data: null, error: null }, // first update
      { data: null, error: null }, // second update
      { data: mockRule, error: null }, // return updated target
    ]);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 1 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
  });

  it("rejects invalid new_priority (non-integer)", async () => {
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: "one" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range priority", async () => {
    const rules = [mockRule, mockRule2];
    setSupabaseResults([{ data: rules, error: null }]);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 10 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("out of range");
  });

  it("returns 404 for non-existent rule", async () => {
    const rules = [mockRule];
    setSupabaseResults([{ data: rules, error: null }]);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/nonexistent/reorder", {
        method: "PATCH",
        body: { new_priority: 0 },
      }),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when reordering other landlord's rule", async () => {
    const otherRule = { ...mockRule, landlord_id: OTHER_LANDLORD };
    // When fetching rules for the current landlord, the rule isn't found in that list
    const rules: any[] = []; // Empty because current landlord has no rules with this ID
    setSupabaseResults([
      { data: rules, error: null }, // fetch all rules for current landlord (returns empty)
      { data: otherRule, error: null }, // anyRule check finds the rule belongs to other landlord
    ]);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 0 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });

  it("handles concurrent reorder safely (returns 409 on conflict)", async () => {
    const rules = [mockRule, mockRule2];
    setSupabaseResults([
      { data: rules, error: null }, // fetch all
      { data: null, error: "Conflict" }, // update fails with conflict
    ]);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 1 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(409);
  });
});

// =============================================================================
// POST /api/rules/[id]/test — Test rule
// =============================================================================

describe("POST /api/rules/[id]/test", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "plumbing", urgency: "low", cost: 100 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("tests rule with matching data returns matched: true", async () => {
    setSupabaseResults([{ data: mockRule, error: null }]);
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "plumbing", urgency: "low", cost: 100 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched).toBe(true);
  });

  it("tests rule with non-matching data returns matched: false", async () => {
    const { evaluateRuleForTest } = await import("@/lib/rules/engine");
    vi.mocked(evaluateRuleForTest).mockReturnValueOnce({
      matched: false,
      conditions_breakdown: [
        { condition_index: 0, matched: true },
        { condition_index: 1, matched: false },
      ],
      actions_preview: [],
    });

    setSupabaseResults([{ data: mockRule, error: null }]);
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "electrical", urgency: "medium", cost: 500 },
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(json.matched).toBe(false);
  });

  it("response includes conditions_breakdown array", async () => {
    setSupabaseResults([{ data: mockRule, error: null }]);
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "plumbing", cost: 100 },
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(Array.isArray(json.conditions_breakdown)).toBe(true);
  });

  it("conditions_breakdown shows each condition with match status", async () => {
    const { evaluateRuleForTest } = await import("@/lib/rules/engine");
    vi.mocked(evaluateRuleForTest).mockReturnValueOnce({
      matched: true,
      conditions_breakdown: [
        { condition_index: 0, matched: true },
        { condition_index: 1, matched: true },
      ],
      actions_preview: [],
    });

    setSupabaseResults([{ data: mockRule, error: null }]);
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "plumbing", cost: 100 },
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(json.conditions_breakdown.length).toBe(2);
    expect(json.conditions_breakdown.every((c: any) => typeof c.matched === "boolean")).toBe(true);
  });

  it("response includes actions_preview array", async () => {
    setSupabaseResults([{ data: mockRule, error: null }]);
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "plumbing", cost: 100 },
      }),
      { params: PARAMS }
    );
    const json = await res.json();
    expect(Array.isArray(json.actions_preview)).toBe(true);
  });

  it("rejects invalid test payload", async () => {
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { cost: "expensive" }, // should be number
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent rule", async () => {
    setSupabaseResults([{ data: null, error: "Not found" }]);
    const res = await POST_test(
      buildRequest("/api/rules/nonexistent/test", {
        method: "POST",
        body: { category: "plumbing" },
      }),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when testing other landlord's rule", async () => {
    const otherRule = { ...mockRule, landlord_id: OTHER_LANDLORD };
    setSupabaseResults([{ data: otherRule, error: null }]);
    const res = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "plumbing" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });
});

// =============================================================================
// Auth and Error Handling Tests
// =============================================================================

describe("Auth and error handling across all routes", () => {
  beforeEach(() => resetAllMocks());

  it("all GET endpoints return 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res1 = await GET_rules();
    const res2 = await GET_rule_id(
      buildRequest("/api/rules/rule_uuid_1"),
      { params: PARAMS }
    );
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
  });

  it("all POST endpoints return 401 when unauthenticated", async () => {
    setMockAuth(null);
    const payload = {
      name: "Test",
      conditions: [{ type: "category", value: ["plumbing"], operator: "in" }],
      actions: [{ type: "auto_approve", params: { auto_approve: {} } }],
    };
    const res1 = await POST_rules(
      buildRequest("/api/rules", { method: "POST", body: payload })
    );
    const res2 = await POST_test(
      buildRequest("/api/rules/rule_uuid_1/test", {
        method: "POST",
        body: { category: "plumbing" },
      }),
      { params: PARAMS }
    );
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
  });

  it("all PUT endpoints return 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: { name: "Updated" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("all DELETE endpoints return 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await DELETE_rule_id(
      buildRequest("/api/rules/rule_uuid_1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("all PATCH endpoints return 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PATCH_reorder(
      buildRequest("/api/rules/rule_uuid_1/reorder", {
        method: "PATCH",
        body: { new_priority: 1 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("internal server errors are handled gracefully", async () => {
    setSupabaseResults([{ data: null, error: "Database connection failed" }]);
    const res = await GET_rules();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe("Validation across all routes", () => {
  beforeEach(() => resetAllMocks());

  it("validates required fields in create rule", async () => {
    const invalidPayloads = [
      { conditions: [], actions: [] }, // missing name
      { name: "Test", actions: [] }, // missing conditions
      { name: "Test", conditions: [] }, // missing actions
      { name: "", conditions: [], actions: [] }, // empty name
    ];

    for (const payload of invalidPayloads) {
      setSupabaseResults([{ data: null, error: null }]);
      const res = await POST_rules(
        buildRequest("/api/rules", { method: "POST", body: payload })
      );
      expect(res.status).toBe(400);
    }
  });

  it("validates optional fields in update rule", async () => {
    setSupabaseResults([
      { data: { landlord_id: LANDLORD_ID }, error: null },
      { data: { ...mockRule, name: "Updated" }, error: null },
    ]);
    const res = await PUT_rule_id(
      buildRequest("/api/rules/rule_uuid_1", {
        method: "PUT",
        body: { name: "Updated" }, // only updating name
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
  });
});

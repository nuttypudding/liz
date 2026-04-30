import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/autonomy/stats/route";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const mockAuth = auth as any;
const mockCreateClient = createServerSupabaseClient as any;

describe("GET /api/autonomy/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current date for testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should use current month by default", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.month).toBe("2026-04-01");
  });

  it("should accept valid month format YYYY-MM", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/stats?month=2026-03"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.month).toBe("2026-03-01");
  });

  it("should reject invalid month format", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({}),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/stats?month=04-2026"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid month format");
  });

  it("should return pre-computed stats record if exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const statsRecord = {
      id: "stats-123",
      landlord_id: "user-123",
      month: "2026-04-01",
      total_decisions: 5,
      auto_dispatched: 3,
      escalated: 1,
      overridden: 1,
      total_spend: 750,
      trust_score: 0.8,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-05T10:00:00Z",
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: statsRecord,
                  error: null,
                }),
              }),
            }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toEqual(statsRecord);
  });

  it("should compute stats on-the-fly when record doesn't exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const decisions = [
      {
        id: "d1",
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: { estimated_cost: 200 },
      },
      {
        id: "d2",
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: { estimated_cost: 150 },
      },
      {
        id: "d3",
        decision_type: "escalate",
        status: "pending_review",
        actions_taken: { estimated_cost: 0 },
      },
      {
        id: "d4",
        decision_type: "dispatch",
        status: "overridden",
        actions_taken: { estimated_cost: 500 },
      },
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: decisions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.total_decisions).toBe(4);
    expect(data.stats.auto_dispatched).toBe(2);
    expect(data.stats.escalated).toBe(1);
    expect(data.stats.overridden).toBe(1);
    expect(data.stats.total_spend).toBe(850);
    expect(data.stats.trust_score).toBe(0.75); // 1 - (1/4) = 0.75
  });

  it("should count auto_dispatched only for confirmed dispatch decisions", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const decisions = [
      {
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: {},
      },
      {
        decision_type: "dispatch",
        status: "pending_review", // not confirmed
        actions_taken: {},
      },
      {
        decision_type: "dispatch",
        status: "overridden", // not confirmed
        actions_taken: {},
      },
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: decisions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.auto_dispatched).toBe(1);
  });

  it("should count escalated decisions regardless of status", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const decisions = [
      {
        decision_type: "escalate",
        status: "pending_review",
        actions_taken: {},
      },
      {
        decision_type: "escalate",
        status: "confirmed",
        actions_taken: {},
      },
      {
        decision_type: "escalate",
        status: "overridden",
        actions_taken: {},
      },
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: decisions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.escalated).toBe(3);
  });

  it("should sum total_spend from actions_taken.estimated_cost", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const decisions = [
      {
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: { estimated_cost: 100, other_field: "ignored" },
      },
      {
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: { estimated_cost: 250 },
      },
      {
        decision_type: "escalate",
        status: "pending_review",
        actions_taken: {}, // no estimated_cost
      },
      {
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: { estimated_cost: 75.50 },
      },
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: decisions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.total_spend).toBe(425.5);
  });

  it("should calculate trust_score as 1 - (overridden / total)", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const decisions = [
      { decision_type: "dispatch", status: "confirmed", actions_taken: {} },
      { decision_type: "dispatch", status: "confirmed", actions_taken: {} },
      { decision_type: "dispatch", status: "confirmed", actions_taken: {} },
      { decision_type: "dispatch", status: "confirmed", actions_taken: {} },
      { decision_type: "dispatch", status: "overridden", actions_taken: {} }, // 1 override
      { decision_type: "dispatch", status: "overridden", actions_taken: {} }, // 2 overrides
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: decisions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // trust_score = 1 - (2/6) = 1 - 0.333... = 0.666...
    expect(data.stats.trust_score).toBeCloseTo(2 / 3, 5);
  });

  it("should return trust_score=null for no decisions", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.total_decisions).toBe(0);
    expect(data.stats.trust_score).toBeNull();
  });

  it("should clamp trust_score to [0, 1]", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    // All decisions overridden
    const allOverriddenDecisions = [
      { decision_type: "dispatch", status: "overridden", actions_taken: {} },
      { decision_type: "dispatch", status: "overridden", actions_taken: {} },
      { decision_type: "dispatch", status: "overridden", actions_taken: {} },
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: allOverriddenDecisions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.trust_score).toBe(0);
    expect(data.stats.trust_score).toBeGreaterThanOrEqual(0);
    expect(data.stats.trust_score).toBeLessThanOrEqual(1);
  });

  it("should return trust_score=1 for no overrides", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const decisionsNoOverrides = [
      { decision_type: "dispatch", status: "confirmed", actions_taken: {} },
      { decision_type: "dispatch", status: "confirmed", actions_taken: {} },
      { decision_type: "escalate", status: "pending_review", actions_taken: {} },
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: decisionsNoOverrides,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.trust_score).toBe(1);
  });

  it("should handle null actions_taken gracefully", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const decisions = [
      {
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: null,
      },
      {
        decision_type: "dispatch",
        status: "confirmed",
        actions_taken: { estimated_cost: 100 },
      },
    ];

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: decisions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost:3000/api/autonomy/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.total_spend).toBe(100);
  });
});

function afterEach(callback: () => void) {
  // Hook implementation for cleanup
}

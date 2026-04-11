import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/autonomy/decisions/route";
import { PATCH } from "@/app/api/autonomy/decisions/[id]/route";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock updateMonthlyStats
vi.mock("@/lib/autonomy/updateMonthlyStats", () => ({
  updateMonthlyStats: vi.fn().mockResolvedValue(undefined),
  monthFromIso: vi.fn().mockReturnValue("2026-04"),
}));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const mockAuth = auth as any;
const mockCreateClient = createServerSupabaseClient as any;

const createRequest = (body: any, method = "POST") => {
  return new NextRequest("http://localhost:3000/api/autonomy/decisions", {
    method,
    body: JSON.stringify(body),
  });
};

const createPatchRequest = (body: any, id = "decision-123") => {
  return new NextRequest(
    `http://localhost:3000/api/autonomy/decisions/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
};

describe("GET /api/autonomy/decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/decisions"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return paginated decisions list", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockDecisions = [
      {
        id: "decision-1",
        landlord_id: "user-123",
        request_id: "req-1",
        decision_type: "dispatch",
        confidence_score: 0.85,
        status: "confirmed",
        created_at: "2026-04-10T10:00:00Z",
      },
      {
        id: "decision-2",
        landlord_id: "user-123",
        request_id: "req-2",
        decision_type: "escalate",
        confidence_score: 0.65,
        status: "pending_review",
        created_at: "2026-04-10T09:00:00Z",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValueOnce({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockDecisions,
                  error: null,
                  count: 2,
                }),
              }),
            })
            .mockReturnValueOnce({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockDecisions,
                  error: null,
                  count: 2,
                }),
              }),
            }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/decisions"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.decisions).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.limit).toBe(20);
    expect(data.offset).toBe(0);
  });

  it("should filter by status when provided", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockPendingDecisions = [
      {
        id: "decision-2",
        landlord_id: "user-123",
        request_id: "req-2",
        decision_type: "escalate",
        confidence_score: 0.65,
        status: "pending_review",
        created_at: "2026-04-10T09:00:00Z",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockPendingDecisions,
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            })
            .mockReturnValueOnce({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockPendingDecisions,
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/decisions?status=pending_review"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.decisions).toHaveLength(1);
    expect(data.decisions[0].status).toBe("pending_review");
  });

  it("should reject invalid status filter", async () => {
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
      "http://localhost:3000/api/autonomy/decisions?status=invalid"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid status value");
  });

  it("should respect pagination limit and offset", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockDecisions = [
      {
        id: "decision-5",
        landlord_id: "user-123",
        status: "confirmed",
      },
      {
        id: "decision-6",
        landlord_id: "user-123",
        status: "confirmed",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockDecisions,
                error: null,
                count: 100,
              }),
            }),
          }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/decisions?limit=2&offset=5"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(2);
    expect(data.offset).toBe(5);
    expect(data.hasMore).toBe(true);
  });

  it("should cap limit at 50", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 0,
              }),
            }),
          }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/decisions?limit=100"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(50);
  });

  it("should default limit to 20", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 0,
              }),
            }),
          }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/autonomy/decisions"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(20);
  });

  it("should reject invalid sort field", async () => {
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
      "http://localhost:3000/api/autonomy/decisions?sort=invalid_field"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid sort field");
  });
});

describe("POST /api/autonomy/decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validDecision = {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    decision_type: "dispatch",
    confidence_score: 0.85,
    reasoning: "Low cost, straightforward repair",
    factors: {
      historical_weight: 0.2,
      rules_weight: 0.3,
      cost_weight: 0.25,
      vendor_weight: 0.15,
      category_weight: 0.1,
    },
    safety_checks: {
      spending_cap_ok: true,
      category_excluded: false,
      vendor_available: true,
      emergency_eligible: false,
    },
    actions_taken: {
      vendor_dispatched: {
        vendor_id: "550e8400-e29b-41d4-a716-446655440001",
        vendor_name: "Joe's Plumbing",
      },
      notifications_sent: [
        {
          recipient: "landlord",
          method: "email",
        },
      ],
    },
  };

  it("should return 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = createRequest(validDecision);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should create decision with pending_review status", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const createdDecision = {
      id: "decision-new",
      landlord_id: "user-123",
      ...validDecision,
      status: "pending_review",
      created_at: "2026-04-10T12:00:00Z",
      updated_at: "2026-04-10T12:00:00Z",
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdDecision,
              error: null,
            }),
          }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = createRequest(validDecision);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.decision).toBeDefined();
    expect(data.decision.status).toBe("pending_review");
  });

  it("should reject invalid decision_type", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({
      ...validDecision,
      decision_type: "invalid",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject confidence_score > 1", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({
      ...validDecision,
      confidence_score: 1.5,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject negative confidence_score", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({
      ...validDecision,
      confidence_score: -0.1,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should accept valid decision_types", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const types = ["dispatch", "escalate", "hold"];

    for (const type of types) {
      const createdDecision = {
        id: "decision-new",
        ...validDecision,
        decision_type: type,
        status: "pending_review",
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: createdDecision,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockCreateClient.mockReturnValue(mockSupabase);

      const request = createRequest({
        ...validDecision,
        decision_type: type,
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    }
  });

  it("should reject missing request_id", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const { request_id, ...noRequestId } = validDecision;
    const request = createRequest(noRequestId);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject missing decision_type", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const { decision_type, ...noType } = validDecision;
    const request = createRequest(noType);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject missing confidence_score", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const { confidence_score, ...noScore } = validDecision;
    const request = createRequest(noScore);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should include field-level error details", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({
      ...validDecision,
      confidence_score: 1.5,
      decision_type: "invalid",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBe(true);
    expect(data.details.length).toBeGreaterThan(0);
  });
});

describe("PATCH /api/autonomy/decisions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = createPatchRequest({ review_action: "confirmed" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "decision-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should update decision to confirmed", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const updatedDecision = {
      id: "decision-123",
      landlord_id: "user-123",
      status: "confirmed",
      review_action: "confirmed",
      review_notes: null,
      reviewed_at: "2026-04-10T13:00:00Z",
      updated_at: "2026-04-10T13:00:00Z",
    };

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
                    data: { id: "decision-123", created_at: "2026-04-10T10:00:00Z" },
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
                  data: updatedDecision,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = createPatchRequest({ review_action: "confirmed" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "decision-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.decision.status).toBe("confirmed");
    expect(data.decision.reviewed_at).toBeDefined();
  });

  it("should update decision to overridden with notes", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const updatedDecision = {
      id: "decision-123",
      landlord_id: "user-123",
      status: "overridden",
      review_action: "overridden",
      review_notes: "Too expensive",
      reviewed_at: "2026-04-10T13:00:00Z",
      updated_at: "2026-04-10T13:00:00Z",
    };

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
                    data: { id: "decision-123", created_at: "2026-04-10T10:00:00Z" },
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
                  data: updatedDecision,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = createPatchRequest({
      review_action: "overridden",
      review_notes: "Too expensive",
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "decision-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.decision.status).toBe("overridden");
    expect(data.decision.review_notes).toBe("Too expensive");
  });

  it("should reject invalid review_action", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createPatchRequest({ review_action: "invalid" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "decision-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should return 404 for nonexistent decision", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
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
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = createPatchRequest({ review_action: "confirmed" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Decision not found");
  });
});

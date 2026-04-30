import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/autonomy/settings/route";

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

const createRequest = (body: any) => {
  return new NextRequest("http://localhost:3000/api/autonomy/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

describe("GET /api/autonomy/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return existing settings when found", async () => {
    const existingSettings = {
      id: "test-id",
      landlord_id: "user-123",
      confidence_threshold: 0.85,
      per_decision_cap: 500,
      monthly_cap: 5000,
      excluded_categories: [],
      preferred_vendors_only: false,
      require_cost_estimate: true,
      emergency_auto_dispatch: true,
      rollback_window_hours: 24,
      paused: true,
      created_at: "2026-04-10T00:00:00Z",
      updated_at: "2026-04-10T00:00:00Z",
    };

    mockAuth.mockResolvedValue({ userId: "user-123" });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingSettings,
              error: null,
            }),
          }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings).toEqual(existingSettings);
  });
});

describe("PUT /api/autonomy/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = createRequest({ confidence_threshold: 0.9 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject invalid confidence threshold (too high)", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({ confidence_threshold: 1.5 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBe(true);
  });

  it("should reject negative confidence threshold", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({ confidence_threshold: -0.1 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject zero spending cap", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({ per_decision_cap: 0 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject negative spending cap", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({ per_decision_cap: -100 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject invalid category in excluded categories", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({
      excluded_categories: ["invalid-category"],
    });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject non-array for excluded categories", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({
      excluded_categories: "plumbing",
    });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject negative rollback window", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({ rollback_window_hours: -1 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should reject non-integer rollback window", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({ rollback_window_hours: 24.5 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("should accept valid confidence threshold", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const updatedSettings = {
      id: "test-id",
      landlord_id: "user-123",
      confidence_threshold: 0.9,
      per_decision_cap: 500,
      monthly_cap: 5000,
      excluded_categories: [],
      preferred_vendors_only: false,
      require_cost_estimate: true,
      emergency_auto_dispatch: true,
      rollback_window_hours: 24,
      paused: true,
      created_at: "2026-04-10T00:00:00Z",
      updated_at: "2026-04-10T00:00:00Z",
    };

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "test-id", landlord_id: "user-123" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedSettings,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = createRequest({ confidence_threshold: 0.9 });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.confidence_threshold).toBe(0.9);
  });

  it("should accept valid excluded categories", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const updatedSettings = {
      id: "test-id",
      landlord_id: "user-123",
      confidence_threshold: 0.85,
      per_decision_cap: 500,
      monthly_cap: 5000,
      excluded_categories: ["plumbing", "electrical"],
      preferred_vendors_only: false,
      require_cost_estimate: true,
      emergency_auto_dispatch: true,
      rollback_window_hours: 24,
      paused: true,
      created_at: "2026-04-10T00:00:00Z",
      updated_at: "2026-04-10T00:00:00Z",
    };

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "test-id", landlord_id: "user-123" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedSettings,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = createRequest({
      excluded_categories: ["plumbing", "electrical"],
    });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.excluded_categories).toEqual([
      "plumbing",
      "electrical",
    ]);
  });

  it("should accept boolean fields", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const updatedSettings = {
      id: "test-id",
      landlord_id: "user-123",
      confidence_threshold: 0.85,
      per_decision_cap: 500,
      monthly_cap: 5000,
      excluded_categories: [],
      preferred_vendors_only: true,
      require_cost_estimate: false,
      emergency_auto_dispatch: false,
      rollback_window_hours: 24,
      paused: false,
      created_at: "2026-04-10T00:00:00Z",
      updated_at: "2026-04-10T00:00:00Z",
    };

    const mockSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "test-id", landlord_id: "user-123" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedSettings,
                  error: null,
                }),
              }),
            }),
          }),
        }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    const request = createRequest({
      paused: false,
      preferred_vendors_only: true,
      require_cost_estimate: false,
      emergency_auto_dispatch: false,
    });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.paused).toBe(false);
    expect(data.settings.preferred_vendors_only).toBe(true);
    expect(data.settings.require_cost_estimate).toBe(false);
  });

  it("should include field-level error details on validation failure", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });

    const request = createRequest({
      confidence_threshold: 1.5,
      per_decision_cap: 0,
    });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBe(true);
    expect(data.details.length).toBeGreaterThan(0);
    expect(data.details[0]).toHaveProperty("field");
    expect(data.details[0]).toHaveProperty("message");
  });
});

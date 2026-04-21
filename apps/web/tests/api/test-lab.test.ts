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

vi.mock("@/lib/anthropic", () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "{}" }],
      }),
    },
  },
}));

describe("Test Lab API", () => {
  beforeEach(() => resetAllMocks());

  describe("GET /api/test-lab/runs", () => {
    it("returns 401 when unauthenticated", async () => {
      setMockAuth(null);
      const { GET } = await import("@/app/api/test-lab/runs/route");
      const res = await GET(buildRequest("/api/test-lab/runs"));
      expect(res.status).toBe(401);
    });

    it("returns runs list", async () => {
      const mockRuns = [
        { id: "run-1", component_name: "triage", status: "completed", total_cases: 20, passed_cases: 18, failed_cases: 2 },
      ];
      setSupabaseResults([{ data: mockRuns, error: null }]);
      const { GET } = await import("@/app/api/test-lab/runs/route");
      const res = await GET(buildRequest("/api/test-lab/runs"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.runs).toHaveLength(1);
      expect(body.runs[0].component_name).toBe("triage");
    });
  });

  describe("POST /api/test-lab/runs", () => {
    it("returns 401 when unauthenticated", async () => {
      setMockAuth(null);
      const { POST } = await import("@/app/api/test-lab/runs/route");
      const res = await POST(
        buildRequest("/api/test-lab/runs", {
          method: "POST",
          body: { component_name: "triage" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when component_name is missing", async () => {
      const { POST } = await import("@/app/api/test-lab/runs/route");
      const res = await POST(
        buildRequest("/api/test-lab/runs", {
          method: "POST",
          body: {},
        })
      );
      expect(res.status).toBe(400);
    });

    it("creates a test run", async () => {
      const mockRun = { id: "run-1", component_name: "triage", status: "pending" };
      setSupabaseResults([{ data: mockRun, error: null }]);
      const { POST } = await import("@/app/api/test-lab/runs/route");
      const res = await POST(
        buildRequest("/api/test-lab/runs", {
          method: "POST",
          body: { component_name: "triage" },
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.run.component_name).toBe("triage");
    });
  });

  describe("GET /api/test-lab/runs/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      setMockAuth(null);
      const { GET } = await import("@/app/api/test-lab/runs/[id]/route");
      const res = await GET(
        buildRequest("/api/test-lab/runs/run-1"),
        { params: Promise.resolve({ id: "run-1" }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns run with cases", async () => {
      const mockRun = { id: "run-1", component_name: "triage", status: "completed" };
      const mockCases = [
        { id: "case-1", run_id: "run-1", sample_id: "sample_01", status: "passed" },
      ];
      setSupabaseResults([
        { data: mockRun, error: null },
        { data: mockCases, error: null },
      ]);
      const { GET } = await import("@/app/api/test-lab/runs/[id]/route");
      const res = await GET(
        buildRequest("/api/test-lab/runs/run-1"),
        { params: Promise.resolve({ id: "run-1" }) }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.run.test_cases).toHaveLength(1);
    });

    it("returns 404 when run not found", async () => {
      setSupabaseResults([{ data: null, error: { code: "PGRST116" } }]);
      const { GET } = await import("@/app/api/test-lab/runs/[id]/route");
      const res = await GET(
        buildRequest("/api/test-lab/runs/missing"),
        { params: Promise.resolve({ id: "missing" }) }
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/test-lab/components/triage/manual", () => {
    it("returns 401 when unauthenticated", async () => {
      setMockAuth(null);

      const { POST } = await import(
        "@/app/api/test-lab/components/triage/manual/route"
      );
      const res = await POST(
        buildRequest("/api/test-lab/components/triage/manual", {
          method: "POST",
          body: { message: "test" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when message is missing", async () => {
      const { POST } = await import(
        "@/app/api/test-lab/components/triage/manual/route"
      );
      const res = await POST(
        buildRequest("/api/test-lab/components/triage/manual", {
          method: "POST",
          body: {},
        })
      );
      expect(res.status).toBe(400);
    });
  });
});

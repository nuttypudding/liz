import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetAllMocks,
  setMockAuth,
  setMockRole,
  setSupabaseResults,
  buildRequest,
  mockAuth,
  mockGetRole,
  mockCreateServerSupabaseClient,
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

import { GET } from "@/app/api/requests/route";

describe("GET /api/requests", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET(buildRequest("/api/requests"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for unknown role", async () => {
    setMockRole(null);
    const res = await GET(buildRequest("/api/requests"));
    expect(res.status).toBe(403);
  });

  it("returns requests for landlord", async () => {
    // First call: get properties
    // Second call: get requests
    setSupabaseResults([
      { data: [{ id: "p1" }], error: null },
      { data: [{ id: "r1", tenant_message: "leak" }], error: null },
    ]);
    const res = await GET(buildRequest("/api/requests"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.requests).toHaveLength(1);
  });

  it("returns empty when landlord has no properties", async () => {
    setSupabaseResults([{ data: [], error: null }]);
    const res = await GET(buildRequest("/api/requests"));
    const json = await res.json();
    expect(json.requests).toEqual([]);
  });

  it("returns requests for tenant", async () => {
    setMockRole("tenant");
    setSupabaseResults([
      // tenant lookup
      { data: { id: "t1" }, error: null },
      // requests
      { data: [{ id: "r1", tenant_message: "leak" }], error: null },
    ]);
    const res = await GET(buildRequest("/api/requests"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.requests).toHaveLength(1);
  });

  it("returns empty when tenant record not found", async () => {
    setMockRole("tenant");
    setSupabaseResults([{ data: null, error: { message: "not found" } }]);
    const res = await GET(buildRequest("/api/requests"));
    const json = await res.json();
    expect(json.requests).toEqual([]);
  });
});

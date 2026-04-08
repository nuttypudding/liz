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

import { GET, PATCH, DELETE } from "@/app/api/properties/[id]/route";

const PARAMS = Promise.resolve({ id: "p1" });

describe("GET /api/properties/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET(buildRequest("/api/properties/p1"), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is tenant", async () => {
    setMockRole("tenant");
    const res = await GET(buildRequest("/api/properties/p1"), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("returns 404 when property not found", async () => {
    setSupabaseResults([{ data: null, error: { message: "not found" } }]);
    const res = await GET(buildRequest("/api/properties/p1"), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns property for landlord", async () => {
    setSupabaseResults([
      { data: { id: "p1", name: "Test", tenants: [] }, error: null },
    ]);
    const res = await GET(buildRequest("/api/properties/p1"), { params: PARAMS });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.property.id).toBe("p1");
  });
});

describe("PATCH /api/properties/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PATCH(
      buildRequest("/api/properties/p1", { method: "PATCH", body: { name: "New" } }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await PATCH(
      buildRequest("/api/properties/p1", {
        method: "PATCH",
        body: { unit_count: -1 },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("updates property with valid data", async () => {
    setSupabaseResults([
      { data: { id: "p1", name: "Updated" }, error: null },
    ]);
    const res = await PATCH(
      buildRequest("/api/properties/p1", {
        method: "PATCH",
        body: { name: "Updated" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.property.name).toBe("Updated");
  });
});

describe("DELETE /api/properties/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await DELETE(buildRequest("/api/properties/p1", { method: "DELETE" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is tenant", async () => {
    setMockRole("tenant");
    const res = await DELETE(buildRequest("/api/properties/p1", { method: "DELETE" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(403);
  });

  it("deletes property and returns 204", async () => {
    setSupabaseResults([{ data: null, error: null }]);
    const res = await DELETE(buildRequest("/api/properties/p1", { method: "DELETE" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(204);
  });
});

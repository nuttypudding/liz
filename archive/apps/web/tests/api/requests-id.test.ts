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

import { GET, PATCH } from "@/app/api/requests/[id]/route";

const PARAMS = Promise.resolve({ id: "r1" });

describe("GET /api/requests/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET(buildRequest("/api/requests/r1"), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 404 when request not found", async () => {
    setSupabaseResults([{ data: null, error: { message: "not found" } }]);
    const res = await GET(buildRequest("/api/requests/r1"), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns request for landlord who owns property", async () => {
    setSupabaseResults([
      {
        data: {
          id: "r1",
          tenant_message: "leak",
          properties: { landlord_id: "user_landlord_1" },
          tenants: { clerk_user_id: "user_tenant_1" },
        },
        error: null,
      },
    ]);
    const res = await GET(buildRequest("/api/requests/r1"), { params: PARAMS });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.request.id).toBe("r1");
  });

  it("returns 403 when landlord does not own property", async () => {
    setSupabaseResults([
      {
        data: {
          id: "r1",
          properties: { landlord_id: "other_user" },
          tenants: null,
        },
        error: null,
      },
    ]);
    const res = await GET(buildRequest("/api/requests/r1"), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("returns 403 for tenant viewing another tenant's request", async () => {
    setMockRole("tenant");
    setSupabaseResults([
      {
        data: {
          id: "r1",
          properties: { landlord_id: "landlord1" },
          tenants: { clerk_user_id: "other_tenant" },
        },
        error: null,
      },
    ]);
    const res = await GET(buildRequest("/api/requests/r1"), { params: PARAMS });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/requests/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PATCH(
      buildRequest("/api/requests/r1", { method: "PATCH", body: { status: "resolved" } }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is tenant", async () => {
    setMockRole("tenant");
    const res = await PATCH(
      buildRequest("/api/requests/r1", { method: "PATCH", body: { status: "resolved" } }),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status value", async () => {
    const res = await PATCH(
      buildRequest("/api/requests/r1", {
        method: "PATCH",
        body: { status: "invalid_status" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("updates request with valid data", async () => {
    setSupabaseResults([
      // ownership check
      { data: { property_id: "p1", properties: { landlord_id: "user_landlord_1" } }, error: null },
      // update
      { data: { id: "r1", status: "resolved" }, error: null },
    ]);
    const res = await PATCH(
      buildRequest("/api/requests/r1", {
        method: "PATCH",
        body: { status: "resolved" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.request.status).toBe("resolved");
  });
});

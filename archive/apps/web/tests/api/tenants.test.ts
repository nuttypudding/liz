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

import { POST } from "@/app/api/properties/[id]/tenants/route";
import { PATCH, DELETE } from "@/app/api/tenants/[id]/route";

describe("POST /api/properties/[id]/tenants", () => {
  const PARAMS = Promise.resolve({ id: "p1" });

  beforeEach(() => resetAllMocks());

  const validTenant = { first_name: "Test", last_name: "Tenant" };

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST(
      buildRequest("/api/properties/p1/tenants", {
        method: "POST",
        body: validTenant,
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing first_name", async () => {
    const res = await POST(
      buildRequest("/api/properties/p1/tenants", {
        method: "POST",
        body: { first_name: "", last_name: "Tenant" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing last_name", async () => {
    const res = await POST(
      buildRequest("/api/properties/p1/tenants", {
        method: "POST",
        body: { first_name: "Test", last_name: "" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when property not owned", async () => {
    setSupabaseResults([
      // property lookup fails
      { data: null, error: { message: "not found" } },
    ]);
    const res = await POST(
      buildRequest("/api/properties/p1/tenants", {
        method: "POST",
        body: validTenant,
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(404);
  });

  it("creates tenant with valid data", async () => {
    setSupabaseResults([
      // property ownership check
      { data: { id: "p1" }, error: null },
      // tenant insert
      {
        data: {
          id: "t1",
          first_name: "Test",
          last_name: "Tenant",
          property_id: "p1",
        },
        error: null,
      },
    ]);
    const res = await POST(
      buildRequest("/api/properties/p1/tenants", {
        method: "POST",
        body: validTenant,
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.tenant.first_name).toBe("Test");
    expect(json.tenant.last_name).toBe("Tenant");
  });
});

describe("PATCH /api/tenants/[id]", () => {
  const PARAMS = Promise.resolve({ id: "t1" });

  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PATCH(
      buildRequest("/api/tenants/t1", {
        method: "PATCH",
        body: { first_name: "New", last_name: "Name" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when tenant not owned", async () => {
    setSupabaseResults([
      // ownership check
      { data: null, error: { message: "not found" } },
    ]);
    const res = await PATCH(
      buildRequest("/api/tenants/t1", {
        method: "PATCH",
        body: { first_name: "New", last_name: "Name" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(404);
  });

  it("updates tenant with valid data", async () => {
    setSupabaseResults([
      // ownership check
      { data: { id: "t1" }, error: null },
      // update
      { data: { id: "t1", first_name: "Updated", last_name: "Person" }, error: null },
    ]);
    const res = await PATCH(
      buildRequest("/api/tenants/t1", {
        method: "PATCH",
        body: { first_name: "Updated", last_name: "Person" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tenant.first_name).toBe("Updated");
    expect(json.tenant.last_name).toBe("Person");
  });
});

describe("DELETE /api/tenants/[id]", () => {
  const PARAMS = Promise.resolve({ id: "t1" });

  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await DELETE(
      buildRequest("/api/tenants/t1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when tenant not owned", async () => {
    setSupabaseResults([
      { data: null, error: { message: "not found" } },
    ]);
    const res = await DELETE(
      buildRequest("/api/tenants/t1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(404);
  });

  it("deletes tenant and returns 204", async () => {
    setSupabaseResults([
      // ownership check
      { data: { id: "t1" }, error: null },
      // delete (non-terminal)
      { data: null, error: null },
    ]);
    const res = await DELETE(
      buildRequest("/api/tenants/t1", { method: "DELETE" }),
      { params: PARAMS }
    );
    expect(res.status).toBe(204);
  });
});

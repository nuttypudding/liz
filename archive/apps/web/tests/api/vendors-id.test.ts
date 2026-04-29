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

import { PATCH, DELETE } from "@/app/api/vendors/[id]/route";

const PARAMS = Promise.resolve({ id: "v1" });

describe("PATCH /api/vendors/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PATCH(
      buildRequest("/api/vendors/v1", { method: "PATCH", body: { name: "New" } }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await PATCH(
      buildRequest("/api/vendors/v1", {
        method: "PATCH",
        body: { specialty: "not_a_specialty" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("updates vendor with valid data", async () => {
    setSupabaseResults([
      { data: { id: "v1", name: "Updated Vendor" }, error: null },
    ]);
    const res = await PATCH(
      buildRequest("/api/vendors/v1", {
        method: "PATCH",
        body: { name: "Updated Vendor" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vendor.name).toBe("Updated Vendor");
  });
});

describe("DELETE /api/vendors/[id]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await DELETE(buildRequest("/api/vendors/v1", { method: "DELETE" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(401);
  });

  it("deletes vendor successfully", async () => {
    setSupabaseResults([{ data: null, error: null }]);
    const res = await DELETE(buildRequest("/api/vendors/v1", { method: "DELETE" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

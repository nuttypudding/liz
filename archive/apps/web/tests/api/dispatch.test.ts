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

import { POST } from "@/app/api/requests/[id]/dispatch/route";

const PARAMS = Promise.resolve({ id: "r1" });
const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("POST /api/requests/[id]/dispatch", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST(
      buildRequest("/api/requests/r1/dispatch", {
        method: "POST",
        body: { vendor_id: VALID_UUID, work_order_text: "Fix the leak" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is tenant", async () => {
    setMockRole("tenant");
    const res = await POST(
      buildRequest("/api/requests/r1/dispatch", {
        method: "POST",
        body: { vendor_id: VALID_UUID, work_order_text: "Fix the leak" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(
      buildRequest("/api/requests/r1/dispatch", {
        method: "POST",
        body: { vendor_id: "not-uuid" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(400);
  });

  it("dispatches request successfully", async () => {
    setSupabaseResults([
      // request lookup
      { data: { property_id: "p1", status: "triaged" }, error: null },
      // property ownership
      { data: { id: "p1" }, error: null },
      // vendor ownership
      { data: { id: VALID_UUID }, error: null },
      // update
      { data: { id: "r1", status: "dispatched", vendor_id: VALID_UUID }, error: null },
    ]);
    const res = await POST(
      buildRequest("/api/requests/r1/dispatch", {
        method: "POST",
        body: { vendor_id: VALID_UUID, work_order_text: "Fix the leak" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.request.status).toBe("dispatched");
  });

  it("returns 404 when vendor not found", async () => {
    setSupabaseResults([
      // request lookup
      { data: { property_id: "p1", status: "triaged" }, error: null },
      // property ownership
      { data: { id: "p1" }, error: null },
      // vendor not found
      { data: null, error: { message: "not found" } },
    ]);
    const res = await POST(
      buildRequest("/api/requests/r1/dispatch", {
        method: "POST",
        body: { vendor_id: VALID_UUID, work_order_text: "Fix it" },
      }),
      { params: PARAMS }
    );
    expect(res.status).toBe(404);
  });
});

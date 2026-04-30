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

import { GET, PUT } from "@/app/api/vendors/[id]/availability/route";

const vendorId = "vendor-123";
const params = Promise.resolve({ id: vendorId });

describe("GET /api/vendors/[id]/availability", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET(
      buildRequest(`/api/vendors/${vendorId}/availability`),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when vendor not found", async () => {
    setSupabaseResults([
      { data: null, error: { message: "Not found" } },
    ]);
    const res = await GET(
      buildRequest(`/api/vendors/${vendorId}/availability`),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it("returns availability rules for vendor", async () => {
    setSupabaseResults([
      { data: { id: vendorId }, error: null }, // vendor ownership check
      { data: [{ id: "r1", day_of_week: 1, start_time: "08:00", end_time: "17:00", timezone: "America/New_York" }], error: null },
    ]);
    const res = await GET(
      buildRequest(`/api/vendors/${vendorId}/availability`),
      { params }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toHaveLength(1);
    expect(json.rules[0].day_of_week).toBe(1);
  });
});

describe("PUT /api/vendors/[id]/availability", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PUT(
      buildRequest(`/api/vendors/${vendorId}/availability`, {
        method: "PUT",
        body: { rules: [] },
      }),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when vendor not found", async () => {
    setSupabaseResults([
      { data: null, error: { message: "Not found" } },
    ]);
    const res = await PUT(
      buildRequest(`/api/vendors/${vendorId}/availability`, {
        method: "PUT",
        body: { rules: [] },
      }),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when rules is not an array", async () => {
    setSupabaseResults([
      { data: { id: vendorId }, error: null },
    ]);
    const res = await PUT(
      buildRequest(`/api/vendors/${vendorId}/availability`, {
        method: "PUT",
        body: { rules: "invalid" },
      }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid day_of_week", async () => {
    setSupabaseResults([
      { data: { id: vendorId }, error: null },
    ]);
    const res = await PUT(
      buildRequest(`/api/vendors/${vendorId}/availability`, {
        method: "PUT",
        body: {
          rules: [{ day_of_week: 7, start_time: "08:00", end_time: "17:00", timezone: "America/New_York" }],
        },
      }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("saves valid availability rules", async () => {
    const savedRules = [
      { id: "r1", day_of_week: 1, start_time: "08:00", end_time: "17:00", timezone: "America/New_York" },
    ];
    setSupabaseResults([
      { data: { id: vendorId }, error: null }, // vendor ownership check
      { data: null, error: null }, // delete existing
      { data: null, error: null }, // insert new
      { data: savedRules, error: null }, // fetch saved
    ]);
    const res = await PUT(
      buildRequest(`/api/vendors/${vendorId}/availability`, {
        method: "PUT",
        body: {
          rules: [{ day_of_week: 1, start_time: "08:00", end_time: "17:00", timezone: "America/New_York" }],
        },
      }),
      { params }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toHaveLength(1);
  });

  it("handles empty rules array (clears availability)", async () => {
    setSupabaseResults([
      { data: { id: vendorId }, error: null }, // vendor ownership check
      { data: null, error: null }, // delete existing
      { data: [], error: null }, // fetch saved (empty)
    ]);
    const res = await PUT(
      buildRequest(`/api/vendors/${vendorId}/availability`, {
        method: "PUT",
        body: { rules: [] },
      }),
      { params }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toHaveLength(0);
  });
});

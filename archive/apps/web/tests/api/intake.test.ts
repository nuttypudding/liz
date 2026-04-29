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

import { POST } from "@/app/api/intake/route";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("POST /api/intake", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST(
      buildRequest("/api/intake", {
        method: "POST",
        body: { tenant_message: "leak", property_id: VALID_UUID },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing tenant_message", async () => {
    const res = await POST(
      buildRequest("/api/intake", {
        method: "POST",
        body: { property_id: VALID_UUID },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty tenant_message", async () => {
    const res = await POST(
      buildRequest("/api/intake", {
        method: "POST",
        body: { tenant_message: "", property_id: VALID_UUID },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid property_id format", async () => {
    const res = await POST(
      buildRequest("/api/intake", {
        method: "POST",
        body: { tenant_message: "leak", property_id: "not-a-uuid" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for too many photos", async () => {
    const res = await POST(
      buildRequest("/api/intake", {
        method: "POST",
        body: {
          tenant_message: "leak",
          property_id: VALID_UUID,
          photo_paths: ["a", "b", "c", "d", "e", "f"], // 6 > max 5
        },
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates request with valid data", async () => {
    setSupabaseResults([
      // tenant lookup
      { data: { id: "t1" }, error: null },
      // insert request
      { data: { id: "r1" }, error: null },
    ]);
    const res = await POST(
      buildRequest("/api/intake", {
        method: "POST",
        body: { tenant_message: "Kitchen sink leaking", property_id: VALID_UUID },
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("r1");
  });

  it("creates request with photos", async () => {
    setSupabaseResults([
      // tenant lookup
      { data: { id: "t1" }, error: null },
      // insert request
      { data: { id: "r1" }, error: null },
      // insert photos (non-terminal, consumed by then)
      { data: null, error: null },
    ]);
    const res = await POST(
      buildRequest("/api/intake", {
        method: "POST",
        body: {
          tenant_message: "Leak with photos",
          property_id: VALID_UUID,
          photo_paths: ["path/photo1.jpg"],
        },
      })
    );
    expect(res.status).toBe(201);
  });
});

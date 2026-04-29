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

import { GET, POST } from "@/app/api/vendors/route";

describe("GET /api/vendors", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns vendors for landlord", async () => {
    setSupabaseResults([
      { data: [{ id: "v1", name: "Plumber" }], error: null },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vendors).toHaveLength(1);
  });
});

describe("POST /api/vendors", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST(
      buildRequest("/api/vendors", {
        method: "POST",
        body: { name: "Test", specialty: "plumbing" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(
      buildRequest("/api/vendors", {
        method: "POST",
        body: { name: "" }, // missing specialty
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates vendor with valid data", async () => {
    setSupabaseResults([
      { data: { id: "v1", name: "FastFix", specialty: "plumbing" }, error: null },
    ]);
    const res = await POST(
      buildRequest("/api/vendors", {
        method: "POST",
        body: { name: "FastFix", specialty: "plumbing" },
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.vendor.name).toBe("FastFix");
  });

  it("returns 400 for invalid specialty", async () => {
    const res = await POST(
      buildRequest("/api/vendors", {
        method: "POST",
        body: { name: "Test", specialty: "invalid_type" },
      })
    );
    expect(res.status).toBe(400);
  });
});

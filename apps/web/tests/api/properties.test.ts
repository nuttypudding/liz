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

import { GET, POST } from "@/app/api/properties/route";

describe("GET /api/properties", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET(buildRequest("/api/properties"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not landlord", async () => {
    setMockRole("tenant");
    const res = await GET(buildRequest("/api/properties"));
    expect(res.status).toBe(403);
  });

  it("returns properties for landlord", async () => {
    setSupabaseResults([
      { data: [{ id: "p1", name: "Test Property" }], error: null },
    ]);
    const res = await GET(buildRequest("/api/properties"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.properties).toHaveLength(1);
    expect(json.properties[0].name).toBe("Test Property");
  });

  it("returns empty array when no properties", async () => {
    setSupabaseResults([{ data: [], error: null }]);
    const res = await GET(buildRequest("/api/properties"));
    const json = await res.json();
    expect(json.properties).toEqual([]);
  });
});

describe("POST /api/properties", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST(
      buildRequest("/api/properties", {
        method: "POST",
        body: { name: "Test", address: "123 Main St" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is tenant", async () => {
    setMockRole("tenant");
    const res = await POST(
      buildRequest("/api/properties", {
        method: "POST",
        body: { name: "Test", address: "123 Main St" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(
      buildRequest("/api/properties", {
        method: "POST",
        body: { name: "" }, // missing required address
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates property with valid data", async () => {
    setSupabaseResults([
      {
        data: { id: "p1", name: "Test Property", address: "123 Main St" },
        error: null,
      },
    ]);
    const res = await POST(
      buildRequest("/api/properties", {
        method: "POST",
        body: { name: "Test Property", address: "123 Main St" },
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.property.name).toBe("Test Property");
  });
});

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

import { GET } from "@/app/api/tenant/me/route";

describe("GET /api/tenant/me", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when tenant not found", async () => {
    setSupabaseResults([{ data: null, error: null }]);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns tenant profile", async () => {
    setSupabaseResults([
      {
        data: {
          id: "t1",
          property_id: "p1",
          first_name: "Sarah",
          last_name: "Chen",
          email: "sarah@test.com",
        },
        error: null,
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tenant.property_id).toBe("p1");
    expect(json.tenant.first_name).toBe("Sarah");
    expect(json.tenant.last_name).toBe("Chen");
  });
});

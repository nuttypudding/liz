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

import { POST } from "@/app/api/requests/[id]/resolve/route";

const PARAMS = Promise.resolve({ id: "r1" });

describe("POST /api/requests/[id]/resolve", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await POST(buildRequest("/api/requests/r1/resolve", { method: "POST" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when tenant not found", async () => {
    setSupabaseResults([{ data: null, error: null }]);
    const res = await POST(buildRequest("/api/requests/r1/resolve", { method: "POST" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when tenant does not own request", async () => {
    setSupabaseResults([
      // tenant lookup
      { data: { id: "t1" }, error: null },
      // request lookup
      { data: { id: "r1", tenant_id: "t2" }, error: null },
    ]);
    const res = await POST(buildRequest("/api/requests/r1/resolve", { method: "POST" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(403);
  });

  it("resolves request when tenant owns it", async () => {
    setSupabaseResults([
      // tenant lookup
      { data: { id: "t1" }, error: null },
      // request lookup
      { data: { id: "r1", tenant_id: "t1" }, error: null },
      // update
      { data: { id: "r1", status: "resolved" }, error: null },
    ]);
    const res = await POST(buildRequest("/api/requests/r1/resolve", { method: "POST" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.request.status).toBe("resolved");
  });
});

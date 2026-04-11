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

import { GET, PATCH } from "@/app/api/notifications/route";

const NOTIFICATION = {
  id: "n1",
  landlord_id: "user_landlord_1",
  property_id: "p1",
  tenant_id: null,
  notification_type: "rent_due_reminder",
  subject: "Rent due",
  body: "Your rent is due",
  sent_at: "2026-04-11T00:00:00Z",
  read_at: null,
  created_at: "2026-04-11T00:00:00Z",
};

describe("GET /api/notifications", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await GET(buildRequest("/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("returns notifications with unread_count", async () => {
    setSupabaseResults([
      { data: null, count: 2, error: null },     // unread count query
      { data: [NOTIFICATION], error: null },      // list query
    ]);
    const res = await GET(buildRequest("/api/notifications"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.unread_count).toBe(2);
  });

  it("returns empty data with unread_count=0 when no notifications", async () => {
    setSupabaseResults([
      { data: null, count: 0, error: null },
      { data: [], error: null },
    ]);
    const res = await GET(buildRequest("/api/notifications"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
    expect(json.unread_count).toBe(0);
  });

  it("supports unread filter param", async () => {
    setSupabaseResults([
      { data: null, count: 1, error: null },
      { data: [NOTIFICATION], error: null },
    ]);
    const res = await GET(buildRequest("/api/notifications?unread=true"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.unread_count).toBe(1);
  });

  it("returns 500 when count query fails", async () => {
    setSupabaseResults([
      { data: null, count: null, error: { message: "db error" } },
    ]);
    const res = await GET(buildRequest("/api/notifications"));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/notifications", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await PATCH(
      buildRequest("/api/notifications", { method: "PATCH", body: { mark_all_read: true } })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when neither id nor mark_all_read provided", async () => {
    const res = await PATCH(
      buildRequest("/api/notifications", { method: "PATCH", body: {} })
    );
    expect(res.status).toBe(400);
  });

  it("marks a single notification as read", async () => {
    setSupabaseResults([
      { data: { id: "n1" }, error: null },    // ownership check
      { data: null, error: null },             // update
    ]);
    const res = await PATCH(
      buildRequest("/api/notifications", { method: "PATCH", body: { id: "n1" } })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(1);
  });

  it("returns 404 when notification not found or not owned", async () => {
    setSupabaseResults([
      { data: null, error: { message: "not found" } },
    ]);
    const res = await PATCH(
      buildRequest("/api/notifications", { method: "PATCH", body: { id: "n-other" } })
    );
    expect(res.status).toBe(404);
  });

  it("marks all notifications as read", async () => {
    setSupabaseResults([
      { data: [{ id: "n1" }, { id: "n2" }], error: null },
    ]);
    const res = await PATCH(
      buildRequest("/api/notifications", { method: "PATCH", body: { mark_all_read: true } })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(2);
  });

  it("returns updated=0 when no unread notifications", async () => {
    setSupabaseResults([
      { data: [], error: null },
    ]);
    const res = await PATCH(
      buildRequest("/api/notifications", { method: "PATCH", body: { mark_all_read: true } })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(0);
  });
});

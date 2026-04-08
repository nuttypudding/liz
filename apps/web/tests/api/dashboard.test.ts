import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetAllMocks,
  setMockAuth,
  setSupabaseResults,
  mockAuth,
  mockCreateServerSupabaseClient,
} from "../helpers";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

import { GET as getStats } from "@/app/api/dashboard/stats/route";
import { GET as getSpendChart } from "@/app/api/dashboard/spend-chart/route";

describe("GET /api/dashboard/stats", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await getStats();
    expect(res.status).toBe(401);
  });

  it("returns zero stats when no properties", async () => {
    setSupabaseResults([{ data: [], error: null }]);
    const res = await getStats();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.emergency_count).toBe(0);
    expect(json.open_count).toBe(0);
    expect(json.avg_resolution_days).toBe(0);
    expect(json.monthly_spend).toBe(0);
  });

  it("calculates stats correctly", async () => {
    setSupabaseResults([
      // properties
      { data: [{ id: "p1" }], error: null },
      // requests
      {
        data: [
          { ai_urgency: "emergency", status: "triaged", actual_cost: null, created_at: "2026-04-01", resolved_at: null },
          { ai_urgency: "low", status: "resolved", actual_cost: 200, created_at: "2026-04-01", resolved_at: "2026-04-03" },
        ],
        error: null,
      },
    ]);
    const res = await getStats();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.emergency_count).toBe(1);
    expect(json.open_count).toBe(1);
  });
});

describe("GET /api/dashboard/spend-chart", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await getSpendChart();
    expect(res.status).toBe(401);
  });

  it("returns empty data when no properties", async () => {
    setSupabaseResults([{ data: [], error: null }]);
    const res = await getSpendChart();
    const json = await res.json();
    expect(json.data).toEqual([]);
  });

  it("aggregates spend per property", async () => {
    setSupabaseResults([
      // properties
      {
        data: [
          { id: "p1", name: "Oak St", monthly_rent: 1600 },
          { id: "p2", name: "Elm Ave", monthly_rent: 1800 },
        ],
        error: null,
      },
      // requests with costs
      {
        data: [
          { property_id: "p1", actual_cost: 150 },
          { property_id: "p1", actual_cost: 100 },
          { property_id: "p2", actual_cost: 200 },
        ],
        error: null,
      },
    ]);
    const res = await getSpendChart();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    const oak = json.data.find((d: { property_name: string }) => d.property_name === "Oak St");
    expect(oak.spend).toBe(250);
    expect(oak.rent).toBe(1600);
  });
});

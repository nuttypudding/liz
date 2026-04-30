import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetAllMocks,
  setMockAuth,
  setMockRole,
  setSupabaseResults,
  buildRequest,
  mockAuth,
  mockCreateServerSupabaseClient,
  mockGetRole,
} from "../helpers";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
  clerkClient: () =>
    Promise.resolve({
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "landlord@example.com" }],
          firstName: "Test",
        }),
      },
    }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

vi.mock("@/lib/clerk", () => ({
  getRole: () => mockGetRole(),
}));

vi.mock("@/lib/notifications/service", () => ({
  sendNotification: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST as postTenantAvailability } from "@/app/api/scheduling/tenant-availability/route";
import { POST as postConfirm } from "@/app/api/scheduling/confirm/route";
import { POST as postReschedule } from "@/app/api/scheduling/reschedule/[taskId]/route";

// Valid UUIDs for testing
const taskId = "550e8400-e29b-41d4-a716-446655440000";
const vendorId = "650e8400-e29b-41d4-a716-446655440001";
const tenantId = "750e8400-e29b-41d4-a716-446655440002";
const landlordId = "user_landlord_1";
const propertyId = "850e8400-e29b-41d4-a716-446655440003";

describe("POST /api/scheduling/tenant-availability", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await postTenantAvailability(
      buildRequest("/api/scheduling/tenant-availability", {
        method: "POST",
        body: { taskId, availableSlots: [] },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid request body", async () => {
    setSupabaseResults([]);
    const res = await postTenantAvailability(
      buildRequest("/api/scheduling/tenant-availability", {
        method: "POST",
        body: { taskId }, // missing availableSlots
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when scheduling task not found", async () => {
    setSupabaseResults([{ data: null, error: { message: "Not found" } }]);
    const res = await postTenantAvailability(
      buildRequest("/api/scheduling/tenant-availability", {
        method: "POST",
        body: {
          taskId,
          availableSlots: [{ date: "2025-04-15", dayPart: "morning" }],
        },
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 when task is not in awaiting_tenant status", async () => {
    setSupabaseResults([
      {
        data: {
          id: taskId,
          status: "confirmed",
          tenant_id: tenantId,
          vendor_id: vendorId,
        },
        error: null,
      },
    ]);
    const res = await postTenantAvailability(
      buildRequest("/api/scheduling/tenant-availability", {
        method: "POST",
        body: {
          taskId,
          availableSlots: [{ date: "2025-04-15", dayPart: "morning" }],
        },
      })
    );
    expect(res.status).toBe(422);
  });

  it("updates task status to awaiting_vendor on success", async () => {
    const slots = [{ date: "2025-04-15", dayPart: "morning" }];
    setSupabaseResults([
      {
        data: {
          id: taskId,
          status: "awaiting_tenant",
          tenant_id: tenantId,
          vendor_id: vendorId,
        },
        error: null,
      },
      {
        data: {
          id: taskId,
          status: "awaiting_vendor",
          tenant_id: tenantId,
          vendor_id: vendorId,
          tenant_availability: slots,
        },
        error: null,
      },
    ]);
    const res = await postTenantAvailability(
      buildRequest("/api/scheduling/tenant-availability", {
        method: "POST",
        body: {
          taskId,
          availableSlots: slots,
        },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.status).toBe("awaiting_vendor");
  });
});

describe("POST /api/scheduling/confirm", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const res = await postConfirm(
      buildRequest("/api/scheduling/confirm", {
        method: "POST",
        body: {
          taskId,
          selectedDate: "2025-04-15",
          selectedTimeStart: "10:00",
          selectedTimeEnd: "11:00",
        },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a landlord", async () => {
    setMockRole("tenant");
    setSupabaseResults([]);
    const res = await postConfirm(
      buildRequest("/api/scheduling/confirm", {
        method: "POST",
        body: {
          taskId,
          selectedDate: "2025-04-15",
          selectedTimeStart: "10:00",
          selectedTimeEnd: "11:00",
        },
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid request body", async () => {
    setSupabaseResults([]);
    const res = await postConfirm(
      buildRequest("/api/scheduling/confirm", {
        method: "POST",
        body: { taskId }, // missing selectedDate, times
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when scheduling task not found", async () => {
    setMockRole("landlord");
    setSupabaseResults([{ data: null, error: { message: "Not found" } }]);
    const res = await postConfirm(
      buildRequest("/api/scheduling/confirm", {
        method: "POST",
        body: {
          taskId,
          selectedDate: "2025-04-15",
          selectedTimeStart: "10:00",
          selectedTimeEnd: "11:00",
        },
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 for vendor double-booking conflict", async () => {
    setMockRole("landlord");
    setSupabaseResults([
      {
        data: {
          id: taskId,
          status: "pending",
          vendor_id: vendorId,
          tenant_id: tenantId,
          maintenance_requests: { property_id: propertyId, work_order_text: "Fix sink" },
        },
        error: null,
      },
      {
        data: { id: propertyId, landlord_id: landlordId },
        error: null,
      },
      {
        data: [{ id: "conflict-task" }], // Vendor conflict
        error: null,
      },
    ]);
    const res = await postConfirm(
      buildRequest("/api/scheduling/confirm", {
        method: "POST",
        body: {
          taskId,
          selectedDate: "2025-04-15",
          selectedTimeStart: "10:00",
          selectedTimeEnd: "11:00",
        },
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Vendor already has a confirmed appointment");
  });

  it("returns 409 for tenant double-booking conflict", async () => {
    setMockRole("landlord");
    setSupabaseResults([
      {
        data: {
          id: taskId,
          status: "pending",
          vendor_id: vendorId,
          tenant_id: tenantId,
          maintenance_requests: { property_id: propertyId, work_order_text: "Fix sink" },
        },
        error: null,
      },
      {
        data: { id: propertyId, landlord_id: landlordId },
        error: null,
      },
      {
        data: [], // No vendor conflict
        error: null,
      },
      {
        data: [{ id: "conflict-task" }], // Tenant conflict
        error: null,
      },
    ]);
    const res = await postConfirm(
      buildRequest("/api/scheduling/confirm", {
        method: "POST",
        body: {
          taskId,
          selectedDate: "2025-04-15",
          selectedTimeStart: "10:00",
          selectedTimeEnd: "11:00",
        },
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Tenant already has a confirmed appointment");
  });

  it("confirms appointment", async () => {
    setMockRole("landlord");
    setSupabaseResults([
      {
        data: {
          id: taskId,
          status: "pending",
          vendor_id: vendorId,
          tenant_id: tenantId,
          maintenance_requests: {
            property_id: propertyId,
            work_order_text: "Fix sink",
          },
        },
        error: null,
      },
      {
        data: {
          id: propertyId,
          landlord_id: landlordId,
          name: "Test Property",
          address_line1: "123 Main St",
          city: "Springfield",
          state: "IL",
          postal_code: "62701",
        },
        error: null,
      },
      {
        data: [], // No vendor conflict
        error: null,
      },
      {
        data: [], // No tenant conflict
        error: null,
      },
      {
        data: {
          id: taskId,
          status: "confirmed",
          scheduled_date: "2025-04-15",
          scheduled_time_start: "10:00",
          scheduled_time_end: "11:00",
        },
        error: null,
      },
      {
        data: null, // vendor not found (optional)
        error: null,
      },
      {
        data: null, // tenant not found (optional)
        error: null,
      },
    ]);

    const res = await postConfirm(
      buildRequest("/api/scheduling/confirm", {
        method: "POST",
        body: {
          taskId,
          selectedDate: "2025-04-15",
          selectedTimeStart: "10:00",
          selectedTimeEnd: "11:00",
        },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.status).toBe("confirmed");
  });
});

describe("POST /api/scheduling/reschedule/[taskId]", () => {
  beforeEach(() => resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    setMockAuth(null);
    const params = Promise.resolve({ taskId });
    const res = await postReschedule(
      buildRequest(`/api/scheduling/reschedule/${taskId}`, {
        method: "POST",
        body: { reason: "Vendor unavailable" },
      }),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when scheduling task not found", async () => {
    const params = Promise.resolve({ taskId });
    setSupabaseResults([{ data: null, error: { message: "Not found" } }]);
    const res = await postReschedule(
      buildRequest(`/api/scheduling/reschedule/${taskId}`, {
        method: "POST",
        body: { reason: "Vendor unavailable", requestedBy: "landlord" },
      }),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it("updates status to rescheduling and increments counter", async () => {
    const params = Promise.resolve({ taskId });
    setSupabaseResults([
      {
        data: {
          id: taskId,
          status: "confirmed",
          reschedule_count: 0,
          maintenance_requests: { property_id: propertyId },
        },
        error: null,
      },
      {
        data: {
          id: taskId,
          status: "rescheduling",
          reschedule_count: 1,
          maintenance_requests: { property_id: propertyId },
        },
        error: null,
      },
      {
        data: { landlord_id: landlordId },
        error: null,
      },
      {
        data: { email: "landlord@example.com" },
        error: null,
      },
    ]);
    const res = await postReschedule(
      buildRequest(`/api/scheduling/reschedule/${taskId}`, {
        method: "POST",
        body: { reason: "Vendor unavailable", requestedBy: "landlord" },
      }),
      { params }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.status).toBe("rescheduling");
    expect(json.task.reschedule_count).toBe(1);
  });
});

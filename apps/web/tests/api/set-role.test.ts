import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setSupabaseResults,
  resetAllMocks,
  mockCreateServerSupabaseClient,
  buildRequest,
} from "../helpers";

const mockAuthFn = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUserMetadata = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuthFn(),
  clerkClient: async () => ({
    users: {
      getUser: mockGetUser,
      updateUserMetadata: mockUpdateUserMetadata,
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

const { POST } = await import("@/app/api/auth/set-role/route");

describe("POST /api/auth/set-role", () => {
  beforeEach(() => {
    resetAllMocks();
    mockAuthFn.mockReset();
    mockGetUser.mockReset();
    mockUpdateUserMetadata.mockReset();
    mockUpdateUserMetadata.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated request", async () => {
    mockAuthFn.mockResolvedValue({ userId: null, sessionClaims: null });
    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "landlord" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid role (e.g., admin)", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_1", sessionClaims: {} });
    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "admin" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid role");
  });

  it("returns 400 for missing role field", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_1", sessionClaims: {} });
    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid role");
  });

  it("returns 409 if user already has a role", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_1", sessionClaims: {} });
    mockGetUser.mockResolvedValue({
      publicMetadata: { role: "landlord" },
      emailAddresses: [{ emailAddress: "user@example.com" }],
    });
    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "landlord" },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Role already assigned");
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
  });

  it("sets publicMetadata.role via Clerk for landlord", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_landlord", sessionClaims: {} });
    mockGetUser.mockResolvedValue({
      publicMetadata: {},
      emailAddresses: [{ emailAddress: "landlord@example.com" }],
    });
    setSupabaseResults([{ data: { id: "profile-id" }, error: null }]);

    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "landlord" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith("user_landlord", {
      publicMetadata: { role: "landlord" },
    });
  });

  it("creates landlord_profiles row for landlord role", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_landlord", sessionClaims: {} });
    mockGetUser.mockResolvedValue({
      publicMetadata: {},
      emailAddresses: [{ emailAddress: "landlord@example.com" }],
    });
    setSupabaseResults([{ data: { id: "profile-id" }, error: null }]);

    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "landlord" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.redirect).toBe("/onboarding");
  });

  it("links tenant by email for tenant role", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_tenant", sessionClaims: {} });
    mockGetUser.mockResolvedValue({
      publicMetadata: {},
      emailAddresses: [{ emailAddress: "tenant@example.com" }],
    });
    setSupabaseResults([{ data: { id: "tenant-id" }, error: null }]);

    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "tenant" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.redirect).toBe("/submit");
  });

  it("returns /onboarding redirect for landlord", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_landlord", sessionClaims: {} });
    mockGetUser.mockResolvedValue({
      publicMetadata: {},
      emailAddresses: [{ emailAddress: "landlord@example.com" }],
    });
    setSupabaseResults([{ data: { id: "profile-id" }, error: null }]);

    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "landlord" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.redirect).toBe("/onboarding");
  });

  it("returns /submit redirect for tenant", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_tenant", sessionClaims: {} });
    mockGetUser.mockResolvedValue({
      publicMetadata: {},
      emailAddresses: [{ emailAddress: "tenant@example.com" }],
    });
    setSupabaseResults([{ data: { id: "tenant-id" }, error: null }]);

    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "tenant" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.redirect).toBe("/submit");
  });

  it("handles tenant without email gracefully", async () => {
    mockAuthFn.mockResolvedValue({ userId: "user_tenant", sessionClaims: {} });
    mockGetUser.mockResolvedValue({
      publicMetadata: {},
      emailAddresses: [],
    });
    setSupabaseResults([{ data: null, error: null }]);

    const req = buildRequest("http://localhost:3000/api/auth/set-role", {
      method: "POST",
      body: { role: "tenant" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.redirect).toBe("/submit");
  });
});

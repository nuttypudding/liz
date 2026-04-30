import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = vi.fn();
const mockGetRole = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUserMetadata = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
  clerkClient: async () => ({
    users: {
      getUser: mockGetUser,
      updateUserMetadata: mockUpdateUserMetadata,
    },
  }),
}));

const { getRole, bootstrapLandlordRole, withAuth } = await import("@/lib/clerk");

describe("lib/clerk getRole", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetUser.mockReset();
    mockUpdateUserMetadata.mockReset();
    mockUpdateUserMetadata.mockResolvedValue(undefined);
  });

  it("returns null when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null, sessionClaims: null });
    expect(await getRole()).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("reads role from session claims publicMetadata (fast path)", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { publicMetadata: { role: "landlord" } },
    });
    expect(await getRole()).toBe("landlord");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("reads role from legacy session claims metadata path", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { metadata: { role: "tenant" } },
    });
    expect(await getRole()).toBe("tenant");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("falls back to Clerk backend when claims have no role", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { publicMetadata: {} },
    });
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "landlord" } });

    expect(await getRole()).toBe("landlord");
    expect(mockGetUser).toHaveBeenCalledWith("user_1");
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
  });

  it("bootstraps role to landlord when session and backend are both empty", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_new",
      sessionClaims: {},
    });
    mockGetUser.mockResolvedValue({ publicMetadata: {} });

    expect(await getRole()).toBe("landlord");
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith("user_new", {
      publicMetadata: { role: "landlord" },
    });
  });

  it("returns null when Clerk backend lookup throws", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: {},
    });
    mockGetUser.mockRejectedValue(new Error("Clerk API down"));

    expect(await getRole()).toBeNull();
  });

  it("rejects unknown role values and bootstraps", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { publicMetadata: { role: "admin" } },
    });
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "admin" } });

    expect(await getRole()).toBe("landlord");
    expect(mockUpdateUserMetadata).toHaveBeenCalled();
  });
});

describe("lib/clerk bootstrapLandlordRole", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockUpdateUserMetadata.mockReset();
    mockUpdateUserMetadata.mockResolvedValue(undefined);
  });

  it("sets publicMetadata.role to landlord for a user with no role", async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: {} });
    const result = await bootstrapLandlordRole("user_1");
    expect(result).toBe("landlord");
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith("user_1", {
      publicMetadata: { role: "landlord" },
    });
  });

  it("does not overwrite an existing role", async () => {
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "tenant" } });
    const result = await bootstrapLandlordRole("user_1");
    expect(result).toBe("tenant");
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
  });
});

describe("lib/clerk withAuth", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetUser.mockReset();
    mockUpdateUserMetadata.mockReset();
    mockUpdateUserMetadata.mockResolvedValue(undefined);
  });

  it("returns 401 for missing session", async () => {
    mockAuth.mockResolvedValue({ userId: null, sessionClaims: null });
    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const response = await wrappedHandler();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 for missing role (when backend fails)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_1", sessionClaims: {} });
    mockGetUser.mockRejectedValue(new Error("Clerk API down"));
    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const response = await wrappedHandler();
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("No role assigned");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 for wrong role when requiredRole is set", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { publicMetadata: { role: "tenant" } },
    });
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "tenant" } });
    const handler = vi.fn();
    const wrappedHandler = withAuth(handler, { requiredRole: "landlord" });
    const response = await wrappedHandler();
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Forbidden");
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler with userId and role on success", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { publicMetadata: { role: "landlord" } },
    });
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "landlord" } });
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );
    const wrappedHandler = withAuth(handler);
    const response = await wrappedHandler();
    expect(handler).toHaveBeenCalledWith("user_1", "landlord");
    expect(response.status).toBe(200);
  });

  it("allows matching requiredRole", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { publicMetadata: { role: "landlord" } },
    });
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "landlord" } });
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );
    const wrappedHandler = withAuth(handler, { requiredRole: "landlord" });
    const response = await wrappedHandler();
    expect(handler).toHaveBeenCalledWith("user_1", "landlord");
    expect(response.status).toBe(200);
  });
});

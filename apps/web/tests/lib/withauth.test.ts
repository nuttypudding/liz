import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = vi.fn();
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

const { withAuth } = await import("@/lib/clerk");

describe("lib/clerk withAuth()", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetUser.mockReset();
    mockUpdateUserMetadata.mockReset();
    mockUpdateUserMetadata.mockResolvedValue(undefined);
  });

  it("returns 401 when auth() returns no userId", async () => {
    mockAuth.mockResolvedValue({ userId: null, sessionClaims: null });
    const handler = vi.fn();
    const wrappedHandler = withAuth(handler);
    const response = await wrappedHandler();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when getRole() returns null", async () => {
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

  it("returns 403 when role doesn't match requiredRole", async () => {
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
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withAuth(handler);
    const response = await wrappedHandler();
    expect(handler).toHaveBeenCalledWith("user_1", "landlord");
    expect(response.status).toBe(200);
  });

  it("works without requiredRole option (any role accepted)", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_2",
      sessionClaims: { publicMetadata: { role: "tenant" } },
    });
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "tenant" } });
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withAuth(handler);
    const response = await wrappedHandler();
    expect(handler).toHaveBeenCalledWith("user_2", "tenant");
    expect(response.status).toBe(200);
  });

  it("allows matching requiredRole", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_landlord",
      sessionClaims: { publicMetadata: { role: "landlord" } },
    });
    mockGetUser.mockResolvedValue({ publicMetadata: { role: "landlord" } });
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withAuth(handler, { requiredRole: "landlord" });
    const response = await wrappedHandler();
    expect(handler).toHaveBeenCalledWith("user_landlord", "landlord");
    expect(response.status).toBe(200);
  });
});

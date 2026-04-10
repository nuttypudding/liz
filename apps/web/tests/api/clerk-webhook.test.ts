import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setSupabaseResults,
  resetAllMocks,
  mockCreateServerSupabaseClient,
} from "../helpers";

// Mock state
let mockHeaderGet: (key: string) => string | null;
let mockVerifyResult: (() => unknown) | null;
const mockUpdateUserMetadata = vi.fn();

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({
      get: (key: string) => mockHeaderGet(key),
    }),
}));

vi.mock("svix", () => ({
  Webhook: class {
    verify() {
      if (mockVerifyResult) return mockVerifyResult();
      throw new Error("No verify mock set");
    }
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: {
      updateUserMetadata: mockUpdateUserMetadata,
    },
  }),
}));

vi.stubEnv("CLERK_WEBHOOK_SECRET", "test-webhook-secret");

const { POST } = await import("@/app/api/webhook/clerk/route");

function buildWebhookRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/webhook/clerk", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/webhook/clerk", () => {
  beforeEach(() => {
    resetAllMocks();
    mockHeaderGet = () => null;
    mockVerifyResult = null;
    mockUpdateUserMetadata.mockReset();
    mockUpdateUserMetadata.mockResolvedValue(undefined);
  });

  function setSvixHeaders() {
    const headers: Record<string, string> = {
      "svix-id": "msg_test123",
      "svix-timestamp": "1234567890",
      "svix-signature": "v1,valid_sig",
    };
    mockHeaderGet = (key: string) => headers[key] ?? null;
  }

  it("returns 400 if svix headers are missing", async () => {
    const res = await POST(buildWebhookRequest({}));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing svix headers");
  });

  it("returns 400 if signature verification fails", async () => {
    setSvixHeaders();
    mockVerifyResult = () => {
      throw new Error("Invalid signature");
    };

    const res = await POST(buildWebhookRequest({}));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid signature");
  });

  it("returns 200 for user.created tenant event and matches existing tenant", async () => {
    setSvixHeaders();
    mockVerifyResult = () => ({
      type: "user.created",
      data: {
        id: "user_tenant_new",
        email_addresses: [{ email_address: "jane@example.com" }],
        public_metadata: { role: "tenant" },
      },
    });

    setSupabaseResults([
      { data: { id: "tenant-uuid-1" }, error: null },
      { data: null, error: null },
    ]);

    const res = await POST(buildWebhookRequest({}));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
  });

  it("returns 200 for user.created tenant event with no email match", async () => {
    setSvixHeaders();
    mockVerifyResult = () => ({
      type: "user.created",
      data: {
        id: "user_tenant_new",
        email_addresses: [{ email_address: "unknown@example.com" }],
        public_metadata: { role: "tenant" },
      },
    });

    setSupabaseResults([
      { data: null, error: { code: "PGRST116" } },
    ]);

    const res = await POST(buildWebhookRequest({}));
    expect(res.status).toBe(200);
  });

  it("returns 200 for user.created landlord event (no tenant sync)", async () => {
    setSvixHeaders();
    mockVerifyResult = () => ({
      type: "user.created",
      data: {
        id: "user_landlord_new",
        email_addresses: [{ email_address: "landlord@example.com" }],
        public_metadata: { role: "landlord" },
      },
    });

    const res = await POST(buildWebhookRequest({}));
    expect(res.status).toBe(200);
    // Existing role — should not overwrite
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
  });

  it("user.created with no role defaults to landlord (self-signup bootstrap)", async () => {
    setSvixHeaders();
    mockVerifyResult = () => ({
      type: "user.created",
      data: {
        id: "user_selfsignup",
        email_addresses: [{ email_address: "new@example.com" }],
        public_metadata: {},
      },
    });

    const res = await POST(buildWebhookRequest({}));
    expect(res.status).toBe(200);
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith("user_selfsignup", {
      publicMetadata: { role: "landlord" },
    });
  });

  it("returns 200 for non-user.created events", async () => {
    setSvixHeaders();
    mockVerifyResult = () => ({
      type: "user.updated",
      data: { id: "user_1" },
    });

    const res = await POST(buildWebhookRequest({}));
    expect(res.status).toBe(200);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetAllMocks,
  setSupabaseResults,
  mockCreateServerSupabaseClient,
} from "../helpers";

// Mock transports
vi.mock("@/lib/notifications/transports/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: "email-123",
  }),
}));

vi.mock("@/lib/notifications/transports/sms", () => ({
  sendSms: vi.fn().mockResolvedValue({
    success: true,
    messageId: "sms-123",
  }),
}));

vi.mock("@/lib/notifications/transports/in-app", () => ({
  sendInApp: vi.fn().mockResolvedValue({
    success: true,
  }),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
}));

import { sendNotification } from "@/lib/notifications/service";

describe("sendNotification()", () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
  });

  describe("email channel", () => {
    it("sends email when transport is available", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "landlord",
        "user-123",
        "email",
        "schedule-confirmed",
        {
          to: "landlord@example.com",
          recipientName: "Test Landlord",
          scheduledDate: "2025-04-15",
          scheduledTimeStart: "10:00",
          scheduledTimeEnd: "11:00",
          propertyAddress: "123 Main St",
          workOrderSummary: "Fix sink",
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("email-123");
    });

    it("handles email send failure gracefully", async () => {
      const { sendEmail } = await import("@/lib/notifications/transports/email");
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: false,
        error: "Send failed",
      });
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "tenant",
        "tenant-123",
        "email",
        "availability-prompt",
        {
          to: "tenant@example.com",
          recipientName: "Test Tenant",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Send failed");
    });

    it("logs notification to database regardless of success", async () => {
      process.env.RESEND_API_KEY = "test-key";
      setSupabaseResults([{ data: null, error: null }]);

      await sendNotification(
        "landlord",
        "user-123",
        "email",
        "schedule-confirmed",
        {
          to: "landlord@example.com",
          recipientName: "Test Landlord",
        }
      );

      // Verify logging call was made to supabase
      const supabase = mockCreateServerSupabaseClient();
      expect(supabase.from).toHaveBeenCalledWith("notification_log");
    });
  });

  describe("SMS channel", () => {
    it("sends SMS when transport is available", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "tenant",
        "tenant-123",
        "sms",
        "schedule-confirmed",
        {
          to: "+19876543210",
          appointmentTime: "2025-04-15 10:00 AM",
          address: "123 Main St",
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("sms-123");
    });

    it("handles SMS send failure", async () => {
      const { sendSms } = await import("@/lib/notifications/transports/sms");
      vi.mocked(sendSms).mockResolvedValueOnce({
        success: false,
        error: "SMS send failed",
      });
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "vendor",
        "vendor-123",
        "sms",
        "reschedule-request",
        {
          to: "+19876543210",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("SMS send failed");
    });
  });

  describe("in_app channel", () => {
    it("logs in-app notification to database", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "landlord",
        "user-123",
        "in_app",
        "schedule-confirmed",
        {
          scheduledDate: "2025-04-15",
          scheduledTimeStart: "10:00",
        }
      );

      expect(result.success).toBe(true);
    });

    it("returns success even without additional infrastructure", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "tenant",
        "tenant-456",
        "in_app",
        "availability-prompt",
        {
          taskId: "task-789",
        }
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("unknown channel", () => {
    it("returns error for unknown channel", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "landlord",
        "user-123",
        "unknown_channel" as any,
        "test-template",
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown channel");
    });
  });

  describe("notification logging", () => {
    it("logs to notification_log table on success", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      await sendNotification(
        "landlord",
        "user-123",
        "email",
        "schedule-confirmed",
        {
          to: "landlord@example.com",
          recipientName: "Test",
        }
      );

      const supabase = mockCreateServerSupabaseClient();
      const from = supabase.from as any;
      expect(from).toHaveBeenCalledWith("notification_log");
    });

    it("logs to notification_log even when send fails", async () => {
      const { sendSms } = await import("@/lib/notifications/transports/sms");
      vi.mocked(sendSms).mockResolvedValueOnce({
        success: false,
        error: "Failed",
      });
      setSupabaseResults([{ data: null, error: null }]);

      await sendNotification(
        "tenant",
        "tenant-123",
        "sms",
        "availability-prompt",
        { to: "+1234567890" }
      );

      const supabase = mockCreateServerSupabaseClient();
      const from = supabase.from as any;
      expect(from).toHaveBeenCalledWith("notification_log");
    });

    it("handles logging errors gracefully", async () => {
      setSupabaseResults([{ data: null, error: { message: "DB error" } }]);

      // Should not throw
      const result = await sendNotification(
        "landlord",
        "user-123",
        "email",
        "schedule-confirmed",
        {
          to: "landlord@example.com",
          recipientName: "Test",
        }
      );

      // Email send should still succeed
      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty template data", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "landlord",
        "user-123",
        "email",
        "schedule-confirmed",
        {}
      );

      // Should still attempt send
      expect(result.success).toBe(true);
    });

    it("handles template with missing required fields", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const result = await sendNotification(
        "tenant",
        "tenant-123",
        "email",
        "availability-prompt",
        { recipientName: "Test" } // missing 'to'
      );

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("handles different recipient types", async () => {
      setSupabaseResults([{ data: null, error: null }]);

      const recipientTypes: Array<"landlord" | "tenant" | "vendor"> = [
        "landlord",
        "tenant",
        "vendor",
      ];

      for (const recipientType of recipientTypes) {
        const result = await sendNotification(
          recipientType,
          `${recipientType}-123`,
          "email",
          "schedule-confirmed",
          {
            to: `${recipientType}@example.com`,
            recipientName: "Test",
          }
        );

        expect(result.success).toBe(true);
      }
    });
  });
});

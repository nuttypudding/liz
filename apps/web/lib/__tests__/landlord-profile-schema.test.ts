import { describe, it, expect } from "vitest";
import { landlordProfileSchema } from "@/lib/validations";

describe("landlordProfileSchema", () => {
  const validProfile = {
    risk_appetite: "balanced",
    delegation_mode: "assist",
    max_auto_approve: 150,
    notify_emergencies: true,
    notify_all_requests: false,
    onboarding_completed: true,
  };

  it("accepts a valid profile", () => {
    const result = landlordProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("accepts all valid risk_appetite values", () => {
    for (const value of ["cost_first", "speed_first", "balanced"]) {
      const result = landlordProfileSchema.safeParse({
        ...validProfile,
        risk_appetite: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid risk_appetite value", () => {
    const result = landlordProfileSchema.safeParse({
      ...validProfile,
      risk_appetite: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid delegation_mode values", () => {
    for (const value of ["manual", "assist", "auto"]) {
      const result = landlordProfileSchema.safeParse({
        ...validProfile,
        delegation_mode: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid delegation_mode value", () => {
    const result = landlordProfileSchema.safeParse({
      ...validProfile,
      delegation_mode: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects max_auto_approve below 0", () => {
    const result = landlordProfileSchema.safeParse({
      ...validProfile,
      max_auto_approve: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects max_auto_approve above 10000", () => {
    const result = landlordProfileSchema.safeParse({
      ...validProfile,
      max_auto_approve: 10001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts max_auto_approve at boundaries", () => {
    expect(
      landlordProfileSchema.safeParse({ ...validProfile, max_auto_approve: 0 })
        .success
    ).toBe(true);
    expect(
      landlordProfileSchema.safeParse({
        ...validProfile,
        max_auto_approve: 10000,
      }).success
    ).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = landlordProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean notify fields", () => {
    const result = landlordProfileSchema.safeParse({
      ...validProfile,
      notify_emergencies: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean onboarding_completed", () => {
    const result = landlordProfileSchema.safeParse({
      ...validProfile,
      onboarding_completed: "true",
    });
    expect(result.success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  intakeSchema,
  propertySchema,
  tenantSchema,
  vendorSchema,
  dispatchSchema,
} from "@/lib/validations";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("intakeSchema", () => {
  it("accepts valid input", () => {
    const result = intakeSchema.safeParse({
      tenant_message: "Kitchen sink is leaking",
      property_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with photos", () => {
    const result = intakeSchema.safeParse({
      tenant_message: "Leak with photos",
      property_id: VALID_UUID,
      photo_paths: ["path/photo1.jpg", "path/photo2.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty tenant_message", () => {
    const result = intakeSchema.safeParse({
      tenant_message: "",
      property_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over 5000 chars", () => {
    const result = intakeSchema.safeParse({
      tenant_message: "a".repeat(5001),
      property_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID property_id", () => {
    const result = intakeSchema.safeParse({
      tenant_message: "Leak",
      property_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 photos", () => {
    const result = intakeSchema.safeParse({
      tenant_message: "Leak",
      property_id: VALID_UUID,
      photo_paths: ["a", "b", "c", "d", "e", "f"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts missing photo_paths (optional)", () => {
    const result = intakeSchema.safeParse({
      tenant_message: "Leak",
      property_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe("propertySchema", () => {
  const validAddress = {
    address_line1: "123 Main St",
    city: "Austin",
    state: "TX",
    postal_code: "78701",
  };

  it("accepts valid property", () => {
    const result = propertySchema.safeParse({
      name: "Test Property",
      ...validAddress,
    });
    expect(result.success).toBe(true);
  });

  it("applies default unit_count of 1", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit_count).toBe(1);
    }
  });

  it("rejects empty name", () => {
    const result = propertySchema.safeParse({
      name: "",
      ...validAddress,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty address_line1", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      address_line1: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty city", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      city: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty state", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      state: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty postal_code", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      postal_code: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative unit_count", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      unit_count: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects unit_count over 999", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      unit_count: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional monthly_rent", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      monthly_rent: 1500,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional apt_or_unit_no", () => {
    const result = propertySchema.safeParse({
      name: "Test",
      ...validAddress,
      apt_or_unit_no: "Suite 200",
    });
    expect(result.success).toBe(true);
  });
});

describe("tenantSchema", () => {
  it("accepts valid tenant", () => {
    const result = tenantSchema.safeParse({
      first_name: "John",
      last_name: "Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty first_name", () => {
    const result = tenantSchema.safeParse({
      first_name: "",
      last_name: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty last_name", () => {
    const result = tenantSchema.safeParse({
      first_name: "John",
      last_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts email, phone, unit_number as optional", () => {
    const result = tenantSchema.safeParse({
      first_name: "John",
      last_name: "Doe",
      email: "john@test.com",
      phone: "555-0100",
      unit_number: "1A",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for email (or pattern)", () => {
    const result = tenantSchema.safeParse({
      first_name: "John",
      last_name: "Doe",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = tenantSchema.safeParse({
      first_name: "John",
      last_name: "Doe",
      email: "not-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("vendorSchema", () => {
  it("accepts valid vendor", () => {
    const result = vendorSchema.safeParse({
      name: "FastFix Plumbing",
      specialty: "plumbing",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid specialty", () => {
    const result = vendorSchema.safeParse({
      name: "Test",
      specialty: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid specialty values", () => {
    const specialties = [
      "plumbing",
      "electrical",
      "hvac",
      "structural",
      "pest",
      "appliance",
      "general",
    ];
    for (const s of specialties) {
      const result = vendorSchema.safeParse({ name: "Test", specialty: s });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty name", () => {
    const result = vendorSchema.safeParse({
      name: "",
      specialty: "plumbing",
    });
    expect(result.success).toBe(false);
  });
});

describe("dispatchSchema", () => {
  it("accepts valid dispatch", () => {
    const result = dispatchSchema.safeParse({
      vendor_id: VALID_UUID,
      work_order_text: "Fix the leak under the kitchen sink",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID vendor_id", () => {
    const result = dispatchSchema.safeParse({
      vendor_id: "not-uuid",
      work_order_text: "Fix it",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty work_order_text", () => {
    const result = dispatchSchema.safeParse({
      vendor_id: VALID_UUID,
      work_order_text: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects work_order_text over 5000 chars", () => {
    const result = dispatchSchema.safeParse({
      vendor_id: VALID_UUID,
      work_order_text: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

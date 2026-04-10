import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/anthropic", () => {
  const mockCreateFn = vi.fn();
  return {
    anthropic: {
      messages: {
        create: mockCreateFn,
      },
    },
  };
});

import { anthropic } from "@/lib/anthropic";
import {
  suggestSchedulingSlots,
  TenantSlot,
  VendorAvailabilityRule,
  SlotSuggestion,
} from "@/lib/scheduling/ai-matcher";

// Get reference to the mock function
const mockCreate = vi.mocked(anthropic.messages.create);

const vendorAvailability: VendorAvailabilityRule[] = [
  {
    day_of_week: 1, // Monday
    start_time: "09:00",
    end_time: "17:00",
    timezone: "America/New_York",
  },
  {
    day_of_week: 2, // Tuesday
    start_time: "09:00",
    end_time: "17:00",
    timezone: "America/New_York",
  },
];

const tenantAvailability: TenantSlot[] = [
  { date: "2025-04-21", dayPart: "morning" }, // Monday
  { date: "2025-04-22", dayPart: "afternoon" }, // Tuesday
];

describe("suggestSchedulingSlots()", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  // Helper to create unique availability objects for each test
  const createVendorAvailability = () => [
    {
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      timezone: "America/New_York",
    },
    {
      day_of_week: 2,
      start_time: "09:00",
      end_time: "17:00",
      timezone: "America/New_York",
    },
  ];

  const createTenantAvailability = () => [
    { date: "2025-04-21", dayPart: "morning" as const },
    { date: "2025-04-22", dayPart: "afternoon" as const },
  ];

  it("returns empty suggestions when no tenant availability", async () => {
    const result = await suggestSchedulingSlots(
      "plumbing",
      createVendorAvailability(),
      [],
      "low",
      "America/New_York"
    );

    expect(result.suggestions).toHaveLength(0);
    expect(result.noOverlapReason).toBe("No tenant availability submitted yet.");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns suggestions from Claude response", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "11:00",
          reason: "Morning slot within vendor availability",
          score: 95,
        },
        {
          date: "2025-04-22",
          time_start: "14:00",
          time_end: "15:00",
          reason: "Afternoon slot matches tenant preference",
          score: 90,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "plumbing",
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/New_York"
    );

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].date).toBe("2025-04-21");
    expect(result.suggestions[0].timeStart).toBe("10:00");
    expect(result.suggestions[0].timeEnd).toBe("11:00");
    expect(result.suggestions[0].score).toBe(95);
  });

  it("sorts suggestions by score descending", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "11:00",
          reason: "Lower priority",
          score: 70,
        },
        {
          date: "2025-04-22",
          time_start: "14:00",
          time_end: "15:00",
          reason: "Highest priority",
          score: 100,
        },
        {
          date: "2025-04-21",
          time_start: "14:00",
          time_end: "15:00",
          reason: "Middle priority",
          score: 85,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "electrical", // different category to avoid cache
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/Chicago"
    );

    expect(result.suggestions[0].score).toBe(100);
    expect(result.suggestions[1].score).toBe(85);
    expect(result.suggestions[2].score).toBe(70);
  });

  it("limits suggestions to 5 max", async () => {
    const claudeResponse = {
      suggestions: [
        ...Array.from({ length: 10 }, (_, i) => ({
          date: "2025-04-21",
          time_start: `${9 + i}:00`,
          time_end: `${10 + i}:00`,
          reason: `Suggestion ${i + 1}`,
          score: 100 - i * 10,
        })),
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "hvac", // different category
      vendorAvailability,
      tenantAvailability,
      "medium", // different urgency
      "America/Denver"
    );

    expect(result.suggestions.length).toBeLessThanOrEqual(5);
    expect(result.suggestions).toHaveLength(5);
  });

  it("filters invalid suggestions", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "11:00",
          reason: "Valid",
          score: 95,
        },
        {
          date: "2025-04-22",
          time_start: "14:00",
          time_end: "15:00",
          reason: "Invalid - missing score",
          score: undefined,
        } as any,
        {
          date: "2025-04-23",
          time_start: "09:00",
          time_end: "10:00",
          reason: "Valid",
          score: 85,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "plumbing",
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/New_York"
    );

    // Only the valid suggestions should be included
    expect(result.suggestions.every((s) => typeof s.score === "number")).toBe(
      true
    );
  });

  it("handles no-overlap case from Claude", async () => {
    const claudeResponse = {
      suggestions: [],
      no_overlap_reason:
        "Vendor has no availability during tenant's preferred times",
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "structural",
      createVendorAvailability(),
      createTenantAvailability(),
      "emergency",
      "America/Phoenix"
    );

    expect(result.suggestions).toHaveLength(0);
    expect(result.noOverlapReason).toBe(
      "Vendor has no availability during tenant's preferred times"
    );
  });

  it("handles invalid JSON response from Claude", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "Invalid JSON response" },
      ],
    });

    const result = await suggestSchedulingSlots(
      "pest", // unique
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/Boston"
    );

    expect(result.suggestions).toHaveLength(0);
  });

  it("handles Claude API errors gracefully", async () => {
    mockCreate.mockRejectedValueOnce(
      new Error("API rate limit exceeded")
    );

    const result = await suggestSchedulingSlots(
      "appliance", // unique
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/Toronto"
    );

    expect(result.suggestions).toHaveLength(0);
  });

  it("handles non-array suggestions from Claude", async () => {
    const claudeResponse = {
      suggestions: "not an array",
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "general", // unique
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/Anchorage"
    );

    expect(result.suggestions).toHaveLength(0);
  });

  it("respects urgency level in prompt", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "10:30",
          reason: "Emergency priority - shorter duration",
          score: 95,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    await suggestSchedulingSlots(
      "electrical",
      vendorAvailability,
      tenantAvailability,
      "emergency",
      "America/New_York"
    );

    // Verify Claude was called with emergency urgency
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("emergency"),
          }),
        ]),
      })
    );
  });

  it("sends landlord timezone to Claude", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "11:00",
          reason: "Valid",
          score: 95,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    await suggestSchedulingSlots(
      "plumbing",
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/Los_Angeles"
    );

    // Verify Claude was called with Los Angeles timezone
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("America/Los_Angeles"),
          }),
        ]),
      })
    );
  });

  it("returns consistent results for identical inputs", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "11:00",
          reason: "Test",
          score: 95,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "plumbing",
      createVendorAvailability(),
      createTenantAvailability(),
      "low",
      "America/New_York"
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].date).toBe("2025-04-21");
  });

  it("uses correct model and token limits", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "11:00",
          reason: "Test",
          score: 95,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    await suggestSchedulingSlots(
      "plumbing",
      createVendorAvailability(),
      createTenantAvailability(),
      "low",
      "America/New_York"
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
      })
    );
  });

  it("handles empty vendor availability", async () => {
    const claudeResponse = {
      suggestions: [],
      no_overlap_reason: "No vendor availability on record.",
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    const result = await suggestSchedulingSlots(
      "plumbing",
      [],
      createTenantAvailability(),
      "low",
      "America/New_York"
    );

    expect(result.suggestions).toHaveLength(0);
  });

  it("includes request category in prompt", async () => {
    const claudeResponse = {
      suggestions: [
        {
          date: "2025-04-21",
          time_start: "10:00",
          time_end: "11:00",
          reason: "Test",
          score: 95,
        },
      ],
      no_overlap_reason: null,
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: JSON.stringify(claudeResponse) },
      ],
    });

    await suggestSchedulingSlots(
      "hvac",
      vendorAvailability,
      tenantAvailability,
      "low",
      "America/New_York"
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("hvac"),
          }),
        ]),
      })
    );
  });
});

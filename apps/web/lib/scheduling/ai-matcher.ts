// Stub implementation — task T-110 will replace this with the full Claude AI implementation.

export type DayPart = "morning" | "afternoon" | "evening";

export type TenantSlot = {
  date: string; // YYYY-MM-DD
  dayPart: DayPart;
};

export type VendorAvailabilityRule = {
  day_of_week: number; // 0-6
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  timezone: string;
};

export type SlotSuggestion = {
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  reason: string;
  score: number; // 0-100
};

export type SuggestResult = {
  suggestions: SlotSuggestion[];
  noOverlapReason?: string;
};

/**
 * Suggest scheduling slots by matching vendor and tenant availability.
 * Full AI implementation is added by T-110.
 */
export async function suggestSchedulingSlots(
  _requestCategory: string,
  _vendorAvailability: VendorAvailabilityRule[],
  tenantAvailability: TenantSlot[],
  _urgency: "low" | "medium" | "emergency",
  _landlordTimezone: string
): Promise<SuggestResult> {
  if (tenantAvailability.length === 0) {
    return {
      suggestions: [],
      noOverlapReason: "No tenant availability submitted yet.",
    };
  }

  // Basic stub: return first available slot from tenant input
  const first = tenantAvailability[0];
  const timeRange = dayPartToTimeRange(first.dayPart);

  return {
    suggestions: [
      {
        date: first.date,
        timeStart: timeRange.start,
        timeEnd: timeRange.end,
        reason: "Best match based on submitted availability (AI matcher pending).",
        score: 70,
      },
    ],
  };
}

function dayPartToTimeRange(dayPart: DayPart): { start: string; end: string } {
  switch (dayPart) {
    case "morning":
      return { start: "09:00", end: "12:00" };
    case "afternoon":
      return { start: "12:00", end: "17:00" };
    case "evening":
      return { start: "17:00", end: "20:00" };
  }
}

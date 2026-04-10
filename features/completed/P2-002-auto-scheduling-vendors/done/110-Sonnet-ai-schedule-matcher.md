---
id: 110
title: AI schedule matcher — Claude prompt for slot suggestions, JSON parsing
tier: Sonnet
depends_on: [109]
feature: P2-002-auto-scheduling-vendors
---

# 110 — AI Schedule Matcher — Claude Prompt for Slot Suggestions, JSON Parsing

## Objective
Use Claude Sonnet to analyze vendor and tenant availability constraints and generate optimized time slot suggestions with reasoning.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/lib/scheduling/ai-matcher.ts`:
   - Export `suggestSchedulingSlots()` async function with signature:
     ```typescript
     async function suggestSchedulingSlots(
       request: MaintenanceIntakeRequest,
       vendor: Vendor,
       vendorAvailability: VendorAvailabilityRule[],
       tenantAvailability: { dayPart: string; date: string }[],
       urgency: 'low' | 'medium' | 'emergency',
       landlordTimezone: string
     ): Promise<{
       suggestions: Array<{
         date: string;
         timeStart: string;
         timeEnd: string;
         reason: string;
         score: number; // 0-100
       }>;
       noOverlapReason?: string;
     }>
     ```

2. Prompt design:
   - Include:
     - Work order category and urgency
     - Vendor availability rules (formatted as readable schedule)
     - Tenant available day-parts (formatted as readable list)
     - Landlord timezone
     - Constraint: work order duration estimate (30min, 1hr, 2hr, half-day, full-day)
   - Request: "Suggest 3-5 optimal time slots for this appointment, ranked by fit"
   - Ensure response is valid JSON array of suggestions with date, time_start, time_end, reason, score

3. Response parsing:
   - Use JSON.parse() with error handling
   - Validate response structure (all required fields present)
   - If no overlapping availability, return noOverlapReason explaining conflict
   - Return max 5 suggestions, sorted by score descending

4. Error handling:
   - If Claude API fails, gracefully return empty suggestions array
   - Log errors for debugging
   - Return meaningful error messages

5. Caching consideration:
   - Consider caching suggestions per taskId for 15 minutes to reduce API calls

## Acceptance Criteria
1. [ ] `suggestSchedulingSlots()` function callable with required parameters
2. [ ] Prompt includes all constraint information (vendor hours, tenant availability, urgency)
3. [ ] Response parsed as JSON with expected structure
4. [ ] Returns array of up to 5 suggestions sorted by score
5. [ ] Each suggestion includes date, timeStart, timeEnd, reason, score
6. [ ] Handles no-overlap case with explanation
7. [ ] Error handling graceful (returns empty array on Claude API failure)
8. [ ] Respects timezone conversions

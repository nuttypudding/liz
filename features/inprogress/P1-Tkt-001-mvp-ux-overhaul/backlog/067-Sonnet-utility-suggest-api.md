---
id: 067
title: Utility suggest API route — POST /api/properties/[id]/utilities/suggest (Claude Haiku)
tier: Sonnet
depends_on: [25, 26]
feature: P1-Tkt-001-mvp-ux-overhaul
---

# 067 — Utility Suggest API (Claude AI)

## Objective

Build the POST endpoint that sends a property address to Claude Haiku and returns structured utility provider suggestions.

## Context

See `features/inprogress/P1-Tkt-001-mvp-ux-overhaul/utility-company-integration.md` — "Claude AI Prompt Design" and "Architecture (Auto-Pull Flow)" sections.

## Implementation

Create `apps/web/app/api/properties/[id]/utilities/suggest/route.ts`:

1. Auth check (landlord only)
2. Fetch property address from DB
3. Call Claude API (Haiku model) with structured prompt:
   - System: utility lookup assistant prompt
   - User: property address
   - Expected response: JSON with 4 utility types (electric, gas, water_sewer, trash_recycling)
4. Parse Claude response
5. Return `UtilitySuggestion[]` — NOT saved to DB (client handles save via PUT)
6. Error handling: Claude timeout → return empty suggestions with error message

Internet/cable and HOA are NOT AI-suggested — landlord-entered only.

Rate limiting consideration: max 5 suggest calls per property per day.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Sends property address to Claude Haiku
3. [ ] Returns structured suggestions for 4 utility types
4. [ ] Does NOT save to DB (suggestions only)
5. [ ] Each suggestion includes confidence level (high/medium/low)
6. [ ] Graceful error handling for Claude API failures
7. [ ] Auth check: landlord only

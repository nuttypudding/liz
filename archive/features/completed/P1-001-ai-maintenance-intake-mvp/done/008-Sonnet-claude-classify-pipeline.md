---
id: 008
title: Implement Claude AI classification pipeline (Gatekeeper + Estimator)
tier: Sonnet
depends_on: [1]
feature: ai-maintenance-intake-mvp
---

# 008 — Implement Claude AI Classification Pipeline (Gatekeeper + Estimator)

## Objective

Replace the mock classification in `/api/classify` with real Claude Sonnet API calls. This implements both the Gatekeeper (is this self-resolvable?) and the Estimator (classify category, urgency, cost estimate).

## Context

- Feature plan: "The Core Four" sections 1 (Gatekeeper) and 2 (Estimator)
- Existing stub: `apps/web/app/api/classify/route.ts` — returns mock data
- SDK installed: `@anthropic-ai/sdk` (v0.82.0) in package.json
- Env var: `ANTHROPIC_API_KEY` in `.env.example`
- Categories: plumbing, electrical, hvac, structural, pest, appliance, general
- Urgency levels: low, medium, emergency
- DB fields to update on `maintenance_requests`: ai_category, ai_urgency, ai_recommended_action, ai_cost_estimate_low, ai_cost_estimate_high, ai_confidence_score, ai_troubleshooting_guide, ai_self_resolvable

## Implementation

### Step 1: Create Claude client utility

Create `apps/web/lib/anthropic.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Step 2: Implement the Gatekeeper prompt

First call: determine if the issue is self-resolvable.

```typescript
const gatekeeperResponse = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: `You are a maintenance triage assistant. A tenant has submitted:

"${tenantMessage}"

Determine if this is something the tenant can likely fix themselves.

Respond with JSON only:
{
  "self_resolvable": true/false,
  "troubleshooting_guide": "step-by-step instructions if self-resolvable, null otherwise",
  "confidence": 0.0-1.0
}`
  }],
});
```

### Step 3: Implement the Estimator prompt (with vision)

If not self-resolvable, or always run in parallel for full classification:

```typescript
const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
  {
    type: "text",
    text: `Classify this maintenance request. Tenant says: "${tenantMessage}"

Respond with JSON:
{
  "category": "plumbing|electrical|hvac|structural|pest|appliance|general",
  "urgency": "low|medium|emergency",
  "recommended_action": "brief description",
  "cost_estimate_low": number,
  "cost_estimate_high": number,
  "confidence_score": 0.0-1.0
}`
  }
];

// Add photos as vision content if available
for (const photo of photos) {
  const { data } = await supabase.storage
    .from("request-photos")
    .download(photo.storage_path);
  const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
  content.push({
    type: "image",
    source: { type: "base64", media_type: photo.file_type, data: base64 },
  });
}

const classifyResponse = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content }],
});
```

### Step 4: Parse and store results

Parse the JSON response, update the `maintenance_requests` row with all AI fields, set status to "triaged".

### Step 5: Error handling

- If Claude API fails: return 503 with user-friendly message, leave request in "submitted" status
- If JSON parsing fails: log the raw response, return 500
- Rate limiting: consider retry with exponential backoff

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] POST /api/classify calls real Claude Sonnet API
3. [ ] Gatekeeper: correctly identifies self-resolvable issues and generates troubleshooting guides
4. [ ] Estimator: classifies category (7 options), urgency (3 levels), cost estimate range, confidence score
5. [ ] Vision: photos are sent to Claude as base64 images when available
6. [ ] Results stored on maintenance_requests row (all ai_* fields)
7. [ ] Status updated to "triaged" after successful classification
8. [ ] Graceful error handling: API failure doesn't lose the request
9. [ ] Response includes both gatekeeper and estimator results for the frontend

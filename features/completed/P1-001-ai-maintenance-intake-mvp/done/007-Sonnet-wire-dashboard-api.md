---
id: 007
title: Wire dashboard stats and spend chart to Supabase
tier: Sonnet
depends_on: [1]
feature: ai-maintenance-intake-mvp
---

# 007 — Wire Dashboard Stats and Spend Chart to Supabase

## Objective

Replace hardcoded mock values in the dashboard API routes with real Supabase aggregate queries. The landlord dashboard shows emergency count, open requests, average resolution time, and spend vs. rent.

## Context

- Existing route stubs:
  - `apps/web/app/api/dashboard/stats/route.ts` — GET
  - `apps/web/app/api/dashboard/spend-chart/route.ts` — GET
- Dashboard components: `SectionCards` (4 stat cards), `EmergencyAlertBanner`, `SpendChart`
- Data needed for stats:
  - Emergency request count (where ai_urgency = 'emergency' AND status NOT IN ('resolved', 'closed'))
  - Open request count (status NOT IN ('resolved', 'closed'))
  - Average resolution time (avg of resolved_at - created_at for resolved requests)
  - Total maintenance spend (sum of actual_cost for resolved requests this month)
- Data needed for spend chart:
  - Per-property: property name, total actual_cost (spend), monthly_rent

## Implementation

### GET /api/dashboard/stats

```typescript
const { userId } = await auth();
await requireRole("landlord");
const supabase = createServerSupabaseClient();

// Get landlord's property IDs
const { data: properties } = await supabase
  .from("properties")
  .select("id")
  .eq("landlord_id", userId);

const propertyIds = properties?.map((p) => p.id) || [];

// Emergency count
const { count: emergencyCount } = await supabase
  .from("maintenance_requests")
  .select("*", { count: "exact", head: true })
  .in("property_id", propertyIds)
  .eq("ai_urgency", "emergency")
  .not("status", "in", '("resolved","closed")');

// Open count
const { count: openCount } = await supabase
  .from("maintenance_requests")
  .select("*", { count: "exact", head: true })
  .in("property_id", propertyIds)
  .not("status", "in", '("resolved","closed")');

// Avg resolution time + total spend (fetch resolved requests)
const { data: resolved } = await supabase
  .from("maintenance_requests")
  .select("created_at, resolved_at, actual_cost")
  .in("property_id", propertyIds)
  .eq("status", "resolved");

// Calculate averages in JS
```

### GET /api/dashboard/spend-chart

```typescript
// Per property: name, monthly_rent, total spend
const { data: properties } = await supabase
  .from("properties")
  .select("id, name, monthly_rent")
  .eq("landlord_id", userId);

// For each property, sum actual_cost of resolved requests
// Use a single query with group by or multiple queries
```

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] GET /api/dashboard/stats returns: emergencyCount, openCount, avgResolutionHours, totalSpend
3. [ ] GET /api/dashboard/spend-chart returns: array of { property, spend, rent } per property
4. [ ] All queries are scoped to the landlord's properties only
5. [ ] Empty state handled: new landlord with no properties/requests gets zeroes
6. [ ] Response shape matches what `SectionCards` and `SpendChart` components expect

---
id: 238
title: "Extend properties API — add rent_due_day to create/update routes + property forms"
tier: Sonnet
depends_on: ["231"]
feature: P2-001-rent-reminder
---

# 238 — Extend Properties API with rent_due_day

## Objective

Add `rent_due_day` support to the property create and update API routes, and to the property forms in the UI.

## Context

The `rent_due_day` column (integer 1-28) is added to `properties` in task 231. This task wires it into the existing property CRUD flow.

Check `apps/web/app/api/properties/` for the existing routes, and find the property create/edit form components.

## Implementation

1. **`POST /api/properties`**: Accept `rent_due_day` in the request body. Validate it's an integer 1-28. Default to 1 if not provided.

2. **`PUT /api/properties/[id]`** (or `PATCH`): Accept `rent_due_day` in the update body. Same validation.

3. **Property create/edit form**: Add a "Rent Due Day" field — a number input or select with options 1-28, defaulting to 1. Label: "Rent Due Day". Description: "Day of the month when rent is due (1-28)."

4. **Property display**: Show `rent_due_day` in the property detail view if it exists.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] `POST /api/properties` accepts and saves `rent_due_day`
3. [ ] `PUT /api/properties/[id]` accepts and updates `rent_due_day`
4. [ ] Validation: rejects values outside 1-28 range
5. [ ] Property create form includes rent due day field
6. [ ] Property edit form includes rent due day field with current value pre-filled
7. [ ] Default value is 1 when not specified
8. [ ] All tests pass

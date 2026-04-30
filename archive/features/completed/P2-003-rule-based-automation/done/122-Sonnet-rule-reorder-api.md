---
id: 122
title: Rule reorder API route — PATCH /api/rules/[id]/reorder
tier: Sonnet
depends_on: [121]
feature: P2-003-rule-based-automation
---

# 122 — Rule Reorder API Route

## Objective
Implement API route to reorder rules by priority without having to update each rule individually.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

When rules are dragged and reordered in the UI, a single PATCH request updates priorities atomically for all affected rules.

## Implementation

1. Create route `apps/web/app/api/rules/[id]/reorder/route.ts`:
   - **PATCH**: Reorder rule by priority
     - Payload: `{ new_priority: number }`
     - Validate new_priority is within valid range (0–999)
     - Verify landlord ownership of rule
     - Algorithm:
       - If new_priority < current_priority: shift rules down (increment priorities between old and new)
       - If new_priority > current_priority: shift rules up (decrement priorities between old and new)
       - Update target rule's priority to new_priority
     - Atomically update all affected rules in single transaction
     - Return updated rule with new priority

2. Use Supabase client with transaction:
   - Begin transaction
   - Query current rule and all landlord's rules
   - Calculate shift operations
   - Update rules
   - Commit transaction

3. Validation:
   - Rule must exist and belong to authenticated landlord
   - new_priority must be >= 0 and < (number_of_rules + 1)
   - Accept integer only

4. Error handling:
   - 400: Invalid new_priority (out of range or non-integer)
   - 401: Unauthenticated
   - 403: Landlord not owner
   - 404: Rule not found
   - 409: Conflict if concurrent reorder attempt (transaction failed)
   - 500: Database errors

5. Update `docs/endpoints.md`:
   - PATCH /api/rules/[id]/reorder — Reorder rule by priority

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] PATCH /api/rules/[id]/reorder accepts new_priority payload
3. [ ] Ownership verification enforced
4. [ ] Rules reordered correctly (shift up/down works)
5. [ ] Atomicity: all rules updated in single transaction
6. [ ] Invalid priority values rejected with 400
7. [ ] Non-existent rule returns 404
8. [ ] Concurrent reorder handled safely (transaction)
9. [ ] docs/endpoints.md updated
10. [ ] Manual test: Create 3 rules, reorder middle rule to top, verify priority chain
11. [ ] Verify other rules' priorities adjusted correctly
12. [ ] Response includes updated rule with correct new priority

---
id: 163
title: Autonomous decisions API — GET (feed), POST (create), PATCH (review)
tier: Sonnet
depends_on: [159, 161]
feature: P3-001-autonomous-decision-making
---

# 163 — Autonomous Decisions API Routes

## Objective
Build API routes for autonomous decision management: list decisions, create new records, and review/override decisions.

## Context
Reference: `features/inprogress/P3-001-autonomous-decision-making/README.md`

The decisions API is the transaction log for autonomy. Landlords view their decision feed, the engine creates new records, and landlords confirm or override decisions.

## Implementation

1. Create route file: `apps/web/app/api/autonomy/decisions/route.ts`
2. Implement GET handler (list/feed):
   - Authenticate with withAuth middleware
   - Accept query params: status (optional), sort (created_at|-created_at), limit (max 50, default 20), offset (default 0)
   - Fetch decisions for the landlord, filtered by status if provided
   - Return paginated response: { decisions: AutonomousDecision[], total: number, hasMore: boolean }
3. Implement POST handler (create):
   - Authenticate with withAuth middleware
   - Accept body: { request_id, decision_type, confidence_score, reasoning, factors, safety_checks, actions_taken }
   - Validate all required fields present
   - Validate decision_type is one of: 'dispatch', 'escalate', 'hold'
   - Validate confidence_score is 0-1
   - Insert record with status='pending_review'
   - Return created decision
4. Create route file: `apps/web/app/api/autonomy/decisions/[id]/route.ts`
5. Implement PATCH handler (review):
   - Authenticate with withAuth middleware
   - Accept body: { review_action, review_notes } where review_action is 'confirmed' or 'overridden'
   - Update decision record: status, reviewed_at, review_action, review_notes
   - Return updated decision
6. Error handling:
   - 401 if unauthenticated
   - 400 if validation fails
   - 404 if decision not found or not owned by landlord
   - 500 on database error
7. Test routes with curl/Postman

## Acceptance Criteria
1. [ ] GET route returns paginated decisions list
2. [ ] GET filters by status when provided
3. [ ] GET enforces landlord_id ownership
4. [ ] POST creates new decision with pending_review status
5. [ ] POST validates decision_type enum
6. [ ] POST validates confidence_score (0-1)
7. [ ] PATCH updates decision status and review fields
8. [ ] PATCH enforces landlord_id ownership
9. [ ] All error responses include descriptive messages
10. [ ] Routes tested with manual API calls

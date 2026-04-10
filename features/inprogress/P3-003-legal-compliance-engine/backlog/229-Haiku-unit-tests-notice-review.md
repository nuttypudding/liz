---
id: 229
title: Unit tests — notice generation, communication review API
tier: Haiku
depends_on: [214, 215]
feature: P3-003-legal-compliance-engine
---

# 229 — Unit Tests: Notice Generation and Communication Review

## Objective
Create unit tests for notice generation and communication review API routes. Verify that Claude API calls return expected output, error handling works, and prompts are applied correctly.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Notice generation and communication review are AI-driven features that must be tested for correct behavior, error handling, and output format.

## Implementation

1. **Test file** — `apps/web/lib/compliance/__tests__/communication-review.test.ts`
   - Test POST /api/compliance/review endpoint

2. **Test suite: POST /api/compliance/review**
   - Test: Returns valid findings for clean message
     - Inputs: messageText="Please fix the water leak"
     - Expected: findings array empty, safe_to_send=true, risk_level="low"
   - Test: Identifies fair housing violation
     - Inputs: messageText="I don't rent to people with children"
     - Expected: findings with severity="error", type="fair_housing", flagged_text contains discriminatory language
   - Test: Identifies missing disclosure
     - Inputs: messageText="Please send rent to [address]" (missing required disclosures)
     - Expected: findings with type="disclosure", suggestion includes required text
   - Test: Multiple findings in single message
     - Inputs: messageText with both fair housing and disclosure issues
     - Expected: findings array with 2+ items
   - Test: Validates message_text not empty
     - Inputs: messageText=""
     - Expected: 400 Bad Request, message="Message text required"
   - Test: Requires property_id
     - Inputs: (no property_id)
     - Expected: 400 Bad Request or uses generic context
   - Test: Returns 404 for invalid property_id
     - Inputs: property_id="invalid-uuid"
     - Expected: 404 error

3. **Test suite: Review output format**
   - Test: Findings have required fields
     - Expected: Each finding has severity, type, flagged_text, reason, suggestion
   - Test: overall_risk_level is valid
     - Expected: One of "low", "medium", "high"
   - Test: safe_to_send is boolean
     - Expected: safe_to_send = (overall_risk_level == "low")
   - Test: Includes disclaimer
     - Expected: Response includes disclaimer text

4. **Test suite: Escalation triggers**
   - Test: Eviction scenario triggers escalation
     - Inputs: messageText mentioning eviction/lease termination
     - Expected: escalation_required=true
   - Test: Fair housing violation triggers escalation
     - Inputs: messageText with discrimination
     - Expected: escalation_required=true
   - Test: ADA denial triggers escalation
     - Inputs: messageText denying accommodation
     - Expected: escalation_required=true

5. **Test file** — `apps/web/lib/compliance/__tests__/notice-generation.test.ts`
   - Test POST /api/compliance/notices/generate endpoint

6. **Test suite: Notice generation**
   - Test: Entry notice generated correctly
     - Inputs: notice_type="entry", context with tenant_name, proposed_date
     - Expected: notice_content includes tenant name, date, notice period, statute citation
   - Test: Lease violation notice generated
     - Inputs: notice_type="lease_violation", context with issue_description
     - Expected: notice describes violation, includes cure period or termination notice
   - Test: Rent increase notice generated
     - Inputs: notice_type="rent_increase", context with amount and effective_date
     - Expected: notice shows old and new rent, effective date, statutory notice period
   - Test: Eviction notice generated
     - Inputs: notice_type="eviction", context with reason
     - Expected: notice includes legal basis for eviction, cure deadlines if applicable

7. **Test suite: Notice format and content**
   - Test: Notice is properly formatted
     - Expected: Professional letter format with date, salutation, body, signature block
   - Test: Notice includes statute citations
     - Expected: notice_content contains statute citations (e.g., "CA Civil Code § 1950.7")
   - Test: Notice includes disclaimer
     - Expected: Generated notice includes disclaimer about AI generation
   - Test: Notice specifies jurisdiction
     - Expected: notice includes jurisdiction rules and requirements
   - Test: statutory_citations field populated
     - Expected: Response includes array of statute citations extracted from notice

8. **Test suite: Validation**
   - Test: Validates notice_type
     - Inputs: notice_type="invalid_type"
     - Expected: 400 Bad Request
   - Test: Requires property_id
     - Expected: 400 or uses default context
   - Test: Validates required context fields by notice_type
     - Entry: Requires tenant_name, proposed_date
     - Lease violation: Requires issue_description
     - Rent increase: Requires amount, effective_date
     - Expected: 400 if missing required fields
   - Test: Returns 404 for invalid property_id
   - Test: Returns 400 if jurisdiction not configured

9. **Test suite: Database storage**
   - Test: Notice stored in compliance_notices table
     - Expected: After generation, notice record exists with status="generated"
   - Test: Notice content persisted correctly
     - Expected: Stored notice_content matches generated content
   - Test: Jurisdiction data snapshot stored
     - Expected: jurisdiction_data JSONB contains rules snapshot
   - Test: Generation logged to audit
     - Expected: compliance_audit_log entry with action_type="notice_generated"

10. **Test file** — `apps/web/lib/compliance/__tests__/prompts.test.ts`
    - Test Claude prompt generation

11. **Test suite: Prompt building**
    - Test: Review prompt includes jurisdiction context
      - Expected: Prompt contains state_code, city, applicable rules
    - Test: Review prompt formats correctly
      - Expected: Prompt is valid text, includes instructions
    - Test: Generation prompt includes all context
      - Expected: Prompt contains property, tenant, context data
    - Test: Prompts escape special characters
      - Expected: Strings with quotes/newlines are properly escaped

12. **Test file** — `apps/web/lib/compliance/__tests__/api-errors.test.ts`
    - Error handling and edge cases

13. **Test suite: Error handling**
    - Test: Claude API timeout handled gracefully
      - Inputs: Simulate API timeout
      - Expected: 500 error returned, user-friendly message
    - Test: Claude API rate limit handled
      - Inputs: Simulate rate limit
      - Expected: 429 Too Many Requests
    - Test: Claude API invalid response handled
      - Inputs: Claude returns non-JSON response
      - Expected: Error logged, 500 returned
    - Test: Property not found returns 404
    - Test: Unauthorized user returns 403

14. **Test utilities**:
    - Create `apps/web/lib/compliance/__tests__/fixtures.ts` with:
      - Mock properties
      - Mock jurisdictions
      - Sample messages (clean, fair housing violation, etc.)
      - Sample notice contexts
    - Create `apps/web/lib/compliance/__tests__/claude-mock.ts`:
      - Mock Claude API responses
      - Mock valid/invalid outputs

15. **Running tests**:
    - Command: `npm run test -- compliance`
    - Mock Claude API to avoid real API calls during tests
    - Use fixtures for consistent test data

## Acceptance Criteria
1. [ ] Unit test file for communication review created
2. [ ] Tests: Clean messages, fair housing violations, missing disclosures
3. [ ] Tests: Multiple findings, output format validation
4. [ ] Tests: Escalation triggers
5. [ ] Unit test file for notice generation created
6. [ ] Tests: Entry, lease violation, rent increase, eviction notices
7. [ ] Tests: Notice format, statute citations, disclaimer
8. [ ] Tests: Validation of notice_type and required context fields
9. [ ] Tests: Notice storage in database
10. [ ] Tests: Audit logging of generation
11. [ ] Prompt generation tests created
12. [ ] Error handling tests: API timeout, rate limit, invalid response
13. [ ] Mock fixtures created for test data
14. [ ] Mock Claude API responses for reproducible tests
15. [ ] All tests pass (100% passing)
16. [ ] Test coverage ≥80% for notice and review logic

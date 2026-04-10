---
id: 214
title: Communication review API route — POST /api/compliance/review (Claude integration)
tier: Sonnet
depends_on: [207, 210]
feature: P3-003-legal-compliance-engine
---

# 214 — Communication Review API Route

## Objective
Build an API endpoint that integrates Claude to review landlord messages for fair housing violations, improper notice language, and missing disclosures. Returns findings with severity levels and suggested corrections.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Before landlords send messages to tenants, the compliance engine should scan for potential legal issues. Claude AI identifies problematic language and suggests corrections, helping prevent costly fair housing violations.

## Implementation

1. **POST /api/compliance/review**
   - Auth: Verify user is authenticated
   - Request body:
     ```json
     {
       "message_text": "string (the message to review)",
       "property_id": "uuid",
       "recipient_type": "tenant|vendor|other" (optional, defaults to "tenant")
     }
     ```
   - property_id used to fetch jurisdiction for context

2. **Claude prompt design**:
   - Provide jurisdiction context (state, city, applicable rules)
   - Ask Claude to identify:
     - Fair housing violations (discrimination based on protected class)
     - Improper notice language (missing required disclosures, improper formatting)
     - Potential liability issues (threats, illegal demands)
     - Missing statutory language
   - Response structure:
     ```json
     {
       "findings": [
         {
           "severity": "warning|error",
           "type": "fair_housing|notice_language|disclosure|other",
           "flagged_text": "the exact text from message",
           "reason": "explanation of issue",
           "suggestion": "how to correct it"
         }
       ],
       "overall_risk_level": "low|medium|high",
       "safe_to_send": boolean
     }
     ```

3. **Response format**:
   ```json
   {
     "property_id": "uuid",
     "jurisdiction": { "state_code": "CA", "city": "San Francisco" },
     "findings": [...],
     "overall_risk_level": "medium",
     "safe_to_send": false,
     "reviewed_at": "2026-04-10T14:22:00Z"
   }
   ```
   - Always include disclaimer: "This AI review does not replace legal counsel."

4. **Error handling**:
   - 404 if property not found
   - 400 if message_text is empty or property_id invalid
   - Handle Claude API errors gracefully

5. **Logging**:
   - Log review to compliance_audit_log
   - action_type: "communication_reviewed"
   - details: `{ findings_count, overall_risk_level }`

6. **Update endpoints.md**
   - Document POST /api/compliance/review

## Acceptance Criteria
1. [ ] Accepts message_text, property_id, optional recipient_type
2. [ ] Fetches jurisdiction context and passes to Claude prompt
3. [ ] Claude identifies fair housing, notice language, and disclosure issues
4. [ ] Returns structured findings with severity, type, flagged_text, reason, suggestion
5. [ ] Includes overall_risk_level and safe_to_send boolean
6. [ ] Disclaimer included in response
7. [ ] Reviews logged to compliance_audit_log
8. [ ] Error handling for missing/invalid inputs
9. [ ] endpoints.md updated

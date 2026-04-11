---
id: 217
title: Knowledge base API route — GET /api/compliance/knowledge
tier: Sonnet
depends_on: [207, 208]
feature: P3-003-legal-compliance-engine
---

# 217 — Knowledge Base API Route

## Objective
Build an API endpoint that returns jurisdiction rules organized by topic and jurisdiction. Supports filtering by state, city, and topic. Provides a queryable knowledge base for the UI to display rules and requirements.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Landlords need access to the actual rules that guide compliance decisions. A knowledge base API organized by topic and jurisdiction enables the UI to display rule details, statute citations, and jurisdiction-specific requirements.

## Implementation

1. **GET /api/compliance/knowledge**
   - Auth: Verify user is authenticated
   - Query params:
     - `?state_code=CA` (filter by state, required if city provided)
     - `?city=San Francisco` (filter by city, optional)
     - `?topic=notice_period_entry` (filter by topic, optional)
     - `?search=deposit` (free-text search in rule_text and statute_citation)
     - `?limit=50` (default 50, max 100)
     - `?offset=0` (pagination)

2. **Response format** — Organized by jurisdiction, then by topic:
   ```json
   {
     "jurisdictions": [
       {
         "state_code": "CA",
         "city": null,
         "rules": [
           {
             "id": "uuid",
             "topic": "security_deposit_limit",
             "rule_text": "Security deposit shall not exceed two months' rent.",
             "statute_citation": "CA Civil Code § 1950.7",
             "details": {
               "amount_limit": "2 months rent",
               "special_notes": "Does not apply to furnished units (max 3 months)."
             },
             "last_verified_at": "2026-04-01"
           }
         ]
       },
       {
         "state_code": "CA",
         "city": "San Francisco",
         "rules": [
           {
             "id": "uuid",
             "topic": "rent_control_policy",
             "rule_text": "San Francisco Rent Stabilization and Arbitration Ordinance applies...",
             "statute_citation": "SF Admin Code § 37.1 et seq.",
             "details": {
               "annual_increase_cap": "60% of CPI",
               "exemptions": ["single-family homes", "new construction (first 15 years)"]
             },
             "last_verified_at": "2026-04-05"
           }
         ]
       }
     ],
     "total_count": 42,
     "limit": 50,
     "offset": 0
   }
   ```

3. **Filtering logic**:
   - If state_code provided: filter jurisdiction_rules by state_code
   - If city provided: also filter by city (can have state-level and city-level rules)
   - If topic provided: filter rules by topic
   - If search provided: full-text search on rule_text + statute_citation
   - Default (no filters): return all rules for all jurisdictions (expensive, consider pagination)

4. **Pagination**:
   - Return limit and offset in response
   - Enforce max limit of 100
   - Return total_count so client can paginate

5. **Error handling**:
   - 400 if invalid state_code (not in jurisdiction_rules)
   - 400 if invalid city (not in jurisdiction_rules for that state)

6. **Optimization**:
   - Consider caching entire knowledge base (slow to change)
   - Or cache individual state/city combinations

7. **Update endpoints.md**
   - Document GET /api/compliance/knowledge with query parameters

## Acceptance Criteria
1. [ ] Accepts state_code, city, topic, search, limit, offset query parameters
2. [ ] Returns rules organized by jurisdiction (state + city)
3. [ ] Each rule includes id, topic, rule_text, statute_citation, details, last_verified_at
4. [ ] Supports filtering by all query parameters
5. [ ] Free-text search works on rule_text and statute_citation
6. [ ] Returns total_count, limit, offset for pagination
7. [ ] Enforces max limit of 100
8. [ ] Error handling for invalid state_code or city
9. [ ] endpoints.md updated

---
id: 135
title: Stale reference detection — flag rules with deleted vendors/properties
tier: Sonnet
depends_on: [121]
feature: P2-003-rule-based-automation
---

# 135 — Stale Reference Detection

## Objective
Detect and flag automation rules that reference vendors or properties that have been deleted, and provide guidance to landlords.

## Context
Reference: `features/inprogress/P2-003-rule-based-automation/README.md`

When a landlord deletes a vendor or property, existing rules may reference them. This task ensures rules with stale references are flagged so the landlord can update or delete the rules.

## Implementation

1. Identify Stale References:
   - Rules can reference:
     - Vendors (in assign_vendor action or vendor_available condition)
     - Properties (in property_selector condition)
   - Stale = referenced entity no longer exists in database

2. Detection Logic:
   - Implement function `detectStaleReferences(rules, landlord_id, supabase)`:
     - For each rule:
       - Extract all vendor_ids from conditions and actions
       - Extract all property_ids from conditions
       - Query vendors and properties tables to check existence
       - Return array of stale references with location (condition index, action index, field name)

3. Integration into GET /api/rules:
   - After fetching rules (task 121):
     - Call detectStaleReferences() for all rules
     - Add `stale_references` field to each rule object in response
     - Example:
       ```json
       {
         "id": "rule-123",
         "name": "Auto-approve cheap plumbing",
         "stale_references": [
           {
             "type": "vendor",
             "id": "vendor-456",
             "location": "action[0].params.vendor_id",
             "message": "Assigned vendor no longer exists"
           }
         ]
       }
       ```

4. UI Display:
   - In Rules Manager (task 129):
     - Add warning icon/badge on rules with stale references
     - On hover: show list of stale references
     - Tooltip: "This rule references deleted vendors/properties. Edit to update."
   - In Rule Builder (task 130):
     - Show warning message if rule has stale references
     - Highlight affected fields (red border or warning color)
     - Suggest fixing before save

5. Prevention:
   - When vendor/property deleted:
     - Consider soft-delete first (mark deleted_at, don't hard delete)
     - Or: query rules before allowing hard delete, warn landlord of impact

6. Performance:
   - Stale reference checks should be fast (< 100ms for typical rule set)
   - Cache vendor/property lists in memory if performance issue

7. Testing:
   - Create rule with vendor reference
   - Delete that vendor
   - Fetch rules and verify stale reference detected
   - Update rule to different vendor and save
   - Verify stale reference cleared

## Acceptance Criteria
1. [ ] Verify correct model tier (Sonnet)
2. [ ] detectStaleReferences() function created
3. [ ] Vendor references detected (assign_vendor action, vendor_available condition)
4. [ ] Property references detected (property_selector condition)
5. [ ] Stale vendor references identified (vendor_id not in vendors table)
6. [ ] Stale property references identified (property_id not in properties table)
7. [ ] GET /api/rules includes stale_references field
8. [ ] stale_references array has all detected issues
9. [ ] Each stale reference includes type, id, location, message
10. [ ] Rules Manager shows warning icon on rules with stale references
11. [ ] Warning icon reveals stale reference details on hover
12. [ ] Rule Builder shows warning message if editing rule with stale references
13. [ ] Affected fields highlighted in Rule Builder
14. [ ] Stale references cleared after editing rule and saving
15. [ ] Performance: detection < 100ms for typical rule set
16. [ ] Manual testing: create rule, delete vendor, verify stale reference detected
17. [ ] Manual testing: edit and save rule, verify stale reference cleared

---
id: 230
title: Seed data validation — verify all 20 states + 5 cities have complete rule coverage
tier: Haiku
depends_on: [208]
feature: P3-003-legal-compliance-engine
---

# 230 — Seed Data Validation

## Objective
Validate that the seed data (task 208) provides complete and consistent rule coverage across all 20 states and 5 major cities. Identify and report any gaps in coverage, missing statute citations, or inconsistent data structure.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

The integrity of the compliance engine depends on complete jurisdiction rule data. This task validates the seed data before it's used by landlords.

## Implementation

1. **Create validation script** — `scripts/validate-compliance-seed-data.ts`
   - Runs after seed data migration
   - Checks completeness and consistency

2. **Validation checks**:

   **Check 1: State coverage**
   - Verify all 20 required states are present in jurisdiction_rules
   - States: CA, TX, NY, FL, IL, PA, OH, GA, NC, MI, NJ, VA, WA, AZ, MO, MD, IN, CO, TN, OR
   - Report: List of missing states (if any)

   **Check 2: City coverage**
   - Verify all 5 required cities are present
   - Cities: New York (NY), Los Angeles (CA), San Francisco (CA), Chicago (IL), Portland (OR)
   - Report: List of missing cities

   **Check 3: Topic coverage per jurisdiction**
   - Required topics (minimum):
     - notice_period_entry
     - notice_period_eviction
     - notice_period_rent_increase
     - notice_period_lease_termination
     - security_deposit_limit
     - security_deposit_return_deadline
     - habitability_requirement
     - discrimination_protection
   - For each state: Verify presence of all 8 topics (or configurable minimum)
   - For each city: Verify same topics (can override statewide rules)
   - Report: Missing topics by jurisdiction

   **Check 4: Rule text validation**
   - Verify rule_text is not empty
   - Verify rule_text length > 20 characters (not just junk)
   - Report: Empty or suspiciously short rules

   **Check 5: Statute citation validation**
   - Verify statute_citation is not empty
   - Verify statute_citation matches expected format (e.g., "CA Civil Code § 1234")
   - Report: Missing or malformed citations

   **Check 6: Last verified date validation**
   - Verify last_verified_at is set and reasonable (not in future)
   - Verify date is not older than 1 year (optional, configurable)
   - Report: Old or missing verification dates

   **Check 7: JSONB details validation**
   - Verify details field is valid JSON (if present)
   - Check for required fields in details (varies by topic):
     - notice_period rules: Should have notice_days
     - deposit limit rules: Should have amount_limit
     - Return deadline rules: Should have deadline_days
   - Report: Missing or invalid details fields

   **Check 8: No duplicate rules**
   - Verify no duplicate (state_code, city, topic) combinations
   - Report: Duplicate rows (should not exist)

   **Check 9: City rules override statewide rules**
   - For cities: Verify city-specific rules exist for at least 3 topics
   - Report: Cities with insufficient overrides

   **Check 10: Consistency across similar jurisdictions**
   - For similar rules (e.g., habitability requirements), verify consistency
   - Report: Suspicious inconsistencies (e.g., one state requires 30 days, another 1 day with no explanation)

3. **Validation output format**:
   - Create `scripts/compliance-seed-validation-report.md`
   - Report structure:
     ```
     # Compliance Seed Data Validation Report
     Generated: [date]

     ## Summary
     - States validated: 20/20
     - Cities validated: 5/5
     - Total rules: 80+ (depends on topics)
     - Validation status: PASS / FAIL

     ## Coverage Report
     ### States
     - CA: ✓ 9/9 topics + 3 cities (SF, LA, no city statewide)
     - TX: ✓ 9/9 topics
     - ...
     - [Jurisdiction]: ✗ Missing topics: notice_period_entry, ...

     ### Cities
     - San Francisco (CA): ✓ 5 overrides
     - Los Angeles (CA): ✓ 4 overrides
     - ...

     ## Issues Found
     - [State/City]: [Type]: [Details]

     ## Recommendations
     - [Gap]: Add rules for [topic] in [jurisdiction]
     - [Inconsistency]: [Details]
     ```

4. **Validation modes**:
   - **Strict mode** (default): Fail on any missing data
   - **Lenient mode**: Warn on missing data, allow some gaps
   - Usage: `npm run validate:seed-data -- --mode strict`

5. **Integration into migration process**:
   - Run validation automatically after seed migration
   - If validation fails in strict mode: Migration fails, manual review needed
   - If validation warns: Migration succeeds, but report issues

6. **Implementation approach**:
   - Query jurisdiction_rules table
   - Use JavaScript to perform validation checks
   - Build report markdown
   - Write to file: `scripts/compliance-seed-validation-report-[date].md`
   - Also print summary to console

7. **Example validation code**:
   ```typescript
   // pseudocode
   async function validateComplianceSeedData() {
     const report = new ValidationReport();

     // Check 1: State coverage
     const states = ['CA', 'TX', 'NY', ...];
     const existingStates = await db.query(
       `SELECT DISTINCT state_code FROM jurisdiction_rules`
     );
     states.forEach(state => {
       if (!existingStates.includes(state)) {
         report.addIssue('state_coverage', `Missing state: ${state}`);
       }
     });

     // Check 2: Topic coverage per state
     const requiredTopics = [
       'notice_period_entry',
       'notice_period_eviction',
       ...
     ];
     for (const state of states) {
       const rulesForState = await db.query(
         `SELECT DISTINCT topic FROM jurisdiction_rules WHERE state_code = $1`,
         [state]
       );
       requiredTopics.forEach(topic => {
         if (!rulesForState.map(r => r.topic).includes(topic)) {
           report.addIssue('topic_coverage', `Missing ${topic} in ${state}`);
         }
       });
     }

     // ... more checks ...

     return report;
   }
   ```

8. **Running the validation**:
   - Command: `npm run validate:seed-data`
   - Or after migration: `npm run migrate:seed && npm run validate:seed-data`
   - Output: Summary to console + detailed report file

9. **Update documentation**:
   - Add section to `CLAUDE.md` or feature README on seed data validation
   - Document what "complete coverage" means
   - Document how to fix validation failures

## Acceptance Criteria
1. [ ] Validation script created at scripts/validate-compliance-seed-data.ts
2. [ ] Check 1: All 20 states present
3. [ ] Check 2: All 5 cities present
4. [ ] Check 3: All required topics present per jurisdiction
5. [ ] Check 4: rule_text validated (not empty, >20 chars)
6. [ ] Check 5: statute_citation validated (present, proper format)
7. [ ] Check 6: last_verified_at validated
8. [ ] Check 7: JSONB details validated (valid JSON, required fields)
9. [ ] Check 8: No duplicate rules detected
10. [ ] Check 9: City rules have sufficient overrides
11. [ ] Check 10: Consistency checks across similar jurisdictions
12. [ ] Report generated in markdown format
13. [ ] Validation runs automatically after migration (or on demand)
14. [ ] Strict and lenient modes work
15. [ ] Summary output to console + detailed report to file
16. [ ] Documentation updated

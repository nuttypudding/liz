---
id: 208
title: Seed jurisdiction rules — 20 states + 5 major cities initial dataset
tier: Haiku
depends_on: [207]
feature: P3-003-legal-compliance-engine
---

# 208 — Seed Jurisdiction Rules Dataset

## Objective
Populate the `jurisdiction_rules` table with initial seed data covering 20 most common U.S. states plus 5 major cities (NYC, Los Angeles, San Francisco, Chicago, Portland). Cover critical landlord-tenant topics: notice periods, security deposit limits, habitability requirements, and discrimination protections.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

This seed data provides the foundation for jurisdiction-aware compliance checking. Rules must be accurate and include statutory citations for landlord reference.

## Implementation

1. **States to seed** (20): CA, TX, NY, FL, IL, PA, OH, GA, NC, MI, NJ, VA, WA, AZ, MO, MD, IN, CO, TN, OR

2. **Major cities** (5): New York (NY), Los Angeles (CA), San Francisco (CA), Chicago (IL), Portland (OR)

3. **Topics to cover** (minimum 4 per jurisdiction):
   - `notice_period_entry` — How many days notice required for entry
   - `notice_period_eviction` — How many days notice before eviction proceedings
   - `notice_period_rent_increase` — How many days notice before rent increase takes effect
   - `notice_period_lease_termination` — How many days notice to terminate lease
   - `security_deposit_limit` — Maximum security deposit as multiple of rent
   - `security_deposit_return_deadline` — Days to return deposit after move-out
   - `habitability_requirement` — Landlord duty to maintain habitable premises
   - `discrimination_protection` — Protected classes under state/local law
   - `rent_control_policy` — Whether jurisdiction has rent control/stabilization

4. **Data structure**: For each jurisdiction+topic combination, create a row with:
   - Accurate rule text (from official sources)
   - Statute citation (e.g., "CA Civil Code § 1950.7")
   - Verified date (today's date)
   - JSONB details with structured data:
     - `notice_days`: (number) days required
     - `amount_limit`: (string) e.g., "2 months rent"
     - `deadline_days`: (number) days to complete action
     - `exemptions`: (array) categories exempt from rule
     - `special_notes`: (string) jurisdiction-specific considerations

5. **Seed creation method**:
   - Create `supabase/migrations/TIMESTAMP_seed_jurisdiction_rules.sql`
   - Use INSERT statements with proper quote escaping
   - Organize by state, then by city overrides
   - Verify no duplicates (state_code, city, topic) tuples

## Acceptance Criteria
1. [ ] All 20 states seeded with at least 4 topics each (≥80 rows minimum)
2. [ ] All 5 major cities seeded with city-specific overrides where applicable
3. [ ] All statute citations verified and accurate
4. [ ] JSONB details field consistently structured across all rules
5. [ ] Seed data validates (no null required fields, valid enum values)
6. [ ] Migration applies without errors
7. [ ] Spot-check 3 random rules for accuracy

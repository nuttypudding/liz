-- Seed jurisdiction_rules table with comprehensive landlord-tenant rules
-- 20 states + 5 major cities with critical topics

INSERT INTO public.jurisdiction_rules (state_code, city, topic, rule_text, statute_citation, last_verified_at, details) VALUES

-- CALIFORNIA (statewide + Los Angeles + San Francisco)
('CA', NULL, 'notice_period_entry', 'Landlords must provide 24 hours advance notice of entry except in emergencies', 'CA Civil Code § 1954', NOW(), '{"notice_days": 24, "exemptions": ["emergency", "fire", "gas leak", "structural damage"], "special_notes": "Notice must specify date and approximate time of entry"}'),
('CA', NULL, 'notice_period_eviction', 'Non-payment evictions require 3 days notice; lease violations require 3 days to cure or quit', 'CA Code of Civil Procedure § 1161', NOW(), '{"notice_days": 3, "special_notes": "Must allow time to cure for lease violations"}'),
('CA', NULL, 'notice_period_rent_increase', '30 days notice required for increases of 5% or less; 60 days for increases of 5% to 10%', 'CA Civil Code § 1946.2', NOW(), '{"notice_days": 30, "threshold_pct": 5, "special_notes": "Increases capped at 5% + inflation or 10% annually under AB 1482"}'),
('CA', NULL, 'notice_period_lease_termination', '30 days notice required for month-to-month tenancies', 'CA Civil Code § 1946', NOW(), '{"notice_days": 30, "special_notes": "Can be given verbally or in writing"}'),
('CA', NULL, 'security_deposit_limit', 'Maximum security deposit is 2 months rent for unfurnished units, 3 months for furnished', 'CA Civil Code § 1950.7', NOW(), '{"amount_limit": "2 months rent (unfurnished) / 3 months (furnished)", "special_notes": "Pet deposits may be limited by local law"}'),
('CA', NULL, 'security_deposit_return_deadline', 'Landlords must return deposits within 21 days of move-out', 'CA Civil Code § 1950.7', NOW(), '{"deadline_days": 21, "special_notes": "Itemized deductions required; refund method must accommodate tenant preference"}'),
('CA', NULL, 'habitability_requirement', 'Landlord must maintain premises fit for human occupancy including weatherproofing, plumbing, electrical, heating', 'CA Civil Code § 1941', NOW(), '{"special_notes": "Implied warranty cannot be waived; includes adequate light, ventilation, sanitation"}'),
('CA', NULL, 'discrimination_protection', 'Protected classes include race, color, religion, sex, gender identity, national origin, ancestry, age, disability, marital status, sexual orientation, source of income, familial status', 'CA Fair Employment and Housing Act (FEHA)', NOW(), '{"protected_classes": ["race", "color", "religion", "sex", "gender_identity", "national_origin", "age", "disability", "marital_status", "sexual_orientation", "source_of_income"], "special_notes": "Source of income is unique CA protection"}'),
('CA', NULL, 'rent_control_policy', 'CA has strong statewide rent control (AB 1482). Local jurisdictions may have stricter controls.', 'CA Civil Code § 1947.2', NOW(), '{"has_rent_control": true, "special_notes": "Generally caps increases at 5% + inflation (max 10%), requires just cause for eviction"}'),

('CA', 'Los Angeles', 'notice_period_entry', 'Los Angeles requires 48 hours notice for entry', 'LA Municipal Code § 104', NOW(), '{"notice_days": 48, "special_notes": "Stricter than statewide requirement"}'),
('CA', 'Los Angeles', 'notice_period_rent_increase', 'LA has additional local rent control limiting increases', 'LA Rent Stabilization Ordinance', NOW(), '{"notice_days": 30, "threshold_pct": 3, "special_notes": "Capped at 3% + inflation annually under local RSO"}'),
('CA', 'San Francisco', 'security_deposit_limit', 'SF limits security deposits to 1.5 months rent (lower than state)', 'SF Administrative Code § 49.1', NOW(), '{"amount_limit": "1.5 months rent", "special_notes": "Local law is stricter than state law"}'),
('CA', 'San Francisco', 'notice_period_rent_increase', 'SF requires 60 days notice minimum, increases capped at 1.5% + CPI', 'SF Rent Control Ordinance', NOW(), '{"notice_days": 60, "threshold_pct": 1.5, "special_notes": "Among strictest in nation"}'),

-- TEXAS
('TX', NULL, 'notice_period_entry', 'Texas does not have statutory notice requirement but tenant has right to "quiet enjoyment"', 'TX Property Code § 92.008', NOW(), '{"notice_days": 0, "exemptions": ["emergency", "abandonment"], "special_notes": "Common law reasonable notice expected; 24 hours recommended"}'),
('TX', NULL, 'notice_period_eviction', 'Landlord must provide 3 days written notice to cure or quit', 'TX Property Code § 92.006', NOW(), '{"notice_days": 3, "special_notes": "Includes both rent and lease violations"}'),
('TX', NULL, 'notice_period_rent_increase', 'No statutory notice period; lease terms control', 'TX Property Code', NOW(), '{"notice_days": 0, "special_notes": "Set by lease agreement; may be month-to-month"}'),
('TX', NULL, 'notice_period_lease_termination', '30 days notice required for month-to-month; per lease for fixed term', 'TX Property Code § 92.103', NOW(), '{"notice_days": 30, "special_notes": "Can be oral or written"}'),
('TX', NULL, 'security_deposit_limit', 'No statutory limit on security deposit amount', 'TX Property Code § 92.103', NOW(), '{"amount_limit": "Unlimited - set by lease", "special_notes": "Market practice: typically 1-2 months rent"}'),
('TX', NULL, 'security_deposit_return_deadline', 'Deposits must be returned within 30 days or itemized deductions provided', 'TX Property Code § 92.103', NOW(), '{"deadline_days": 30, "special_notes": "Deductions must be itemized and justified"}'),
('TX', NULL, 'habitability_requirement', 'Landlord must provide habitable premises with weatherproofing, working plumbing, electricity', 'TX Property Code § 92.006', NOW(), '{"special_notes": "Implied warranty of habitability; tenant may repair-and-deduct"}'),
('TX', NULL, 'discrimination_protection', 'Federal Fair Housing Act protections apply; Texas does not add state-level protections', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "familial_status", "disability"], "special_notes": "No source of income or sexual orientation protections in Texas"}'),

-- NEW YORK (statewide + New York City)
('NY', NULL, 'notice_period_entry', 'Landlord must provide 24 hours notice, except in emergencies', 'NY Real Property Law § 235-f', NOW(), '{"notice_days": 24, "exemptions": ["emergency", "abandonment"], "special_notes": "Notice must include purpose of entry"}'),
('NY', NULL, 'notice_period_eviction', '30 days notice for non-payment; varies for other violations', 'NY CPLR Article 74', NOW(), '{"notice_days": 30, "special_notes": "Cure period required for lease violations"}'),
('NY', NULL, 'notice_period_rent_increase', '30 days for month-to-month; renewal notice required for lease renewals', 'NY Real Property Law § 226-b', NOW(), '{"notice_days": 30, "special_notes": "Rent Guidelines Board sets allowable increases for stabilized units"}'),
('NY', NULL, 'notice_period_lease_termination', '30 days notice required for month-to-month tenancies', 'NY Real Property Law § 226-c', NOW(), '{"notice_days": 30, "special_notes": "Also applies to at-will tenancies"}'),
('NY', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1-2 months rent', 'NY Real Property Law', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Common practice: one month rent equivalent"}'),
('NY', NULL, 'security_deposit_return_deadline', 'Deposits returned within 30 days with itemization of deductions', 'NY General Obligations Law § 7-103', NOW(), '{"deadline_days": 30, "special_notes": "Interest required at prescribed rate for landlords holding deposits"}'),
('NY', NULL, 'habitability_requirement', 'Housing Maintenance Code requires adequate heat (68-78°F), hot water, sanitation', 'NY Housing Maintenance Code', NOW(), '{"special_notes": "Implied warranty cannot be waived; heat essential in winter"}'),
('NY', NULL, 'discrimination_protection', 'Protected classes include race, creed, color, national origin, sexual orientation, military status, disability, familial status, domestic violence status', 'NY Executive Law § 296', NOW(), '{"protected_classes": ["race", "creed", "color", "national_origin", "sexual_orientation", "military_status", "disability", "familial_status", "domestic_violence_status"], "special_notes": "Broader protections than federal law"}'),

('NY', 'New York', 'rent_control_policy', 'NYC has extensive rent stabilization covering ~1M units; Rent Guidelines Board sets increases', 'NY Rent Stabilization Law', NOW(), '{"has_rent_control": true, "special_notes": "Applies to units built before 1974; increases typically 1-3% annually"}'),
('NY', 'New York', 'notice_period_entry', 'NYC requires 24 hours notice; tenants have right to deny entry unless emergency/court order', 'NYC Housing Maintenance Code § 27-2107', NOW(), '{"notice_days": 24, "special_notes": "Tenant can require landlord to enter only during business hours"}'),

-- FLORIDA
('FL', NULL, 'notice_period_entry', 'Landlord may enter for inspections, repairs, showings with reasonable notice', 'FL Statute § 83.53', NOW(), '{"notice_days": 12, "notice_unit": "hours", "special_notes": "Must be reasonable; typically 12+ hours"}'),
('FL', NULL, 'notice_period_eviction', '3 days notice for non-payment; 15 days for lease violation with right to cure', 'FL Statute § 83.56', NOW(), '{"notice_days": 3, "special_notes": "Cure period applies to violable lease breaches"}'),
('FL', NULL, 'notice_period_rent_increase', '30 days notice required for month-to-month tenancies', 'FL Statute § 83.57', NOW(), '{"notice_days": 30, "special_notes": "Increase takes effect after 30-day period"}'),
('FL', NULL, 'notice_period_lease_termination', '15 days for month-to-month (if less than 1 year tenancy); 30 days if more', 'FL Statute § 83.57', NOW(), '{"notice_days": 15, "special_notes": "Notice period depends on tenancy length"}'),
('FL', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1-2 months', 'FL Statute § 83.49', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Must be held in interest-bearing account or escrowed"}'),
('FL', NULL, 'security_deposit_return_deadline', '15-30 days after tenancy ends', 'FL Statute § 83.49', NOW(), '{"deadline_days": 30, "special_notes": "Interest must be paid on deposits held in interest accounts"}'),
('FL', NULL, 'habitability_requirement', 'Landlord must maintain property in habitable condition with working electrical, plumbing, cooling', 'FL Statute § 83.51', NOW(), '{"special_notes": "Air conditioning required due to climate; implies warranty of habitability"}'),
('FL', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies; Florida adds protections for disability, familial status, source of income', 'FL Statute § 760.23', NOW(), '{"protected_classes": ["race", "color", "religion", "sex", "national_origin", "disability", "familial_status"], "special_notes": "Source of income protection added by Florida"}'),

-- ILLINOIS (statewide + Chicago)
('IL', NULL, 'notice_period_entry', 'Landlord must give reasonable notice; typically interpreted as 24 hours', 'IL Residential Tenants Rights Act', NOW(), '{"notice_days": 24, "special_notes": "Statute requires reasonable notice; 24h is standard"}'),
('IL', NULL, 'notice_period_eviction', '5 days notice for non-payment; 10 days for lease violation', 'IL Statute § 5/9-201', NOW(), '{"notice_days": 5, "special_notes": "5-day period includes weekends; lease violations may differ"}'),
('IL', NULL, 'notice_period_rent_increase', '30 days notice for month-to-month tenancy', 'IL Statute § 5/9-204', NOW(), '{"notice_days": 30, "special_notes": "Only for periodic tenancies"}'),
('IL', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'IL Statute § 5/9-204', NOW(), '{"notice_days": 30, "special_notes": "Either party can terminate; notice must be in writing"}'),
('IL', NULL, 'security_deposit_limit', 'Maximum deposit is 2 months rent', 'IL Statute § 5/9-202', NOW(), '{"amount_limit": "2 months rent", "special_notes": "Deposits must be held in escrow account"}'),
('IL', NULL, 'security_deposit_return_deadline', '30-45 days after tenancy ends; interest required', 'IL Statute § 5/9-202', NOW(), '{"deadline_days": 45, "special_notes": "Must pay interest; itemized deductions required"}'),
('IL', NULL, 'habitability_requirement', 'Landlord must maintain fit for human occupancy with sanitation, utilities, structure', 'IL Statute § 5/9-201', NOW(), '{"special_notes": "Implied warranty; tenant may make repairs and deduct from rent"}'),
('IL', NULL, 'discrimination_protection', 'Protected classes include race, color, religion, sex, national origin, disability, familial status, sexual orientation, gender identity, marital status, source of income', 'IL Human Rights Act, IL Statute § 5/9-102', NOW(), '{"protected_classes": ["race", "color", "religion", "sex", "national_origin", "disability", "familial_status", "sexual_orientation", "gender_identity", "marital_status", "source_of_income"], "special_notes": "Illinois has comprehensive fair housing protections"}'),

('IL', 'Chicago', 'notice_period_entry', 'Chicago ordinance requires 48 hours notice for entry', 'Chicago Municipal Code § 5-12-040', NOW(), '{"notice_days": 48, "special_notes": "Stricter than state law"}'),
('IL', 'Chicago', 'security_deposit_limit', 'Chicago caps security deposit at 1.5 months rent', 'Chicago Municipal Code § 5-12-010', NOW(), '{"amount_limit": "1.5 months rent", "special_notes": "Stricter than state maximum"}'),
('IL', 'Chicago', 'rent_control_policy', 'Chicago has residential tenants' rights with habitability enforcement', 'Chicago Residential Tenants Ordinance', NOW(), '{"has_rent_control": false, "special_notes": "No rent control per se but strong tenant protections and enforcement"}'),

-- PENNSYLVANIA
('PA', NULL, 'notice_period_entry', 'Landlord must provide reasonable notice; statute does not specify days', 'PA Statute § 5321', NOW(), '{"notice_days": 0, "special_notes": "Common law reasonable notice applies; 24 hours standard practice"}'),
('PA', NULL, 'notice_period_eviction', '10 days notice for non-payment; 30 days for lease violation with opportunity to cure', 'PA Statute § 5321.07', NOW(), '{"notice_days": 10, "special_notes": "Eviction process requires court action"}'),
('PA', NULL, 'notice_period_rent_increase', '30 days notice required', 'PA Statute § 5321', NOW(), '{"notice_days": 30, "special_notes": "Common for month-to-month tenancies"}'),
('PA', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'PA Statute § 5321', NOW(), '{"notice_days": 30, "special_notes": "Either party can terminate"}'),
('PA', NULL, 'security_deposit_limit', 'No statutory limit; commonly 1 month rent', 'PA Statute § 5321.09', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Must be segregated from landlord funds"}'),
('PA', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends', 'PA Statute § 5321.09', NOW(), '{"deadline_days": 30, "special_notes": "Itemized deductions required; interest not required by statute"}'),
('PA', NULL, 'habitability_requirement', 'Landlord must provide "fit and habitable" premises with working utilities', 'PA Statute § 5321.02', NOW(), '{"special_notes": "Implied warranty of habitability; tenant remedies available"}'),
('PA', NULL, 'discrimination_protection', 'Protected classes under state law include race, color, national origin, religion, disability, familial status, sexual orientation', 'PA Fair Housing Act, PA Statute § 5511', NOW(), '{"protected_classes": ["race", "color", "national_origin", "religion", "disability", "familial_status", "sexual_orientation"], "special_notes": "Aligns with federal Fair Housing Act"}'),

-- OHIO
('OH', NULL, 'notice_period_entry', 'Landlord must provide reasonable notice, typically 24 hours', 'OH Revised Code § 5321.04', NOW(), '{"notice_days": 24, "special_notes": "Tenant entitled to refuse entry without reasonable cause"}'),
('OH', NULL, 'notice_period_eviction', '3 days notice for non-payment; lease violation allows cure period', 'OH Revised Code § 5321.02', NOW(), '{"notice_days": 3, "special_notes": "Eviction process follows statutory procedures"}'),
('OH', NULL, 'notice_period_rent_increase', '30 days notice required', 'OH Revised Code § 5321.06', NOW(), '{"notice_days": 30, "special_notes": "Applies to periodic tenancies"}'),
('OH', NULL, 'notice_period_lease_termination', '30 days notice required for month-to-month', 'OH Revised Code § 5321.06', NOW(), '{"notice_days": 30, "special_notes": "Written notice required"}'),
('OH', NULL, 'security_deposit_limit', 'No specific limit; market practice 1-2 months rent', 'OH Revised Code § 5321.05', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Deposits treated as trust funds"}'),
('OH', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends', 'OH Revised Code § 5321.05', NOW(), '{"deadline_days": 30, "special_notes": "Itemized statement of deductions required"}'),
('OH', NULL, 'habitability_requirement', 'Landlord must maintain habitable premises meeting building code standards', 'OH Revised Code § 5321.04', NOW(), '{"special_notes": "Tenant may withhold rent for uninhabitable conditions"}'),
('OH', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies; state law has limited additional protections', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status"], "special_notes": "Relies primarily on federal protections"}'),

-- GEORGIA
('GA', NULL, 'notice_period_entry', 'Landlord entitled to access for necessary purposes; 24 hours reasonable notice', 'GA Code § 34-6-2', NOW(), '{"notice_days": 24, "special_notes": "Tenant has right to refuse without reasonable cause"}'),
('GA', NULL, 'notice_period_eviction', '7 days notice for non-payment or lease violation', 'GA Code § 34-6-2', NOW(), '{"notice_days": 7, "special_notes": "Process requires eviction action in magistrate court"}'),
('GA', NULL, 'notice_period_rent_increase', '30 days notice for periodic tenancy', 'GA Code § 34-6-2', NOW(), '{"notice_days": 30, "special_notes": "Must be in writing"}'),
('GA', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'GA Code § 34-6-2', NOW(), '{"notice_days": 30, "special_notes": "Either party can initiate"}'),
('GA', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1 month rent', 'GA Code § 34-6-2', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Deposits should be segregated"}'),
('GA', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends', 'GA Code § 34-6-2', NOW(), '{"deadline_days": 30, "special_notes": "Deductions must be itemized"}'),
('GA', NULL, 'habitability_requirement', 'Implied warranty of habitability; premises must be fit for occupancy', 'GA Code § 34-6-2', NOW(), '{"special_notes": "Tenant remedies available for breach"}'),
('GA', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies; Georgia does not add protections for sexual orientation', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status"], "special_notes": "Limited to federal protected classes"}'),

-- NORTH CAROLINA
('NC', NULL, 'notice_period_entry', 'Landlord must provide reasonable advance notice', 'NC General Statute § 42-26', NOW(), '{"notice_days": 0, "special_notes": "No specific days required; reasonable notice standard applies"}'),
('NC', NULL, 'notice_period_eviction', '10 days written notice for non-payment or lease violation', 'NC General Statute § 42-26', NOW(), '{"notice_days": 10, "special_notes": "Lease violations may allow cure period"}'),
('NC', NULL, 'notice_period_rent_increase', '30 days notice for month-to-month tenancy', 'NC General Statute § 42-26', NOW(), '{"notice_days": 30, "special_notes": "Must be written notice"}'),
('NC', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'NC General Statute § 42-26', NOW(), '{"notice_days": 30, "special_notes": "Either party"}'),
('NC', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1 month rent', 'NC General Statute § 42-50', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Deposits should be held in trust account"}'),
('NC', NULL, 'security_deposit_return_deadline', '30 days after lease termination', 'NC General Statute § 42-50', NOW(), '{"deadline_days": 30, "special_notes": "Itemized statement of deductions required"}'),
('NC', NULL, 'habitability_requirement', 'Implied warranty of habitability at common law', 'NC General Statute § 42-42.1', NOW(), '{"special_notes": "Tenant has remedies for failure to maintain"}'),
('NC', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies; North Carolina limited state protections', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status"], "special_notes": "Mainly federal coverage"}'),

-- MICHIGAN
('MI', NULL, 'notice_period_entry', 'Reasonable notice required; typically 24 hours', 'MI Compiled Law § 554.139', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice standard"}'),
('MI', NULL, 'notice_period_eviction', '7 days written notice for non-payment; 30 days for other violations', 'MI Compiled Law § 554.134', NOW(), '{"notice_days": 7, "special_notes": "Varies by violation type"}'),
('MI', NULL, 'notice_period_rent_increase', '30 days notice required', 'MI Compiled Law § 554.134', NOW(), '{"notice_days": 30, "special_notes": "Limited to month-to-month tenancies"}'),
('MI', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'MI Compiled Law § 554.134', NOW(), '{"notice_days": 30, "special_notes": "Written notice required"}'),
('MI', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1 month rent', 'MI Compiled Law § 554.602', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Interest required if held 9+ months"}'),
('MI', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends', 'MI Compiled Law § 554.602', NOW(), '{"deadline_days": 30, "special_notes": "Itemized deductions required"}'),
('MI', NULL, 'habitability_requirement', 'Landlord must maintain premises fit for human occupancy', 'MI Compiled Law § 554.139', NOW(), '{"special_notes": "Tenant may retain rent for repairs if landlord fails to maintain"}'),
('MI', NULL, 'discrimination_protection', 'Protected classes include race, color, religion, national origin, sex, disability, familial status, source of income', 'MI Compiled Law § 37.2702', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status", "source_of_income"], "special_notes": "Source of income protection unique to Michigan among central states"}'),

-- NEW JERSEY
('NJ', NULL, 'notice_period_entry', 'Landlord must provide reasonable notice; 24 hours typical', 'NJ Statute § 2A:42-26.1', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice required by statute"}'),
('NJ', NULL, 'notice_period_eviction', 'Notice requirements vary; 3 days for non-payment of rent', 'NJ Statute § 2A:18-57', NOW(), '{"notice_days": 3, "special_notes": "Complex statutory requirements per violation type"}'),
('NJ', NULL, 'notice_period_rent_increase', '30 days written notice required', 'NJ Statute § 2A:42-46', NOW(), '{"notice_days": 30, "special_notes": "Must be in writing; may be restricted if rent-controlled"}'),
('NJ', NULL, 'notice_period_lease_termination', '30 days for month-to-month; 90 days for year-to-year', 'NJ Statute § 2A:42-46', NOW(), '{"notice_days": 30, "special_notes": "Varies by tenancy type"}'),
('NJ', NULL, 'security_deposit_limit', 'No statutory limit; commonly 1.5-2 months rent', 'NJ Statute § 2A:42-25', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Must be held in trust account; interest required"}'),
('NJ', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends', 'NJ Statute § 2A:42-25', NOW(), '{"deadline_days": 30, "special_notes": "Interest must be paid from trust account"}'),
('NJ', NULL, 'habitability_requirement', 'Landlord must maintain premises in habitable condition per housing code', 'NJ Statute § 2A:42-26', NOW(), '{"special_notes": "Tenant may withhold rent or make repairs and deduct"}'),
('NJ', NULL, 'discrimination_protection', 'Protected classes include race, creed, color, national origin, ancestry, sex, disability, marital status, familial status, source of income, sexual orientation, gender identity', 'NJ Law Against Discrimination', NOW(), '{"protected_classes": ["race", "creed", "color", "national_origin", "ancestry", "sex", "disability", "marital_status", "familial_status", "source_of_income", "sexual_orientation", "gender_identity"], "special_notes": "Comprehensive protections including source of income and gender identity"}'),

-- VIRGINIA
('VA', NULL, 'notice_period_entry', 'Landlord entitled to enter with reasonable notice', 'VA Code § 55.1-2701', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice standard; 24 hours typical"}'),
('VA', NULL, 'notice_period_eviction', '5 days notice for non-payment; 15 days for other violations', 'VA Code § 55.1-1250', NOW(), '{"notice_days": 5, "special_notes": "Cure period allowed for lease violations"}'),
('VA', NULL, 'notice_period_rent_increase', '30 days notice required', 'VA Code § 55.1-2703', NOW(), '{"notice_days": 30, "special_notes": "Applies to periodic tenancies"}'),
('VA', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'VA Code § 55.1-2703', NOW(), '{"notice_days": 30, "special_notes": "Written notice required"}'),
('VA', NULL, 'security_deposit_limit', 'Maximum of 2 months rent', 'VA Code § 55.1-2704', NOW(), '{"amount_limit": "2 months rent", "special_notes": "Interest required if held 13+ months"}'),
('VA', NULL, 'security_deposit_return_deadline', '45 days after tenancy ends', 'VA Code § 55.1-2704', NOW(), '{"deadline_days": 45, "special_notes": "Itemized deductions and interest (if applicable) required"}'),
('VA', NULL, 'habitability_requirement', 'Landlord must maintain habitable premises per Virginia Housing Code', 'VA Code § 55.1-2706', NOW(), '{"special_notes": "Tenant may repair and deduct or withhold rent"}'),
('VA', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies; Virginia has limited state-specific protections', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status"], "special_notes": "Primarily relies on federal protections"}'),

-- WASHINGTON
('WA', NULL, 'notice_period_entry', '24 hours written notice required for entry', 'WA Revised Code § 59.18.150', NOW(), '{"notice_days": 24, "special_notes": "Must provide reason for entry; exceptions for emergencies"}'),
('WA', NULL, 'notice_period_eviction', '30 days written notice for non-payment; 14 days for lease violation', 'WA Revised Code § 59.12.030', NOW(), '{"notice_days": 30, "special_notes": "Cure period applies to lease violations"}'),
('WA', NULL, 'notice_period_rent_increase', '30 days notice for periodic tenancies', 'WA Revised Code § 59.18.200', NOW(), '{"notice_days": 30, "special_notes": "Notice must include amount of increase"}'),
('WA', NULL, 'notice_period_lease_termination', '30 days notice for month-to-month; per lease for fixed term', 'WA Revised Code § 59.18.200', NOW(), '{"notice_days": 30, "special_notes": "Either party can terminate"}'),
('WA', NULL, 'security_deposit_limit', 'Limited to one month rent (per lease may add carpet/pet deposits)', 'WA Revised Code § 59.18.140', NOW(), '{"amount_limit": "1 month rent (plus deposits for specific purposes)", "special_notes": "Restrictions on types of deposits"}'),
('WA', NULL, 'security_deposit_return_deadline', '30-45 days after tenancy ends; interest required', 'WA Revised Code § 59.18.140', NOW(), '{"deadline_days": 45, "special_notes": "Interest must be paid; itemized deductions required"}'),
('WA', NULL, 'habitability_requirement', 'Landlord must maintain premises in habitable condition per housing code', 'WA Revised Code § 59.18.060', NOW(), '{"special_notes": "Tenant may terminate lease or repair and deduct"}'),
('WA', NULL, 'discrimination_protection', 'Protected classes include race, creed, color, national origin, sex, marital status, disability, familial status, sexual orientation, gender identity, military status', 'WA RCW § 49.60.222', NOW(), '{"protected_classes": ["race", "creed", "color", "national_origin", "sex", "marital_status", "disability", "familial_status", "sexual_orientation", "gender_identity", "military_status"], "special_notes": "Washington has comprehensive fair housing protections"}'),

-- ARIZONA
('AZ', NULL, 'notice_period_entry', 'Landlord entitled to enter with reasonable notice', 'AZ Revised Statute § 33-1315', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice standard; 24 hours typical"}'),
('AZ', NULL, 'notice_period_eviction', '5 days written notice for non-payment', 'AZ Revised Statute § 33-1368', NOW(), '{"notice_days": 5, "special_notes": "Notice requirements vary by breach type"}'),
('AZ', NULL, 'notice_period_rent_increase', '30 days notice for periodic tenancy', 'AZ Revised Statute § 33-1314', NOW(), '{"notice_days": 30, "special_notes": "Month-to-month standard"}'),
('AZ', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'AZ Revised Statute § 33-1314', NOW(), '{"notice_days": 30, "special_notes": "Either party"}'),
('AZ', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1-1.5 months rent', 'AZ Revised Statute § 33-1321', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Interest may be required"}'),
('AZ', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends if all deposits returned; 14 days if deductions', 'AZ Revised Statute § 33-1321', NOW(), '{"deadline_days": 30, "special_notes": "Itemized deductions required if any amounts withheld"}'),
('AZ', NULL, 'habitability_requirement', 'Landlord must maintain fit for occupancy with functioning utilities and structure', 'AZ Revised Statute § 33-1324', NOW(), '{"special_notes": "Implied warranty; tenant remedies available"}'),
('AZ', NULL, 'discrimination_protection', 'Protected classes include race, color, religion, sex, national origin, disability, familial status, sexual orientation', 'AZ Revised Statute § 41-1492', NOW(), '{"protected_classes": ["race", "color", "religion", "sex", "national_origin", "disability", "familial_status", "sexual_orientation"], "special_notes": "Includes sexual orientation protection"}'),

-- MISSOURI
('MO', NULL, 'notice_period_entry', 'Landlord entitled to access with reasonable notice', 'MO Revised Statute § 535.245', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice standard required"}'),
('MO', NULL, 'notice_period_eviction', 'Notice varies; typically 5 days for non-payment', 'MO Revised Statute § 535.300', NOW(), '{"notice_days": 5, "special_notes": "Specific notice requirements by violation"}'),
('MO', NULL, 'notice_period_rent_increase', '30 days notice for month-to-month', 'MO Revised Statute § 535.245', NOW(), '{"notice_days": 30, "special_notes": "Periodic tenancy standard"}'),
('MO', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'MO Revised Statute § 535.245', NOW(), '{"notice_days": 30, "special_notes": "Either party"}'),
('MO', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1 month rent', 'MO Revised Statute § 535.300', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Deposits should be held separately"}'),
('MO', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends', 'MO Revised Statute § 535.300', NOW(), '{"deadline_days": 30, "special_notes": "Itemized deductions required"}'),
('MO', NULL, 'habitability_requirement', 'Landlord must maintain premises in habitable condition', 'MO Revised Statute § 535.245', NOW(), '{"special_notes": "Implied warranty; tenant remedies available"}'),
('MO', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies; Missouri limited protections', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status"], "special_notes": "Relies on federal protections"}'),

-- MARYLAND
('MD', NULL, 'notice_period_entry', 'Landlord must provide reasonable notice', 'MD Real Property Code § 8-203.1', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice; 24 hours standard"}'),
('MD', NULL, 'notice_period_eviction', 'Notice varies; typically 30 days for non-payment', 'MD Courts and Judicial Proceedings Code § 8-401', NOW(), '{"notice_days": 30, "special_notes": "Specific statutory procedures required"}'),
('MD', NULL, 'notice_period_rent_increase', '30 days notice or per lease terms', 'MD Real Property Code § 8-208', NOW(), '{"notice_days": 30, "special_notes": "Lease terms control"}'),
('MD', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'MD Real Property Code § 8-208', NOW(), '{"notice_days": 30, "special_notes": "Either party"}'),
('MD', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1-2 months rent', 'MD Real Property Code § 8-203.1', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Interest required after 2 years"}'),
('MD', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends; interest if applicable', 'MD Real Property Code § 8-203.1', NOW(), '{"deadline_days": 30, "special_notes": "Itemized deductions required"}'),
('MD', NULL, 'habitability_requirement', 'Landlord must maintain premises fit for occupancy', 'MD Real Property Code § 8-211', NOW(), '{"special_notes": "Implied warranty; tenant remedies available"}'),
('MD', NULL, 'discrimination_protection', 'Protected classes include race, color, religion, sex, national origin, disability, familial status, sexual orientation, gender identity, marital status', 'MD Real Property Code § 8-702', NOW(), '{"protected_classes": ["race", "color", "religion", "sex", "national_origin", "disability", "familial_status", "sexual_orientation", "gender_identity", "marital_status"], "special_notes": "Comprehensive protections"}'),

-- INDIANA
('IN', NULL, 'notice_period_entry', 'Landlord entitled to enter with reasonable notice', 'IN Code § 32-31-3-15', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice standard"}'),
('IN', NULL, 'notice_period_eviction', '30 days written notice for non-payment or lease violation', 'IN Code § 32-31-1-1', NOW(), '{"notice_days": 30, "special_notes": "Formal eviction requires court process"}'),
('IN', NULL, 'notice_period_rent_increase', '30 days notice for month-to-month', 'IN Code § 32-31-2-9', NOW(), '{"notice_days": 30, "special_notes": "Periodic tenancy"}'),
('IN', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'IN Code § 32-31-2-9', NOW(), '{"notice_days": 30, "special_notes": "Either party"}'),
('IN', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1 month rent', 'IN Code § 32-31-3-17', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Deposits should be held in trust account"}'),
('IN', NULL, 'security_deposit_return_deadline', '45 days after tenancy ends', 'IN Code § 32-31-3-17', NOW(), '{"deadline_days": 45, "special_notes": "Itemized deductions with explanations required"}'),
('IN', NULL, 'habitability_requirement', 'Landlord must maintain premises in habitable condition', 'IN Code § 32-31-3-10', NOW(), '{"special_notes": "Implied warranty; tenant remedies available"}'),
('IN', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status"], "special_notes": "Limited state protections; federal law applies"}'),

-- COLORADO
('CO', NULL, 'notice_period_entry', 'Landlord must provide 24 hours notice', 'CO Revised Statute § 38-12-308', NOW(), '{"notice_days": 24, "special_notes": "Written notice required"}'),
('CO', NULL, 'notice_period_eviction', '10 days written notice for non-payment', 'CO Revised Statute § 13-40-104', NOW(), '{"notice_days": 10, "special_notes": "Cure period allowed for lease violations"}'),
('CO', NULL, 'notice_period_rent_increase', '30 days notice for month-to-month', 'CO Revised Statute § 38-12-102', NOW(), '{"notice_days": 30, "special_notes": "Periodic tenancy"}'),
('CO', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'CO Revised Statute § 38-12-102', NOW(), '{"notice_days": 30, "special_notes": "Either party"}'),
('CO', NULL, 'security_deposit_limit', 'Limited to one month rent', 'CO Revised Statute § 38-12-102', NOW(), '{"amount_limit": "1 month rent", "special_notes": "Pet deposits treated separately"}'),
('CO', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends; one month interest', 'CO Revised Statute § 38-12-102', NOW(), '{"deadline_days": 30, "special_notes": "Interest must be paid; itemized deductions required"}'),
('CO', NULL, 'habitability_requirement', 'Landlord must maintain premises in habitable condition per housing code', 'CO Revised Statute § 38-12-505', NOW(), '{"special_notes": "Implied warranty; tenant remedies available"}'),
('CO', NULL, 'discrimination_protection', 'Protected classes include race, creed, color, national origin, sex, disability, familial status, sexual orientation, transgender status, marital status', 'CO Revised Statute § 24-34-402', NOW(), '{"protected_classes": ["race", "creed", "color", "national_origin", "sex", "disability", "familial_status", "sexual_orientation", "transgender_status", "marital_status"], "special_notes": "Includes transgender status protection"}'),

-- TENNESSEE
('TN', NULL, 'notice_period_entry', 'Landlord entitled to access with reasonable notice', 'TN Code § 66-28-501', NOW(), '{"notice_days": 24, "special_notes": "Reasonable notice standard"}'),
('TN', NULL, 'notice_period_eviction', '30 days written notice for non-payment; 14 days for lease violation', 'TN Code § 66-28-501', NOW(), '{"notice_days": 30, "special_notes": "Varies by violation type"}'),
('TN', NULL, 'notice_period_rent_increase', '30 days notice for month-to-month', 'TN Code § 66-28-501', NOW(), '{"notice_days": 30, "special_notes": "Periodic tenancy"}'),
('TN', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'TN Code § 66-28-501', NOW(), '{"notice_days": 30, "special_notes": "Either party"}'),
('TN', NULL, 'security_deposit_limit', 'No statutory limit; market practice 1-1.5 months rent', 'TN Code § 66-28-501', NOW(), '{"amount_limit": "No statutory limit", "special_notes": "Deposits should be segregated"}'),
('TN', NULL, 'security_deposit_return_deadline', '30 days after tenancy ends; interest if applicable', 'TN Code § 66-28-501', NOW(), '{"deadline_days": 30, "special_notes": "Itemized deductions required"}'),
('TN', NULL, 'habitability_requirement', 'Landlord must maintain premises in habitable condition', 'TN Code § 66-28-502', NOW(), '{"special_notes": "Implied warranty; tenant remedies available"}'),
('TN', NULL, 'discrimination_protection', 'Federal Fair Housing Act applies; Tennessee has limited state protections', 'Fair Housing Act', NOW(), '{"protected_classes": ["race", "color", "religion", "national_origin", "sex", "disability", "familial_status"], "special_notes": "Relies primarily on federal protections"}'),

-- OREGON (statewide + Portland)
('OR', NULL, 'notice_period_entry', '24 hours notice required for entry', 'OR Revised Statute § 90.300', NOW(), '{"notice_days": 24, "special_notes": "Must state purpose of entry; exceptions for emergencies"}'),
('OR', NULL, 'notice_period_eviction', '30 days written notice for non-payment; 10 days for lease violation', 'OR Revised Statute § 105.119', NOW(), '{"notice_days": 30, "special_notes": "Cure period may apply to lease violations"}'),
('OR', NULL, 'notice_period_rent_increase', '30 days notice plus local restrictions', 'OR Revised Statute § 90.227', NOW(), '{"notice_days": 30, "special_notes": "Increases may be restricted by local rent control"}'),
('OR', NULL, 'notice_period_lease_termination', '30 days for month-to-month; per lease for fixed term', 'OR Revised Statute § 90.427', NOW(), '{"notice_days": 30, "special_notes": "Either party; written notice required"}'),
('OR', NULL, 'security_deposit_limit', 'Limited to one month rent', 'OR Revised Statute § 90.300', NOW(), '{"amount_limit": "1 month rent", "special_notes": "Pet deposits may be limited by local ordinance"}'),
('OR', NULL, 'security_deposit_return_deadline', '30-45 days after tenancy ends; interest required', 'OR Revised Statute § 90.300', NOW(), '{"deadline_days": 45, "special_notes": "Interest must be paid; itemized deductions required"}'),
('OR', NULL, 'habitability_requirement', 'Landlord must maintain premises in habitable condition per housing code', 'OR Revised Statute § 90.320', NOW(), '{"special_notes": "Implied warranty; tenant remedies available"}'),
('OR', NULL, 'discrimination_protection', 'Protected classes include race, color, religion, sex, national origin, disability, familial status, sexual orientation, gender identity, marital status, source of income, domestic violence victim status', 'OR Revised Statute § 659C.005', NOW(), '{"protected_classes": ["race", "color", "religion", "sex", "national_origin", "disability", "familial_status", "sexual_orientation", "gender_identity", "marital_status", "source_of_income", "domestic_violence_victim_status"], "special_notes": "Comprehensive protections including source of income and DV status"}'),
('OR', NULL, 'rent_control_policy', 'Oregon has statewide rent control; increases capped and local controls apply in Portland', 'OR Revised Statute § 90.227', NOW(), '{"has_rent_control": true, "special_notes": "Statewide cap; Portland has additional local controls"}'),

('OR', 'Portland', 'notice_period_rent_increase', 'Portland requires 90 days notice plus restrictions on increase amounts', 'Portland City Code § 30.01.085', NOW(), '{"notice_days": 90, "special_notes": "Stricter than state law"}'),
('OR', 'Portland', 'rent_control_policy', 'Portland has strong rent control limiting increases to inflation + 7% max', 'Portland Rent Stabilization Ordinance', NOW(), '{"has_rent_control": true, "special_notes": "Among strictest rent control in nation"}');

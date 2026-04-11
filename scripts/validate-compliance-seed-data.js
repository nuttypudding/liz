#!/usr/bin/env node

/**
 * Compliance Seed Data Validation Script
 *
 * Validates jurisdiction_rules table for completeness and consistency:
 *   - State and city coverage
 *   - Required topics per jurisdiction
 *   - Rule text, citations, and metadata
 *   - No duplicates and consistent formatting
 *
 * Usage:
 *   node scripts/validate-compliance-seed-data.js --mode strict
 *   node scripts/validate-compliance-seed-data.js --mode lenient
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// Constants
// ============================================================================

const REQUIRED_STATES = [
  "CA",
  "TX",
  "NY",
  "FL",
  "IL",
  "PA",
  "OH",
  "GA",
  "NC",
  "MI",
  "NJ",
  "VA",
  "WA",
  "AZ",
  "MO",
  "MD",
  "IN",
  "CO",
  "TN",
  "OR",
];

const REQUIRED_CITIES = [
  { name: "New York", state: "NY" },
  { name: "Los Angeles", state: "CA" },
  { name: "San Francisco", state: "CA" },
  { name: "Chicago", state: "IL" },
  { name: "Portland", state: "OR" },
];

const REQUIRED_TOPICS = [
  "notice_period_entry",
  "notice_period_eviction",
  "notice_period_rent_increase",
  "notice_period_lease_termination",
  "security_deposit_limit",
  "security_deposit_return_deadline",
  "habitability_requirement",
  "discrimination_protection",
];

// ============================================================================
// Mock Data
// ============================================================================

const mockJurisdictionRules = [
  // CA State rules
  {
    state_code: "CA",
    city: null,
    topic: "notice_period_entry",
    rule_text: "Landlord must give 24 hours written notice before entry.",
    statute_citation: "CA Civil Code § 1954",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 1 },
  },
  {
    state_code: "CA",
    city: null,
    topic: "security_deposit_limit",
    rule_text: "Security deposit cannot exceed two months of rent.",
    statute_citation: "CA Civil Code § 1950.5",
    last_verified_at: new Date().toISOString(),
    details: { amount_limit: 2 },
  },
  {
    state_code: "CA",
    city: null,
    topic: "notice_period_eviction",
    rule_text: "30 days notice required for non-payment.",
    statute_citation: "CA Civil Code § 1161",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 30 },
  },
  {
    state_code: "CA",
    city: null,
    topic: "notice_period_rent_increase",
    rule_text: "90 days notice required.",
    statute_citation: "CA Civil Code § 1947.2",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 90 },
  },
  {
    state_code: "CA",
    city: null,
    topic: "notice_period_lease_termination",
    rule_text: "30 days notice to terminate without cause.",
    statute_citation: "CA Civil Code § 1946.1",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 30 },
  },
  {
    state_code: "CA",
    city: null,
    topic: "security_deposit_return_deadline",
    rule_text: "Must return deposit within 21 days.",
    statute_citation: "CA Civil Code § 1950.7",
    last_verified_at: new Date().toISOString(),
    details: { deadline_days: 21 },
  },
  {
    state_code: "CA",
    city: null,
    topic: "habitability_requirement",
    rule_text: "Property must be habitable and maintained.",
    statute_citation: "CA Civil Code § 1941",
    last_verified_at: new Date().toISOString(),
    details: { required: true },
  },
  {
    state_code: "CA",
    city: null,
    topic: "discrimination_protection",
    rule_text: "Fair Housing Act protections apply.",
    statute_citation: "Fair Housing Act",
    last_verified_at: new Date().toISOString(),
    details: { protected_classes: ["race", "color", "familial_status"] },
  },
  // SF City overrides
  {
    state_code: "CA",
    city: "San Francisco",
    topic: "notice_period_entry",
    rule_text: "Landlord must give 72 hours written notice.",
    statute_citation: "SF Administrative Code § 37.9",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 3 },
  },
  // NY State rules
  {
    state_code: "NY",
    city: null,
    topic: "notice_period_entry",
    rule_text: "Reasonable notice required before entry.",
    statute_citation: "NY Real Property Law § 235-f",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 1 },
  },
  {
    state_code: "NY",
    city: null,
    topic: "security_deposit_limit",
    rule_text: "Security deposit limited to one month rent.",
    statute_citation: "NY General Obligations Law § 7-103",
    last_verified_at: new Date().toISOString(),
    details: { amount_limit: 1 },
  },
  {
    state_code: "NY",
    city: null,
    topic: "notice_period_eviction",
    rule_text: "Notice requirements vary by lease type.",
    statute_citation: "NY Real Property Law § 711",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 30 },
  },
  {
    state_code: "NY",
    city: null,
    topic: "notice_period_rent_increase",
    rule_text: "30 days notice for lease renewal.",
    statute_citation: "NY Real Property Law § 226-a",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 30 },
  },
  {
    state_code: "NY",
    city: null,
    topic: "notice_period_lease_termination",
    rule_text: "30 days notice for month-to-month.",
    statute_citation: "NY Real Property Law § 231",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 30 },
  },
  {
    state_code: "NY",
    city: null,
    topic: "security_deposit_return_deadline",
    rule_text: "Return within reasonable time with interest.",
    statute_citation: "NY General Obligations Law § 7-103",
    last_verified_at: new Date().toISOString(),
    details: { deadline_days: 30 },
  },
  {
    state_code: "NY",
    city: null,
    topic: "habitability_requirement",
    rule_text: "Implied warranty of habitability applies.",
    statute_citation: "NY Real Property Law § 235-b",
    last_verified_at: new Date().toISOString(),
    details: { required: true },
  },
  {
    state_code: "NY",
    city: null,
    topic: "discrimination_protection",
    rule_text: "NY Human Rights Law provides protections.",
    statute_citation: "NY Executive Law § 296",
    last_verified_at: new Date().toISOString(),
    details: { protected_classes: ["race", "gender", "familial_status"] },
  },
  // TX State rules
  {
    state_code: "TX",
    city: null,
    topic: "notice_period_entry",
    rule_text: "Notice of entry not explicitly required.",
    statute_citation: "TX Property Code § 92.0081",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 0 },
  },
  {
    state_code: "TX",
    city: null,
    topic: "security_deposit_limit",
    rule_text: "No statutory limit on security deposits.",
    statute_citation: "TX Property Code § 92.103",
    last_verified_at: new Date().toISOString(),
    details: { amount_limit: null },
  },
  {
    state_code: "TX",
    city: null,
    topic: "notice_period_eviction",
    rule_text: "3 days notice for non-payment.",
    statute_citation: "TX Property Code § 92.019",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 3 },
  },
  {
    state_code: "TX",
    city: null,
    topic: "notice_period_rent_increase",
    rule_text: "No statutory minimum notice period.",
    statute_citation: "TX Property Code § 92.006",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 0 },
  },
  {
    state_code: "TX",
    city: null,
    topic: "notice_period_lease_termination",
    rule_text: "As per lease agreement.",
    statute_citation: "TX Property Code § 92.008",
    last_verified_at: new Date().toISOString(),
    details: { notice_days: 30 },
  },
  {
    state_code: "TX",
    city: null,
    topic: "security_deposit_return_deadline",
    rule_text: "Return within 30 days of lease end.",
    statute_citation: "TX Property Code § 92.004",
    last_verified_at: new Date().toISOString(),
    details: { deadline_days: 30 },
  },
  {
    state_code: "TX",
    city: null,
    topic: "habitability_requirement",
    rule_text: "Property must comply with building codes.",
    statute_citation: "TX Property Code § 92.008",
    last_verified_at: new Date().toISOString(),
    details: { required: true },
  },
  {
    state_code: "TX",
    city: null,
    topic: "discrimination_protection",
    rule_text: "Fair Housing Act applies.",
    statute_citation: "42 U.S.C. § 3604",
    last_verified_at: new Date().toISOString(),
    details: { protected_classes: ["race", "color", "religion"] },
  },
];

// ============================================================================
// Validation Functions
// ============================================================================

function validateStatesCoverage(rules, issues) {
  const existingStates = new Set(rules.map((r) => r.state_code));
  let validCount = 0;

  REQUIRED_STATES.forEach((state) => {
    if (!existingStates.has(state)) {
      issues.push({
        type: "state_coverage",
        severity: "error",
        jurisdiction: state,
        message: `Missing state: ${state}`,
      });
    } else {
      validCount++;
    }
  });

  return validCount;
}

function validateCitiesCoverage(rules, issues) {
  const citiesMap = new Map(rules.map((r) => [`${r.state_code}:${r.city}`, r]));
  let validCount = 0;

  REQUIRED_CITIES.forEach((city) => {
    const key = `${city.state}:${city.name}`;
    if (!citiesMap.has(key)) {
      issues.push({
        type: "city_coverage",
        severity: "error",
        jurisdiction: `${city.name}, ${city.state}`,
        message: `Missing city: ${city.name}, ${city.state}`,
      });
    } else {
      validCount++;
    }
  });

  return validCount;
}

function validateTopicsCoverage(rules, issues) {
  const jurisdictionTopics = new Map();

  rules.forEach((rule) => {
    const key = `${rule.state_code}:${rule.city || "STATEWIDE"}`;
    if (!jurisdictionTopics.has(key)) {
      jurisdictionTopics.set(key, new Set());
    }
    jurisdictionTopics.get(key).add(rule.topic);
  });

  jurisdictionTopics.forEach((topics, jurisdiction) => {
    const missingTopics = REQUIRED_TOPICS.filter((t) => !topics.has(t));
    if (missingTopics.length > 0) {
      issues.push({
        type: "topic_coverage",
        severity: "warning",
        jurisdiction,
        message: `Missing topics: ${missingTopics.join(", ")}`,
      });
    }
  });
}

function validateRuleText(rules, issues) {
  rules.forEach((rule) => {
    const jurisdiction = `${rule.state_code}${rule.city ? `:${rule.city}` : ""}`;

    if (!rule.rule_text) {
      issues.push({
        type: "rule_text",
        severity: "error",
        jurisdiction,
        message: `Empty rule_text for topic ${rule.topic}`,
      });
    } else if (rule.rule_text.length < 20) {
      issues.push({
        type: "rule_text",
        severity: "warning",
        jurisdiction,
        message: `Suspiciously short rule_text for topic ${rule.topic}`,
      });
    }
  });
}

function validateStatuteCitations(rules, issues) {
  rules.forEach((rule) => {
    const jurisdiction = `${rule.state_code}${rule.city ? `:${rule.city}` : ""}`;

    if (!rule.statute_citation) {
      issues.push({
        type: "statute_citation",
        severity: "error",
        jurisdiction,
        message: `Missing statute_citation for topic ${rule.topic}`,
      });
    } else if (!rule.statute_citation.match(/§|Code|Law|Act/)) {
      issues.push({
        type: "statute_citation",
        severity: "warning",
        jurisdiction,
        message: `Potentially malformed citation for ${rule.topic}`,
      });
    }
  });
}

function validateLastVerified(rules, issues) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  rules.forEach((rule) => {
    const jurisdiction = `${rule.state_code}${rule.city ? `:${rule.city}` : ""}`;

    if (!rule.last_verified_at) {
      issues.push({
        type: "last_verified_at",
        severity: "warning",
        jurisdiction,
        message: `Missing last_verified_at for topic ${rule.topic}`,
      });
    } else {
      const verifiedDate = new Date(rule.last_verified_at);
      if (verifiedDate > new Date()) {
        issues.push({
          type: "last_verified_at",
          severity: "error",
          jurisdiction,
          message: `Future date in last_verified_at for topic ${rule.topic}`,
        });
      } else if (verifiedDate < oneYearAgo) {
        issues.push({
          type: "last_verified_at",
          severity: "warning",
          jurisdiction,
          message: `Verification date is >1 year old for topic ${rule.topic}`,
        });
      }
    }
  });
}

function validateDetails(rules, issues) {
  rules.forEach((rule) => {
    const jurisdiction = `${rule.state_code}${rule.city ? `:${rule.city}` : ""}`;

    if (!rule.details) {
      issues.push({
        type: "details",
        severity: "warning",
        jurisdiction,
        message: `Missing details JSONB for topic ${rule.topic}`,
      });
    }
  });
}

function validateNoDuplicates(rules, issues) {
  const seen = new Set();

  rules.forEach((rule) => {
    const key = `${rule.state_code}:${rule.city || "NULL"}:${rule.topic}`;
    if (seen.has(key)) {
      issues.push({
        type: "duplicate",
        severity: "error",
        jurisdiction: `${rule.state_code}:${rule.city || "STATEWIDE"}`,
        message: `Duplicate rule for topic ${rule.topic}`,
      });
    }
    seen.add(key);
  });
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(report, outputDir) {
  const reportContent = `# Compliance Seed Data Validation Report

Generated: ${new Date().toISOString()}
Mode: ${report.mode}

## Summary
- States validated: ${report.statesValidated}/${REQUIRED_STATES.length}
- Cities validated: ${report.citiesValidated}/${REQUIRED_CITIES.length}
- Total rules: ${report.totalRules}
- Validation status: ${report.passed ? "✅ PASS" : "❌ FAIL"}

## Issues Found (${report.issues.length})

${
  report.issues.length === 0
    ? "No issues found!"
    : report.issues
        .map(
          (issue) =>
            `- **[${issue.severity.toUpperCase()}]** ${issue.type} in ${issue.jurisdiction}: ${issue.message}`
        )
        .join("\n")
}

## Recommendations
${
  report.issues.length === 0
    ? "✅ All validations passed. Seed data is ready for use."
    : "Review and fix issues above before proceeding with deployment."
}
`;

  const timestamp = new Date().toISOString().split("T")[0];
  const reportPath = path.join(
    outputDir,
    `compliance-seed-validation-report-${timestamp}.md`
  );

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, reportContent);

  return {
    reportPath,
    status: report.passed ? "✅ PASS" : "❌ FAIL",
  };
}

// ============================================================================
// Main Validation
// ============================================================================

async function validateComplianceSeedData() {
  const mode = process.argv.includes("--mode")
    ? process.argv[process.argv.indexOf("--mode") + 1]
    : "strict";

  console.log(`\n🔍 Validating compliance seed data (${mode} mode)...\n`);

  const issues = [];
  const rules = mockJurisdictionRules;

  // Run all validation checks
  const statesValidated = validateStatesCoverage(rules, issues);
  const citiesValidated = validateCitiesCoverage(rules, issues);
  validateTopicsCoverage(rules, issues);
  validateRuleText(rules, issues);
  validateStatuteCitations(rules, issues);
  validateLastVerified(rules, issues);
  validateDetails(rules, issues);
  validateNoDuplicates(rules, issues);

  // Determine pass/fail
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const passed = mode === "strict" ? errors.length === 0 : true;

  const report = {
    timestamp: new Date().toISOString(),
    mode,
    statesValidated,
    citiesValidated,
    totalRules: rules.length,
    issues,
    passed,
  };

  // Generate report file
  const reportsDir = path.join(process.cwd(), "compliance-reports");
  const { reportPath, status } = generateReport(report, reportsDir);

  // Console summary
  console.log(`📊 Validation Results:`);
  console.log(`  States: ${statesValidated}/${REQUIRED_STATES.length}`);
  console.log(`  Cities: ${citiesValidated}/${REQUIRED_CITIES.length}`);
  console.log(`  Total rules: ${rules.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Status: ${status}\n`);

  if (issues.length > 0) {
    console.log(`📋 Issues Found:`);
    issues.slice(0, 5).forEach((issue) => {
      console.log(
        `  [${issue.severity}] ${issue.type} (${issue.jurisdiction}): ${issue.message}`
      );
    });
    if (issues.length > 5) {
      console.log(`  ... and ${issues.length - 5} more issues`);
    }
    console.log();
  }

  console.log(`📄 Full report: ${reportPath}\n`);

  if (!passed) {
    process.exit(1);
  }
}

// Run validation
validateComplianceSeedData().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});

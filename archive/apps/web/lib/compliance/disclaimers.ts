/**
 * Legal disclaimer constants for the compliance engine
 * Single source of truth for all disclaimer messaging
 */

export const COMPLIANCE_DISCLAIMERS = {
  NOT_LEGAL_ADVICE:
    "This is not legal advice. Liz provides information to assist with landlord-tenant compliance tasks. Consult a licensed attorney in your jurisdiction for legal guidance.",
  REVIEW_BEFORE_SEND:
    "Review all generated notices with a legal professional before sending to tenants.",
  JURISDICTION_SPECIFIC:
    "Jurisdiction-specific rules apply. Verify all requirements with local authorities.",
  FAIR_HOUSING_REMINDER:
    "All landlord actions must comply with federal fair housing laws and local discrimination protections.",
  VERIFY_STATUTE:
    "Always verify current statutes and ordinances—laws change frequently.",
} as const;

export const DISCLAIMER_SEVERITY = {
  WARNING: "warning",
  ERROR: "error",
  INFO: "info",
} as const;

export type DisclaimerSeverity = (typeof DISCLAIMER_SEVERITY)[keyof typeof DISCLAIMER_SEVERITY];

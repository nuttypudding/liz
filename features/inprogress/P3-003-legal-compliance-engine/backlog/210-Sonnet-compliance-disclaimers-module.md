---
id: 210
title: Compliance disclaimers module — shared constants, DisclaimerBanner component
tier: Sonnet
depends_on: [209]
feature: P3-003-legal-compliance-engine
---

# 210 — Compliance Disclaimers Module

## Objective
Create a single source of truth for all legal disclaimers used throughout the compliance engine. Build a reusable `DisclaimerBanner` component that consistently displays disclaimer text with appropriate styling. Ensures compliance messaging is uniform and maintainable.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Legal compliance tools must prominently and consistently display disclaimers that this is not legal advice. A centralized constants module prevents text drift and enables rapid updates if disclaimer language needs to change.

## Implementation

1. **Create disclaimer constants** — `apps/web/lib/compliance/disclaimers.ts`
   ```typescript
   export const COMPLIANCE_DISCLAIMERS = {
     NOT_LEGAL_ADVICE: "This is not legal advice. Liz provides information to assist with landlord-tenant compliance tasks. Consult a licensed attorney in your jurisdiction for legal guidance.",
     REVIEW_BEFORE_SEND: "Review all generated notices with a legal professional before sending to tenants.",
     JURISDICTION_SPECIFIC: "Jurisdiction-specific rules apply. Verify all requirements with local authorities.",
     FAIR_HOUSING_REMINDER: "All landlord actions must comply with federal fair housing laws and local discrimination protections.",
     VERIFY_STATUTE: "Always verify current statutes and ordinances—laws change frequently.",
   };

   export const DISCLAIMER_SEVERITY = {
     WARNING: "warning",
     ERROR: "error",
     INFO: "info",
   } as const;
   ```

2. **Create DisclaimerBanner component** — `apps/web/components/compliance/DisclaimerBanner.tsx`
   - Props: `type` (warning|error|info), `text` (string), optional `icon`, optional `dismissable`
   - Styling:
     - **warning**: amber/yellow background, amber border
     - **error**: red background, red border
     - **info**: blue background, blue border
   - Always show disclaimer icon + text + optional close button
   - Use Tailwind utilities from existing button/card patterns

3. **Create DisclaimerBanner story** — `apps/web/components/compliance/DisclaimerBanner.stories.tsx`
   - Show all three severity variants
   - Show with/without dismiss button
   - Show with long text wrapping

4. **Update endpoints.md** if new components are documented there

## Acceptance Criteria
1. [ ] `disclaimers.ts` constants file created with all required disclaimer texts
2. [ ] `DisclaimerBanner` component created and accepts `type`, `text`, `dismissable` props
3. [ ] Component styling matches Tailwind design system (uses existing card/button utilities)
4. [ ] Component supports all three severity levels: warning, error, info
5. [ ] Storybook story created showing all variants
6. [ ] No TypeScript errors
7. [ ] Component is reusable across all compliance pages (dashboard, notice generator, etc.)

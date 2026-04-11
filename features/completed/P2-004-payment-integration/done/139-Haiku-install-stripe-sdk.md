---
id: 139
title: Install Stripe SDK — stripe + @stripe/stripe-js packages
tier: Haiku
depends_on: []
feature: P2-004-payment-integration
---

# 139 — Install Stripe SDK — stripe + @stripe/stripe-js packages

## Objective
Install Stripe server-side and client-side SDKs into the project via npm.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

The payment integration requires:
- `stripe` (server-side): API client for Node.js, used in API routes
- `@stripe/stripe-js` (client-side): JavaScript library for Stripe UI components (checkout, elements, etc.)

## Implementation

1. **Install packages** in `apps/web/`:
   ```bash
   cd apps/web
   npm install stripe @stripe/stripe-js
   ```

2. **Verify installation**:
   ```bash
   npm ls stripe @stripe/stripe-js
   ```

3. **Check package.json** entries:
   - Both `stripe` and `@stripe/stripe-js` should appear in `devDependencies` (or `dependencies`)

4. **Update .env.example** (task 155 handles this, but note for reference):
   - Will add Stripe environment variables later

## Acceptance Criteria
1. [ ] `npm install stripe @stripe/stripe-js` runs successfully
2. [ ] No peer dependency warnings or errors
3. [ ] `apps/web/node_modules/stripe/` directory exists
4. [ ] `apps/web/node_modules/@stripe/stripe-js/` directory exists
5. [ ] `apps/web/package.json` lists both packages
6. [ ] No TypeScript errors with Stripe imports
7. [ ] Stripe types are available (e.g., `import { Stripe } from '@stripe/stripe-js'` works)

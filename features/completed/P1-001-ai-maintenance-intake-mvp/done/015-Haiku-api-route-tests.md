---
id: 015
title: Write unit tests for API routes
tier: Haiku
depends_on: [3, 4, 5, 6, 7, 10]
feature: ai-maintenance-intake-mvp
---

# 015 — Write Unit Tests for API Routes

## Objective

Add unit tests for all API routes to verify authentication, authorization, validation, and database operations work correctly.

## Context

- 14 API route files need test coverage
- No test framework set up yet — need to choose and configure (vitest recommended for Next.js)
- Tests should mock Supabase client and Clerk auth to run without external services
- Zod schemas at `lib/validations.ts` also need test coverage

## Implementation

### Step 1: Set up vitest

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react
```

Create `apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Step 2: Create test helpers

Create `apps/web/tests/helpers.ts` with:
- Mock Supabase client factory
- Mock Clerk auth helpers
- Request builder utilities

### Step 3: Write tests for each route group

**Properties tests** (`tests/api/properties.test.ts`):
- GET returns only landlord's properties
- POST creates property with valid data
- POST rejects invalid data (Zod validation)
- PATCH updates property
- DELETE removes property
- Unauthorized access returns 401
- Wrong role returns 403

**Vendors tests** (`tests/api/vendors.test.ts`):
- Similar pattern to properties

**Requests tests** (`tests/api/requests.test.ts`):
- GET with landlord role returns filtered requests
- GET with tenant role returns own requests
- PATCH updates allowed fields
- Dispatch route validates vendor ownership

**Intake tests** (`tests/api/intake.test.ts`):
- Creates request with valid input
- Validates tenant_message length
- Links photos to request

**Dashboard tests** (`tests/api/dashboard.test.ts`):
- Stats returns correct aggregates
- Spend chart returns per-property data

### Step 4: Zod schema tests

Test edge cases for each schema in `tests/lib/validations.test.ts`.

## Acceptance Criteria

1. [ ] Verify correct model tier (Haiku)
2. [ ] vitest configured and `npm test` runs
3. [ ] At least 1 test per API route method (GET, POST, PATCH, DELETE)
4. [ ] Auth tests: 401 for unauthenticated, 403 for wrong role
5. [ ] Validation tests: 400 for invalid Zod input
6. [ ] Zod schema edge cases tested
7. [ ] All tests pass
8. [ ] Tests run without external services (mocked Supabase + Clerk)

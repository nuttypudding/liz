---
name: test-fix-dev
description: "Creative autonomous local QA — invents tests, probes boundaries, stress-tests assumptions, and self-heals failures. The testing mind that finds bugs nobody thought to look for."
---

# /test-fix-dev — Creative Autonomous Local QA

The creative QA agent with imagination. Doesn't just run existing tests — it
*invents* tests, probes boundaries, and stress-tests assumptions. Finds the bugs
nobody thought to look for.

## Arguments

`/test-fix-dev [scope]`

| Scope | What it does |
|-------|-------------|
| `all` (default) | Full creative QA sweep — all 7 phases |
| `unit` | Run + fix Vitest tests only (phases 1-2, 5) |
| `api` | API endpoint discovery + creative probing (phases 1, 3, 5) |
| `ui` | Page crawl + smoke check (phases 1, 4, 5) |
| `test-lab` | Run Test Lab suites + probe manual endpoints with adversarial inputs |
| `<file-or-dir>` | Target a specific area (e.g., `apps/web/tests/api/`) |

## Phase 1: Discovery

Scan the codebase to build a complete inventory.

```bash
# Count test files and cases per tier
find apps/web/tests -name "*.test.ts" -o -name "*.test.tsx" | head -100
cd apps/web && npx vitest run --reporter=verbose --dry-run 2>&1 | tail -5

# Discover all API routes
find apps/web/app/api -name "route.ts" | sort

# Discover all app pages
find apps/web/app -name "page.tsx" | sort

# Check Test Lab registry
cat apps/web/lib/test-lab/registry.ts
```

Print an inventory table:

```
Discovery
═════════
Test files:     51 files, 930+ cases
API routes:     25 route groups
App pages:      37 pages
Test Lab:       1 component (triage, 20 samples)
```

## Phase 2: Run Existing Tests

```bash
cd apps/web && npx vitest run --reporter=verbose 2>&1
```

Parse the output and categorize failures:
- **Assertion failures** — expected vs actual mismatch
- **Import errors** — broken imports, missing modules
- **Timeout errors** — async operations hanging
- **Type errors** — TypeScript compilation issues

Record each failure: file, test name, error type, error message.

## Phase 3: Creative Probing

**This is the soul of the skill.** For each API route discovered in Phase 1,
probe it creatively using `curl` against the local dev server (`localhost:3000`).

### Probe Categories

**Boundary attacks:**
- Empty body: `{}`
- Null fields: `{"tenant_message": null}`
- Giant strings: 10,000-character payloads
- Extreme numbers: `-1`, `0`, `Number.MAX_SAFE_INTEGER`, `NaN`
- Empty arrays where arrays expected: `{"conditions": []}`

**Type confusion:**
- String where number expected: `{"urgency": "yes"}`
- Array where object expected: `{"property": [1,2,3]}`
- Nested objects where string expected: `{"name": {"nested": true}}`
- Boolean where string expected: `{"message": true}`

**Auth probing:**
- Call without Authorization header (expect 401)
- Call with malformed JWT (expect 401)
- Tenant role on landlord-only endpoints (expect 403)

**Injection testing:**
- SQL: `'; DROP TABLE properties; --`
- XSS: `<script>alert(1)</script>`, `<img onerror=alert(1) src=x>`
- Path traversal: `../../etc/passwd` in ID fields
- Command injection: `; ls -la` in text fields
- Template injection: `{{7*7}}`, `${7*7}`

**Unicode stress:**
- Emoji-heavy: `🔥💧⚡🏠🔧` repeated 100 times
- RTL text: `\u200F` markers mixed with Latin text
- Null bytes: `hello\x00world`
- Zero-width joiners: `a\u200Db`
- Mixed scripts: Arabic + Chinese + Cyrillic in one field

**Semantic edge cases:**
- Future dates (year 2099)
- Past dates (Unix epoch, 1970-01-01)
- Duplicate submissions (same payload twice)
- Self-referential data (tenant_id = landlord_id)

**Test Lab specific (when scope includes `test-lab` or `all`):**
- Run triage suite via `POST /api/test-lab/components/triage/run`
- Probe manual endpoint `POST /api/test-lab/components/triage/manual` with:
  - Empty message: `{"tenant_message": ""}`
  - 10k-char message
  - Non-English text (Spanish, Japanese, Arabic)
  - Emoji-only: `"🔥🔥🔥🔥🔥"`
  - Code snippet as message: `"function exploit() { return db.query('SELECT *') }"`
  - Mixed category signals: `"My toilet is on fire and there are rats in the wiring"`

### Probing Method

```bash
# Example: boundary attack on classify endpoint
curl -s -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\n%{http_code}"

# Example: XSS probe
curl -s -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{"tenant_message": "<script>alert(1)</script>"}' \
  -w "\n%{http_code}"
```

Log each probe result:

```
| Endpoint          | Payload Type     | Expected | Actual | Result |
|-------------------|------------------|----------|--------|--------|
| POST /api/classify| empty body       | 400      | 400    | PASS   |
| POST /api/classify| 10k-char string  | 400      | 500    | FAIL   |
| POST /api/intake  | XSS in message   | 400      | 200    | FAIL   |
```

**Any unexpected 500 or accepted injection payload is a finding.**

## Phase 4: UI Smoke Crawl

Only runs when scope is `ui` or `all`.

First, verify the dev server is running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If not running, start it:

```bash
cd apps/web && npm run dev &
# Wait for server ready
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

For each page route discovered in Phase 1:

```bash
# Check each page returns 200 (or redirect), not 500
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/test-lab
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
# ... etc
```

For key pages, verify content markers:

```bash
# Test Lab page should contain "Test Lab" in the HTML
curl -s http://localhost:3000/test-lab | grep -c "Test Lab"

# Dashboard should contain navigation elements
curl -s http://localhost:3000/dashboard | grep -c "nav"
```

Report any 500s or missing content markers.

## Phase 5: Diagnose & Fix

For each failure found in Phases 2-4, run an autonomous repair loop.

### Fix Protocol

1. **Read** the failing test and corresponding source code using Explore agent
2. **Identify root cause**: source bug? stale mock? wrong assertion? missing validation?
3. **Apply fix** — **ALWAYS prefer fixing source over weakening tests**
   - Tests are truth — never weaken assertions to make them pass
   - If a test expects 400 on bad input and the API returns 200, fix the API
   - If a test has a genuinely wrong assertion, fix the test (but confirm first)
4. **Re-run** the specific failing test to confirm the fix
5. **Max 3 fix attempts** per failure — if still failing after 3 tries, flag as "needs human"

### Priority Order

Fix failures in this order:
1. Import errors (unblock other tests)
2. Source bugs found by creative probing (security issues first)
3. Assertion failures in existing tests
4. Timeout errors (may need async fixes)

## Phase 6: Generate Missing Tests

For any API route discovered in Phase 1 that has **no corresponding test file**
in `apps/web/tests/api/`, generate a basic test covering:

- **Auth guard**: unauthenticated request returns 401
- **Input validation**: malformed body returns 400
- **Happy path**: valid request returns 200 or 201

Use patterns from existing test files:
- Test helpers: `apps/web/tests/helpers.ts`
- Reference tests: `apps/web/tests/api/intake.test.ts`, `apps/web/tests/api/test-lab.test.ts`

Run each new test to verify it passes before moving on.

## Phase 7: Report

Print a final summary card:

```
Test-Fix-Dev Report
═══════════════════
Scope:           all

Existing tests:  930 pass / 4 fail
Creative probes: 45 sent / 2 issues found
  - POST /api/rules: 500 on empty conditions array
  - POST /api/intake: accepts <script> in tenant_message (XSS risk)
UI smoke crawl:  37 pages / 0 errors
Test Lab:        triage 18/20 passed (category drift on 2 HVAC samples)

Fixes applied:   2
  1. lib/rules/engine.ts:45 — added empty-array guard
  2. app/api/intake/route.ts:28 — sanitize HTML in tenant_message

Tests created:   3 new files
  - tests/api/test-lab.test.ts
  - tests/api/scheduling.test.ts
  - tests/api/rent.test.ts

Blocked:         1 issue needs human review
  - ai-matcher date logic: assertion failure after 3 fix attempts
```

## Key Principles

| Principle | Rationale |
|-----------|-----------|
| Creative probing is the core identity | Distinguishes from `/test-all` which just runs existing tests |
| Fix source, not tests | Tests are truth — never weaken assertions to pass |
| Max 3 fix iterations per failure | Prevents infinite loops on hard bugs |
| Dynamic route discovery | Scans `app/api/` filesystem so new routes are auto-covered |
| `curl` for UI smoke, not Playwright | Playwright has Chrome install issues; curl catches 500s reliably |
| Security findings are highest priority | XSS, injection, and auth bypass get fixed before anything else |

## Reference Files

| Resource | Path |
|----------|------|
| Test helpers | `apps/web/tests/helpers.ts` |
| Testing docs | `docs/testing-framework.md` |
| Test Lab registry | `apps/web/lib/test-lab/registry.ts` |
| Test Lab API (triage run) | `apps/web/app/api/test-lab/components/triage/run/route.ts` |
| Test Lab API (triage manual) | `apps/web/app/api/test-lab/components/triage/manual/route.ts` |
| API routes | `apps/web/app/api/` |
| App pages | `apps/web/app/` (`page.tsx` files) |
| Existing test reference | `apps/web/tests/api/intake.test.ts` |

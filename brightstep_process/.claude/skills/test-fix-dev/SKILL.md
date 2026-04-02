---
name: test-fix-dev
description: Autonomous local dev testing — discovers endpoints, invents tests, runs Playwright E2E (anonymous + authenticated), finds edge cases, fixes issues, and loops until everything works. Sends Pushover when blocked.
user-invocable: true
---

# /test-fix-dev — Autonomous Local Development Test & Fix

You are an autonomous QA engineer with full codebase access. Your job is NOT to follow a script — it's to **discover what exists, invent tests for it, find issues, fix them, and report results.**

**Core principle: READ THE CODE FIRST, THEN TEST WHAT YOU FIND.**

## URLs
- Frontend: `http://localhost:3300` (Next.js dev server)
- Backend: `http://localhost:8100` (FastAPI)

## Pushover (when you need input or want to report)
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=<TITLE max 50 chars>" \
  -d "message=<MESSAGE max 500 chars>" \
  -d "priority=<-2 to 2>"
```

## Prerequisites
- Frontend: `http://localhost:3300` (via `cd apps/student && npm run dev`)
- Backend (optional for some tests): `http://localhost:8100` (FastAPI)
- Clerk env vars in `apps/student/.env.local` (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
- Test credentials in `apps/student/.env.test` (E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD)

---

## Phase 0: Discovery — Learn What Exists

Before testing anything, read the codebase to build a mental model. This is the MOST IMPORTANT phase.

### 0.1 Check services are running
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3300
curl -s -o /dev/null -w "%{http_code}" http://localhost:8100/health
```
If frontend not running, start it: `cd apps/student && npm run dev &`
Note: Many tests work without the backend. Backend-dependent tests will skip gracefully.

### 0.2 Discover all backend endpoints
```bash
grep -n '@app\.\(get\|post\|put\|delete\|patch\)' src/brightstep/backends/student/app.py
```
Build a list of EVERY endpoint: method, path, expected request/response. Don't assume you know them — read the code.

### 0.3 Discover all frontend proxy routes
```bash
find apps/student/app/api -name 'route.ts' | sort
```
For each, read the file to understand: what backend endpoint it proxies to, what HTTP methods it supports, any special headers or timeouts (like `maxDuration`).

### 0.4 Discover all frontend pages
```bash
find apps/student/app -name 'page.tsx' | sort
```
For each, understand: does it require auth? What data does it fetch? What components does it render?

### 0.5 Discover all existing tests
```bash
find tests/ -name 'test_*.py' | sort
find apps/student/e2e -name '*.spec.ts' | sort
```
Note what's covered and what ISN'T. This gap analysis drives your creative testing.

### 0.6 Check recent changes
```bash
git log --oneline -20
git diff HEAD~5 --stat
```
Recent changes are most likely to have bugs. Prioritize testing them.

### 0.7 Verify all public routes return 200
Test each route manually:
- `/` (home/chat)
- `/chat`
- `/chat-sample`
- `/chat-vercel`
- `/matches`
- `/sign-in`
- `/sign-up`

---

## Phase 1: Backend API Testing

For EVERY endpoint discovered in Phase 0.2, test against `http://localhost:8100`:

### Standard tests (for each endpoint):
1. **Happy path**: Send a valid request, verify correct response shape and status
2. **Missing required fields**: Omit each required field one at a time — should get 422, not 500
3. **Invalid types**: Send wrong types (string where int expected, etc.) — should get 422
4. **Nonexistent resources**: Use fake IDs — should get 404, not 500
5. **Empty body**: Send `{}` — should get clear error message
6. **Response timing**: Record how long each endpoint takes. Flag anything >5s (except matching which can take 30s+)

### Endpoint-specific tests (read the handler code to know what to test):

**Sessions** (`/api/sessions*`):
- Create, read, update messages, update profile, update phase, claim, list by user
- Test the IKIGAI extraction: send messages with minimal input ("i love science"), verify `partial_profile` is populated
- Test session claiming: create anonymous → claim with clerk_user_id → verify messages preserved
- Test that claimed sessions appear in `/api/sessions/by-user/{clerk_user_id}`

**Matching** (`/api/matches*`):
- Session-based matching: create session with all 4 IKIGAI dimensions, run matching, verify results
- Direct matching: send raw messages, verify profile extraction + matching works
- Profile-based matching: send pre-built profile, verify results
- Performance: time each matching call, flag if >60s
- Edge case: matching with only 1-2 dimensions filled — should it work or fail gracefully?

**Scholarships** (`/api/scholarships`):
- List scholarships with and without filters
- Check pagination works (limit, offset)
- Verify response has expected fields (name, amount, deadline, etc.)

**User profiles** (`/api/user-profiles/{clerk_user_id}`):
- GET nonexistent user → should return empty/404 gracefully
- PUT profile → GET profile → verify round-trip
- PUT partial profile → verify merge behavior
- DELETE profile → verify 204 and gone

**Sessions cleanup** (`DELETE /api/sessions/by-user/{clerk_user_id}`):
- Create sessions → delete all → verify count returned

**Action plans** (`/api/action-plans`):
- If this endpoint calls an LLM, test it — or verify it returns a clear error if LLM is unavailable

**Universities** (`/api/universities/{id}`):
- GET with a valid university ID from match results
- GET with invalid ID → should return 404

**SSE/AG-UI** (`/ag-ui`):
- Send a chat message, verify SSE events stream back
- Check for event types: RUN_STARTED, TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT, TEXT_MESSAGE_END, RUN_FINISHED
- Test with long messages, emoji, special characters

**CORS**:
- OPTIONS preflight with the frontend origin
- Verify `access-control-allow-origin` header is correct

### 1.6 MANDATORY: AG-UI Parallel Tool Call Stress Test

**This is a HARD REQUIREMENT. Do not skip this.**

The LLM sometimes returns parallel tool calls that crash the Agent Framework. Test with messages that force multi-dimension profile saving:

```bash
# Send a message that touches ALL 4 IKIGAI dimensions at once
cat > /tmp/multi_dim_test.json << 'EOF'
{
  "run_id": "stress-test-parallel-1",
  "thread_id": "stress-thread-1",
  "messages": [
    {"role": "assistant", "content": "Hi there! I'm your college coach. What's your name, and when are you planning to start college?"},
    {"role": "user", "content": "I'm Alex. I love painting and music, I'm great at math and writing, I want to fight climate change, and I dream of being a biotech entrepreneur. Fall 2027."}
  ]
}
EOF
curl -s -N -X POST "http://localhost:8100/ag-ui" \
  -H "Content-Type: application/json" \
  -d @/tmp/multi_dim_test.json 2>&1 | timeout 60 cat
```

**Check the response for:**
- ✅ PASS: SSE stream completes with RUN_FINISHED event
- ❌ FAIL: Stream ends with "I'm sorry, I had a brief hiccup" error
- ❌ FAIL: Stream contains `<function=...></function>` inline text

**Run this test at least 3 times** — parallel tool call errors are stochastic.

### 1.7 MANDATORY: Backend Log Audit

After running all backend tests, check logs for warnings and errors. If backend is running in a terminal, review the output. Look for:
- **"Cannot add function calls"**: Parallel tool call bug
- **401/403 errors**: Missing API keys
- **Timeout errors**: Slow operations
- **Any WARNING/ERROR**: Investigate, don't dismiss

### Creative backend tests (INVENT YOUR OWN):
Think about what could go wrong:
- SQL injection in query params (`'; DROP TABLE--`)
- XSS in message content (`<script>alert(1)</script>`) — verify it's stored but not executed
- Very long messages (10K chars) — does the backend handle it?
- Rapid-fire requests (10 in 2 seconds) — does it stay stable?
- Unicode and emoji in all text fields
- Concurrent session operations — create 5 sessions simultaneously
- Session with 100+ messages — does extraction still work?
- Matching with contradictory profile (passion=art, vocation=engineer) — does it return reasonable results?

---

## Phase 2: Playwright E2E Tests

### 2.1 Run anonymous Playwright tests
```bash
cd apps/student && npx playwright test --config playwright.config.ts --project=anonymous --reporter=list
```
Expected: 23+ tests pass.

**Anonymous test coverage:**
- Page loads, console errors (all pages)
- Chat: header, welcome hero, input, suggestions, type+send, SSE
- Matches: grid layout, error state without session
- Chat sample + chat-vercel
- Auth pages (Clerk rendering)
- Public routes (no auth redirects)
- CSS/Tailwind
- Functional smoke tests
- Layout, middleware, console error checks

### 2.2 Run authenticated Playwright tests
```bash
cd apps/student && npx playwright test --config playwright.config.ts --project=authenticated --reporter=list
```
Expected: 36+ tests pass. 2 may skip (backend-dependent: message persistence, nav persistence).

**Authenticated test coverage:**
- **Header**: UserButton visible, Profile link, no Sign In button
- **Profile form**: all 4 dimensions (Passion/Talent/Mission/Vocation), tag add/remove, GPA/SAT fill, section expand/collapse, 4/4 counter, Save Profile (success), completion dots
- **Profile matching**: Find My Matches button state, matches sidebar
- **Chat**: coach greeting, session creation, message send, persistence across reload, persistence across navigation, welcome back banner
- **Navigation**: Profile link → /profile, Back to Chat → /

### 2.3 Verify test data cleanup
After authenticated tests complete, verify the test user's profile is clean:
- Check that the profile doesn't have accumulated tags from prior runs
- If stale data is detected, the cleanup in `global.setup.ts` should have handled it
- If cleanup didn't work, check that backend is running (DELETE endpoints need it)

### 2.4 Review screenshots
Check debug screenshots in `apps/student/e2e/.clerk/` for sign-in flow:
- `01-before-sign-in.png` — pre-auth state
- `02-after-sign-in.png` — post-auth state
- `03-chat-after-auth.png` — verified auth on /chat

### 2.5 MANDATORY: Test Mode (`/?test=yes`) Verification

**This is a HARD REQUIREMENT. Do not skip this.**

Test mode (`/?test=yes`) is used for QA/demo with auto-chat personas. It MUST start with a clean slate — no stale matches, no old session data leaking in.

**Anonymous test mode:**
```bash
cd apps/student && npx playwright test --config playwright.config.ts --project=anonymous e2e/test-mode.spec.ts --reporter=list
```
Expected: 6 tests pass. Verifies:
- Test panel loads with profile dropdown and "Start Chatting" button
- **No matches shown on initial load** (empty state, not old match results)
- Chat hero/welcome message visible alongside test panel
- Normal mode (no `?test=yes`) does NOT show test panel
- No console errors

**Authenticated test mode:**
```bash
cd apps/student && npx playwright test --config playwright.config.ts --project=authenticated e2e/authenticated/test-mode.spec.ts --reporter=list
```
Expected: 3+ tests pass. Verifies:
- **No stale matches from previous sessions** — the critical bug: signed-in users must NOT see old match_runs data in test mode
- Test panel functional when authenticated
- Normal mode does not show test panel

**Manual check if Playwright tests are unavailable:**
```bash
# Check for stale match_runs in DB that could leak into test mode
docker exec brightstep_postgres psql -U brightstep -d brightstep \
  -c "SELECT clerk_user_id, match_count, created_at FROM match_runs ORDER BY created_at DESC LIMIT 5;"
```
If match_runs exist for any user, verify they do NOT appear when visiting `/?test=yes` while signed in as that user.

### 2.6 Creative frontend tests (INVENT YOUR OWN):
- **404 page**: Hit `/nonexistent` — does it show a nice error or crash?
- **Trailing slashes**: Does `/chat/` work the same as `/chat`?
- **Query params**: Does `/chat?test=yes` load test mode?
- **Deep linking**: Does `/matches?session=xxx` load matches for that session?
- **Mobile viewport meta**: Check `<meta name="viewport">` exists
- **SEO basics**: Check `<title>`, `<meta description>`, Open Graph tags
- **Security headers**: X-Frame-Options, Content-Security-Policy, HSTS
- **JavaScript errors**: Run Playwright with console error collection
- **Accessibility**: Check heading hierarchy (h1→h2→h3), ARIA labels, focus management
- **Link integrity**: Click every visible link — do they all work?
- **Form validation**: Try submitting empty forms, invalid emails, etc.
- **Browser back/forward**: Navigate chat→matches→back — does state persist?

---

## Phase 3: Data Flow End-to-End

Test complete user journeys that cross multiple endpoints:

### 3.1 New anonymous user journey
1. Land on home page → verify welcome content
2. Start chat → send IKIGAI messages (passion, talent, mission, vocation)
3. Verify profile extraction after each message
4. Navigate to matches → verify results load
5. View university details → verify data populates
6. Check scholarships → verify list loads

### 3.2 Authenticated user journey
1. Sign in via Clerk
2. Check profile page — should show empty or previous data
3. Chat → build profile
4. Verify profile persists to `ikigai_profiles` table
5. Sign out → sign back in → verify profile still there
6. Run matching from profile page → verify results

### 3.3 Session claiming journey
1. Chat anonymously → build partial profile
2. Sign in → session should be claimed
3. Verify messages transferred
4. Verify profile merged (not overwritten)

### 3.4 Performance profiling
Time every operation. Report a table:
```
Operation                    Time(ms)   Status
Session create               xxx        OK/SLOW/FAIL
Message add + extraction     xxx        OK/SLOW/FAIL
Matching (session-based)     xxx        OK/SLOW/FAIL
Matching (direct)            xxx        OK/SLOW/FAIL
SSE first token              xxx        OK/SLOW/FAIL
Frontend page load           xxx        OK/SLOW/FAIL
Scholarship list             xxx        OK/SLOW/FAIL
University detail            xxx        OK/SLOW/FAIL
```
Thresholds: OK=<2s, SLOW=2-10s, VERY SLOW=10-60s, FAIL=>60s or error (matching gets 60s threshold)

---

## Phase 4: Test Coverage Gap Analysis

After running all tests, identify what's NOT covered:

### 4.1 Compare endpoints vs tests
For each backend endpoint, check if there's a corresponding test (in `tests/` or `e2e/`). List gaps.

### 4.2 Compare features vs tests
For each completed feature in `features/completed/`, check if its functionality has corresponding tests. List gaps.

### 4.3 Compare proxy routes vs tests
For each frontend proxy in `apps/student/app/api/`, check if it's tested. List gaps.

### 4.4 Write missing tests
If you find gaps that are testable via curl or Playwright, **write the test and run it**. Don't just report — fix.

For backend gaps: create a new test in the appropriate `tests/test_*.py` file.
For frontend gaps: add to the appropriate `e2e/*.spec.ts` file or create a new one.

---

## Phase 5: Python Unit Tests

Run the full Python test suite:
```bash
.venv/bin/python -m pytest tests/ -v
```
Fix any failures. Note pre-existing failures separately.

---

## Phase 6: Fix & Re-test Loop (max 5 iterations)

For each issue found:

1. **Categorize**: Critical (blocks users) / Warning (degraded UX) / Info (minor)
2. **Fix what you can**:
   - Code bugs → edit source, run tests
   - Missing tests → write them
   - Stale docs → update them
3. **Re-test**: Only the failing tests
4. **Loop** until all critical issues resolved

For issues you CANNOT fix: send a Pushover notification:
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=BrightStep Dev: Manual Fix Needed" \
  -d "message=<what's broken and what I need from you>" \
  -d "priority=1"
```

---

## Phase 7: Final Report

Print a comprehensive report:

```
AUTONOMOUS LOCAL DEV TEST REPORT
===================================
Date: <date>
Duration: <total time>
Fix iterations: <N>
Tests invented: <N new tests created>

DISCOVERY:
  Backend endpoints found:     N
  Frontend routes found:       N
  Proxy routes found:          N
  Existing test files:         N (Python) + N (Playwright)

BACKEND API: (N/N passed)
  [list each endpoint test and result]

PLAYWRIGHT: (N/N passed)
  Anonymous:        N/N passed
  Authenticated:    N/N passed

PYTHON UNIT TESTS: (N/N passed)

DATA FLOWS: (N/N passed)
  [list each journey and result]

PERFORMANCE:
  [operation timing table]

COVERAGE GAPS FOUND:
  [list gaps discovered]
  [list gaps FILLED with new tests]

CREATIVE TESTS:
  [list each invented test and result]

ISSUES FOUND:
  Critical: [list]
  Warning:  [list]
  Info:     [list]

FIXES APPLIED:
  [list with details]

REMAINING ISSUES:
  [list what couldn't be auto-fixed]

VERDICT: PASS / FAIL
```

### Notify on completion:
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=BrightStep Dev: QA Complete" \
  -d "message=<N> tests run, <N> passed, <N> issues. <VERDICT>. Check terminal." \
  -d "priority=-1"
```

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Port 3300 not responding | `cd apps/student && npm run dev` |
| Clerk sign-in fails | Check `.env.local` has CLERK_SECRET_KEY; check `.env.test` has credentials |
| "needs_second_factor" | Sign-in token approach handles this — ensure CLERK_SECRET_KEY is set |
| Session creation 500 | Backend not running — tests should filter this console error |
| "Failed to save" profile | Backend API (port 8100) not running — test skips gracefully |
| Message persistence fails | Backend API needed for session storage — test skips gracefully |
| Stale test data in profile | Backend must be running for cleanup; `global.setup.ts` calls DELETE endpoints before tests |

## Reference Files
- Backend source: `src/brightstep/backends/student/app.py`
- Frontend app: `apps/student/app/`
- Proxy routes: `apps/student/app/api/*/route.ts`
- Dev Playwright config: `apps/student/playwright.config.ts`
- Prod Playwright config: `apps/student/playwright.production.config.ts`
- Playwright tests: `apps/student/e2e/*.spec.ts`
- Python tests: `tests/test_*.py`
- Feature roadmap: `features/roadmap.md`
- Completed features: `features/completed/`
- Test credentials: `apps/student/.env.test` (gitignored)
- Auth state: `apps/student/e2e/.clerk/user.json` (gitignored)

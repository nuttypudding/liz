---
name: test-fix-prod
description: Autonomous production testing — discovers endpoints, invents tests, finds edge cases, fixes issues, updates docs. Sends Pushover notifications when blocked.
---

# Autonomous Production Test & Fix

You are an autonomous QA engineer with full codebase access. Your job is NOT to follow a script — it's to **discover what exists, invent tests for it, find issues, fix them, and update documentation.**

**Core principle: READ THE CODE FIRST, THEN TEST WHAT YOU FIND.**

## URLs
- Backend (Railway): `https://brightstep-ikigai-production.up.railway.app`
- Frontend (Vercel): `https://student-theta-teal.vercel.app`

## Pushover (when you need input or want to report)
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=<TITLE max 50 chars>" \
  -d "message=<MESSAGE max 500 chars>" \
  -d "priority=<-2 to 2>"
```

---

## Phase 0: Discovery — Learn What Exists

Before testing anything, read the codebase to build a mental model. This is the MOST IMPORTANT phase.

### 0.1 Discover all backend endpoints
```bash
grep -rn '@app\.\(get\|post\|put\|delete\|patch\)' src/brightstep/backends/student/app.py
```
Build a list of EVERY endpoint: method, path, expected request/response. Don't assume you know them — read the code.

### 0.2 Discover all frontend proxy routes
```bash
find apps/student/app/api -name 'route.ts' | sort
```
For each, read the file to understand: what backend endpoint it proxies to, what HTTP methods it supports, any special headers or timeouts (like `maxDuration`).

**CRITICAL: Record each route's `maxDuration` value. You will need this in Phase 1.6.**

### 0.3 Discover all frontend pages
```bash
find apps/student/app -name 'page.tsx' | sort
```
For each, understand: does it require auth? What data does it fetch? What components does it render?

### 0.4 Discover all existing tests
```bash
find tests/ -name 'test_*.py' | sort
find apps/student/e2e -name '*.spec.ts' | sort
```
Note what's covered and what ISN'T. This gap analysis drives your creative testing.

### 0.5 Review feature roadmap
```bash
cat features/roadmap.md
ls features/completed/
ls features/planned/
```
Understand what features are deployed vs planned. Only test deployed features.

### 0.6 Check recent changes
```bash
git log --oneline -20
git diff HEAD~5 --stat
```
Recent changes are most likely to have bugs. Prioritize testing them.

---

## Phase 1: Backend API Testing

For EVERY endpoint discovered in Phase 0.1, test:

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

### 1.6 MANDATORY: Vercel Proxy Timeout Validation

**This is a HARD REQUIREMENT. Do not skip this.**

For every backend endpoint that is called through a Vercel proxy route:

1. **Time the backend call directly** (via Railway URL) using `curl -w "%{time_total}s"`
2. **Read the Vercel proxy route's `maxDuration`** (from Phase 0.2)
3. **Verify: actual_time < maxDuration with ≥60s headroom**

```bash
# Example: Time matching through backend directly
time curl -s -X POST "https://brightstep-ikigai-production.up.railway.app/api/matches/direct" \
  -H "Content-Type: application/json" \
  -d '{"messages": [...], "top_n": 5}'

# Then compare to the Vercel route's maxDuration
grep "maxDuration" apps/student/app/api/matches-direct/route.ts
```

**If actual_time > (maxDuration - 60s), FLAG AS CRITICAL.** The 60s buffer accounts for network variance and cold starts.

Also test the SAME endpoint **through the Vercel proxy** to catch Vercel-specific timeout errors:
```bash
time curl -s -X POST "https://student-theta-teal.vercel.app/api/matches-direct" \
  -H "Content-Type: application/json" \
  -d '{"messages": [...], "top_n": 5}'
```
If the Vercel proxy returns `function_invocation_timeout`, the maxDuration is too low.

### 1.7 MANDATORY: AG-UI Parallel Tool Call Stress Test

**This is a HARD REQUIREMENT. Do not skip this.**

The LLM (Groq/Llama) sometimes returns parallel tool calls that crash the Agent Framework. You MUST test with messages that force multi-dimension profile saving:

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
curl -s -N -X POST "https://brightstep-ikigai-production.up.railway.app/ag-ui" \
  -H "Content-Type: application/json" \
  -d @/tmp/multi_dim_test.json 2>&1 | timeout 60 cat
```

**Check the response for:**
- ✅ PASS: SSE stream completes with RUN_FINISHED event
- ❌ FAIL: Stream ends with "I'm sorry, I had a brief hiccup" error message
- ❌ FAIL: Stream contains `<function=...></function>` inline text (tool calls embedded as text instead of proper TOOL_CALL events)

**Run this test at least 3 times** — parallel tool call errors are stochastic (depend on which tool call IDs the LLM generates). A single passing test is NOT sufficient.

### 1.8 MANDATORY: Railway Log Audit

**This is a HARD REQUIREMENT. Do not skip this.**

After running all backend tests, check Railway logs for warnings and errors:

```bash
railway logs --tail 200 2>&1 | grep -iE "WARNING|ERROR|401|403|500|exception|Cannot add|hiccup|timeout|failed"
```

**Every warning must be investigated and categorized:**
- **401/403 errors**: Missing API keys or expired auth. Check which service is failing and verify the Railway env var is set.
- **"Cannot add function calls"**: Parallel tool call bug — `allow_multiple_tool_calls` not set to False
- **Timeout errors**: Backend taking too long — trace which operation is slow
- **Any other WARNING/ERROR**: Investigate and fix or document

**Do NOT dismiss warnings as "non-critical" without verifying.** A moderation 401 means guardrails are degraded. A timeout warning means users might see errors.

Also verify all required Railway env vars are set:
```bash
railway variables 2>&1 | grep -E "OPENAI_API_KEY|GROQ_API_KEY|EMBEDDING_BASE_URL|EMBEDDING_API_KEY|MOA_ENABLED|DATABASE_URL|LLM_"
```
Every key should show a value (not empty). Cross-reference against `.env.production.example`.

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

## Phase 2: Frontend Testing

### 2.1 Page routes
For every page discovered in Phase 0.3:
- Verify HTTP status (200, or 307 for auth-protected pages)
- Check `Content-Type` is `text/html`
- Verify no 500 errors

### 2.2 Proxy routes — timeout validation
For every proxy route discovered in Phase 0.2:
- Send the same requests as Phase 1, but through the Vercel proxy
- Compare responses to direct backend — should be identical (except headers)
- **Time each request and compare to maxDuration** (see Phase 1.6)
- Check for timeout issues (especially `/api/matches*` routes)

### 2.3 Playwright UI tests
Run the existing test suites:
```bash
cd apps/student

# Anonymous tests
npx @dotenvx/dotenvx run --env-file=.env.test -- \
  npx playwright test --config playwright.production.config.ts \
  --project=chromium-desktop \
  --grep-invert "auto-chat" --reporter=list 2>&1

# Authenticated tests
npx @dotenvx/dotenvx run --env-file=.env.test -- \
  npx playwright test --config playwright.production.config.ts \
  --project=authenticated-desktop --reporter=list 2>&1

# Auto-chat (slow, optional — run in background)
npx @dotenvx/dotenvx run --env-file=.env.test -- \
  npx playwright test --config playwright.production.config.ts \
  --grep "auto-chat" --timeout=180000 --reporter=list 2>&1
```

### 2.4 Visual review
READ screenshot files from `/tmp/prod-ui-tests/` — look for:
- Broken layouts, overlapping elements
- Missing images/icons
- Wrong colors or themes
- Error messages visible that shouldn't be
- Loading spinners stuck
- Empty sections where content should be

### 2.5 MANDATORY: Test Mode (`/?test=yes`) Verification

**This is a HARD REQUIREMENT. Do not skip this.**

Test mode (`/?test=yes`) is used for QA/demo with auto-chat personas. It MUST start with a clean slate — no stale matches, no old session data leaking in.

**What to verify (adapt commands for production URL):**
1. Visit `<PROD_URL>/?test=yes` — test panel should load with profile dropdown and "Start Chatting" button
2. **No matches shown on initial load** — the right panel should show empty state ("Your college matches"), NOT loaded match results with "programs found"
3. Visit `<PROD_URL>/` (normal mode) — test panel should NOT appear
4. If signed in, verify no stale match_runs data leaks into test mode
5. No console errors on test mode page

**Use Playwright if available:**
```bash
cd apps/student
npx @dotenvx/dotenvx run --env-file=.env.test -- \
  npx playwright test --config playwright.production.config.ts \
  --project=chromium-desktop -g "Test Mode" --reporter=list 2>&1
```

**Manual curl check:**
```bash
# Verify test mode page returns 200
curl -s -o /dev/null -w "%{http_code}" "<PROD_URL>/?test=yes"
```

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
Operation                    Time(s)   maxDuration(s)   Headroom   Status
Session create               xxx       N/A              N/A        OK/SLOW/FAIL
Message add + extraction     xxx       N/A              N/A        OK/SLOW/FAIL
Matching (direct, backend)   xxx       N/A              N/A        OK/SLOW/FAIL
Matching (direct, Vercel)    xxx       300              xxx        OK/TIGHT/FAIL
Matching (profile, backend)  xxx       N/A              N/A        OK/SLOW/FAIL
Matching (profile, Vercel)   xxx       300              xxx        OK/TIGHT/FAIL
SSE first token              xxx       N/A              N/A        OK/SLOW/FAIL
Frontend page load           xxx       N/A              N/A        OK/SLOW/FAIL
Scholarship list             xxx       N/A              N/A        OK/SLOW/FAIL
University detail            xxx       N/A              N/A        OK/SLOW/FAIL
Action plan (backend)        xxx       N/A              N/A        OK/SLOW/FAIL
Action plan (Vercel)         xxx       120              xxx        OK/TIGHT/FAIL
```
**Thresholds:**
- Backend-only: OK=<2s, SLOW=2-10s, VERY SLOW=10-60s, FAIL=>60s or error (matching gets 120s)
- Vercel proxy: TIGHT=headroom<60s, FAIL=exceeds maxDuration
- **If any Vercel route has <60s headroom, FLAG AS WARNING. If it exceeds maxDuration, FLAG AS CRITICAL.**

---

## Phase 4: Test Coverage Gap Analysis

After running all tests, identify what's NOT covered:

### 4.1 Compare endpoints vs tests
For each backend endpoint, check if there's a corresponding test (in `tests/` or `e2e/`). List gaps.

### 4.2 Compare features vs tests
For each completed feature in `features/completed/`, check if its functionality has corresponding production tests. List gaps.

### 4.3 Compare proxy routes vs tests
For each frontend proxy in `apps/student/app/api/`, check if it's tested. List gaps.

### 4.4 Write missing tests
If you find gaps that are testable via curl or Playwright, **write the test and run it**. Don't just report — fix.

For backend gaps: create a new test in the appropriate `tests/test_*.py` file.
For frontend gaps: add to the appropriate `e2e/*.spec.ts` file or create a new one.

---

## Phase 5: Environment & Infrastructure

### 5.1 Vercel env vars
```bash
cd apps/student && npx vercel env ls production 2>/dev/null
```
Cross-reference against required vars in `deployment/deployment_environment_setup.md`.

### 5.2 Railway health
Verify backend health, check version matches latest deployment.

### 5.3 Railway env var audit
```bash
railway variables 2>&1
```
Cross-reference against `.env.production.example`. **Every required key must have a value.** Flag missing or empty vars.

### 5.4 Database connectivity
Verify session CRUD works (implies DB is connected). Check if any endpoints return connection errors.

### 5.5 External API dependencies
- Embedding API (HuggingFace): verified if matching works. **Check for 503 (cold start) — if cold, wake it up and re-test.**
- GROQ API: verified if chat works
- OpenAI API: verified if guardrail moderation works (not just fallback to regex)
- Clerk API: verified if auth tests pass

---

## Phase 6: Fix & Deploy Loop (max 5 iterations)

For each issue found:

1. **Categorize**: Critical (blocks users) / Warning (degraded UX) / Info (minor)
2. **Fix what you can**:
   - Code bugs → edit source, run tests, commit
   - Missing env vars → auto-fix known values, notify for secrets
   - Missing tests → write them
   - Stale docs → update them
3. **Deploy**: `git push origin main` (triggers Vercel) + `railway up -d` (backend)
4. **Re-test**: Only the failing tests
5. **Loop** until all critical issues resolved

For issues you CANNOT fix: send a Pushover notification:
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=BrightStep: Manual Fix Needed" \
  -d "message=<what's broken and what I need from you>" \
  -d "priority=1"
```

---

## Phase 7: Documentation & Feature Review

### 7.1 Update test documentation
If you wrote new tests or found coverage gaps, update:
- `features/roadmap.md` — mark any feature status changes
- Test files themselves — add docstrings explaining coverage

### 7.2 Update deployment docs
If you found env var issues, endpoint changes, or config problems:
- `deployment/deployment_environment_setup.md`

### 7.3 Review feature status
For each feature in `features/completed/`:
- Is it actually working in production? (verified by your tests)
- If something is marked complete but broken, flag it

### 7.4 Review planned features
For each feature in `features/planned/`:
- Is it still relevant?
- Does the current production state support it as a foundation?

---

## Phase 8: Final Report

Print a comprehensive report:

```
AUTONOMOUS PRODUCTION TEST REPORT
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

FRONTEND: (N/N passed)
  [list each route and result]

PLAYWRIGHT: (N/N passed)
  Anonymous:        N/N passed
  Authenticated:    N/N passed
  Auto-chat:        PASS/FAIL/SKIPPED

DATA FLOWS: (N/N passed)
  [list each journey and result]

VERCEL TIMEOUT VALIDATION: (N/N passed)
  [for each proxy route: actual_time vs maxDuration, headroom, status]

PARALLEL TOOL CALL STRESS TEST: (N/N passed)
  Run 1: PASS/FAIL [details]
  Run 2: PASS/FAIL [details]
  Run 3: PASS/FAIL [details]

RAILWAY LOG AUDIT:
  Warnings found:    N
  Errors found:      N
  Missing env vars:  [list]
  [details of each warning/error investigated]

PERFORMANCE:
  [operation timing table with maxDuration comparison]

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
  [list with commit hashes]

DOCS UPDATED:
  [list files updated]

REMAINING ISSUES:
  [list what couldn't be auto-fixed]

VERDICT: PASS / FAIL
```

### Notify on completion:
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=BrightStep: QA Complete" \
  -d "message=<N> tests run, <N> passed, <N> issues. <VERDICT>. Check terminal." \
  -d "priority=-1"
```

---

## Reference Files
- Backend source: `src/brightstep/backends/student/app.py`
- Frontend app: `apps/student/app/`
- Proxy routes: `apps/student/app/api/*/route.ts`
- Playwright config: `apps/student/playwright.production.config.ts`
- Playwright tests: `apps/student/e2e/*.spec.ts`
- Python tests: `tests/test_*.py`
- Deployment docs: `deployment/deployment_environment_setup.md`
- Feature roadmap: `features/roadmap.md`
- Completed features: `features/completed/`
- Planned features: `features/planned/`
- Production env template: `.env.production.example`

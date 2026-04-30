---
name: overnight-qa
description: Comprehensive overnight QA — tests every feature, inspects UI visually, verifies all data flows end-to-end, fixes issues, and loops until everything works. Run this and walk away.
---

# Overnight QA: Full-Stack Test, Fix & Verify Loop

Autonomous end-to-end QA that exercises **every feature** of the BrightStep.AI student platform against the live production environment. Finds bugs, fixes them, deploys, and re-tests in a loop until everything passes.

**URLs:**
- Backend (Railway): `https://brightstep-ikigai-production.up.railway.app`
- Frontend (Vercel): `https://student-theta-teal.vercel.app`

**Philosophy:** You are a QA engineer who is fanatical about quality. You test like a real user would — clicking buttons, filling forms, reading text, checking that things appear where they should. If something looks wrong, you fix it. If you fix something, you deploy and re-test. You don't stop until EVERY feature works.

---

## Phase 0: Setup & Preflight

Initialize tracking variables and ensure tools are ready.

```bash
BACKEND_URL="https://brightstep-ikigai-production.up.railway.app"
FRONTEND_URL="https://student-theta-teal.vercel.app"
ITERATION=0
MAX_ITERATIONS=5
TOTAL_TESTS=0
TOTAL_PASS=0
TOTAL_FAIL=0
FIXES_APPLIED=""
REMAINING_ISSUES=""
```

Ensure Playwright and screenshots directory are ready:
```bash
mkdir -p /tmp/overnight-qa
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai/apps/student && npx playwright install chromium 2>&1 | tail -5
```

---

## Phase 1: Backend API Health (Direct to Railway)

Test the backend directly — if this is down, everything else will fail.

### 1.1 Health Check
```bash
curl -s --max-time 15 "$BACKEND_URL/health"
```
Expected: `{"status":"ok","service":"student-api",...}` with a `version` field.
If FAIL: check Railway logs (`railway logs 2>&1 | head -50`). Common issues:
- Missing env vars → check Railway dashboard
- Dependency error → check Dockerfile pinning
- DB connection → verify `DATABASE_URL`

### 1.2 Session CRUD
```bash
# Create
SESSION=$(curl -s --max-time 15 -X POST "$BACKEND_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"student_name":"QABot"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")
echo "Session: $SESSION"

# Read
curl -s --max-time 15 "$BACKEND_URL/api/sessions/$SESSION" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Phase: {d[\"phase\"]}, Messages: {len(d.get(\"chat_messages\",[]))}')"

# Update messages
curl -s --max-time 15 -X PUT "$BACKEND_URL/api/sessions/$SESSION/messages" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"assistant","content":"Hi!"},{"role":"user","content":"I love science and math"}]}'

# Verify messages persisted
curl -s --max-time 15 "$BACKEND_URL/api/sessions/$SESSION" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Messages after update: {len(d.get(\"chat_messages\",[]))}')"
```

### 1.3 IKIGAI Auto-Extraction Verification
After 1.2 saved messages with "I love science and math", verify extraction happened:
```bash
curl -s --max-time 15 "$BACKEND_URL/api/sessions/$SESSION" | python3 -c "
import sys,json
d=json.load(sys.stdin)
profile=d.get('partial_profile',{})
passion=profile.get('passion',{})
print(f'Passion hobbies: {passion.get(\"hobbies\",[])}')
print(f'Passion subjects: {passion.get(\"favorite_subjects\",[])}')
has_data = bool(passion.get('hobbies') or passion.get('favorite_subjects'))
print(f'IKIGAI auto-extraction: {\"PASS\" if has_data else \"FAIL\"}')"
```
If FAIL: The extraction pipeline is broken. Check `helpers.py:extract_profile_data_from_messages()` and `session_manager.py:_extract_and_sync_profile()`.

### 1.4 Multi-Dimension Extraction
Test extraction with a richer conversation covering all 4 dimensions:
```bash
cat > /tmp/qa_messages.json << 'ENDJSON'
{"messages":[
  {"role":"user","content":"I love science, especially biology and chemistry"},
  {"role":"assistant","content":"Those are great subjects! What are you good at?"},
  {"role":"user","content":"I have a 3.9 GPA and I'm good at math. I scored 1400 on the SAT."},
  {"role":"assistant","content":"Impressive! What causes do you care about?"},
  {"role":"user","content":"I want to help fight climate change and protect the environment"},
  {"role":"assistant","content":"Noble mission! What career interests you?"},
  {"role":"user","content":"I want to be a doctor or a researcher in a lab, maybe work at a hospital"}
]}
ENDJSON
curl -s --max-time 15 -X PUT "$BACKEND_URL/api/sessions/$SESSION/messages" \
  -H "Content-Type: application/json" \
  -d @/tmp/qa_messages.json

# Check all 4 dimensions extracted
curl -s --max-time 15 "$BACKEND_URL/api/sessions/$SESSION" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('partial_profile',{})
dims = {'passion': bool(p.get('passion',{})), 'talent': bool(p.get('talent',{})),
        'mission': bool(p.get('mission',{})), 'vocation': bool(p.get('vocation',{}))}
filled = sum(1 for v in dims.values() if v)
print(f'Dimensions filled: {filled}/4')
for k,v in dims.items(): print(f'  {k}: {\"PASS\" if v else \"FAIL\"}')
print(f'Multi-dim extraction: {\"PASS\" if filled >= 3 else \"FAIL\"}')"
```

### 1.5 Scholarships Endpoint
```bash
curl -s --max-time 15 "$BACKEND_URL/api/scholarships?limit=3" | python3 -c "
import sys,json
d=json.load(sys.stdin)
count=len(d.get('scholarships',[]))
print(f'Scholarships returned: {count}')
print(f'Scholarships: {\"PASS\" if count > 0 else \"FAIL\"}')"
```

### 1.6 SSE Streaming
```bash
RESPONSE=$(curl -s -N --max-time 45 \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi, I love science and want to find the best college"}]}' \
  "$BACKEND_URL/ag-ui" 2>&1 | head -30)
echo "$RESPONSE" | head -10
HAS_DATA=$(echo "$RESPONSE" | grep -c "data:" || true)
echo "SSE streaming: $([ $HAS_DATA -gt 2 ] && echo 'PASS' || echo 'FAIL') ($HAS_DATA data events)"
```

### 1.7 CORS Preflight
```bash
CORS=$(curl -s -I -X OPTIONS "$BACKEND_URL/ag-ui" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" 2>&1 | grep -i "access-control-allow-origin" || echo "MISSING")
echo "CORS: $(echo $CORS | grep -q 'student-theta-teal' && echo 'PASS' || echo 'FAIL')"
```

### 1.8 Matching (Stateless)
```bash
curl -s --max-time 90 -X POST "$BACKEND_URL/api/matches/direct" \
  -H "Content-Type: application/json" \
  -d @/tmp/match_test.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
matches=d.get('matches',[])
print(f'Matches returned: {len(matches)}')
if matches:
    m=matches[0]
    print(f'  Top match: {m.get(\"university_name\",\"?\")} - {m.get(\"program_name\",\"?\")} ({m.get(\"composite_score\",0):.1%})')
print(f'Matching: {\"PASS\" if len(matches)>=3 else \"FAIL\"}')"
```

### 1.9 User Profiles Endpoint
```bash
# Create/update a test profile
curl -s --max-time 15 -X PUT "$BACKEND_URL/api/user-profiles/qa-test-user" \
  -H "Content-Type: application/json" \
  -d '{"passion":{"hobbies":["science"]},"talent":{"gpa":3.9}}'

# Read it back
curl -s --max-time 15 "$BACKEND_URL/api/user-profiles/qa-test-user" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Profile ID: {d.get(\"id\",\"none\")}')
passion=json.loads(d['passions']) if isinstance(d.get('passions'),str) else d.get('passions',d.get('passion',{}))
print(f'Has passion data: {bool(passion)}')
print(f'User profiles: PASS')" 2>/dev/null || echo "User profiles: FAIL"
```

---

## Phase 2: Frontend Page Routes (Vercel)

Verify every page returns HTTP 200:

```bash
for ROUTE in "/" "/chat" "/matches" "/sign-in" "/sign-up" "/chat-sample" "/profile"; do
  STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "$FRONTEND_URL$ROUTE")
  echo "  $ROUTE: $([ $STATUS -eq 200 ] && echo 'PASS' || echo "FAIL ($STATUS)")"
done
```

Profile page may return 307 redirect (auth required) — that's OK, count as PASS if 200 or 307.

---

## Phase 3: Frontend API Proxy Routes (Vercel → Railway)

These verify the Next.js API routes correctly proxy to Railway.

### 3.1 Session Proxy
```bash
PROXY_SESSION=$(curl -s --max-time 15 -X POST "$FRONTEND_URL/api/session" \
  -H "Content-Type: application/json" \
  -d '{"student_name":"ProxyQA"}')
echo "Session proxy: $(echo $PROXY_SESSION | python3 -c 'import sys,json; print("PASS" if json.load(sys.stdin).get("session_id") else "FAIL")' 2>/dev/null || echo 'FAIL')"
```

### 3.2 Scholarships Proxy
```bash
PROXY_SCHOL=$(curl -s --max-time 15 "$FRONTEND_URL/api/scholarships?limit=2")
echo "Scholarships proxy: $(echo $PROXY_SCHOL | python3 -c 'import sys,json; d=json.load(sys.stdin); print("PASS" if len(d.get("scholarships",[]))>0 else "FAIL")' 2>/dev/null || echo 'FAIL')"
```

### 3.3 Test Profiles Proxy (needs GROQ_API_KEY)
```bash
PROXY_PROFILES=$(curl -s --max-time 15 "$FRONTEND_URL/api/test-profiles")
echo "Test profiles proxy: $(echo $PROXY_PROFILES | python3 -c 'import sys,json; d=json.load(sys.stdin); print("PASS" if d.get("profiles") else "SKIPPED (needs GROQ_API_KEY)")' 2>/dev/null || echo 'SKIPPED')"
```

---

## Phase 4: Playwright UI Tests (Visual + Functional)

Run the full production Playwright test suite. These test real browser interactions.

### 4.1 Core Tests (excludes slow auto-chat)
```bash
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai/apps/student && \
  npx playwright test --config playwright.production.config.ts e2e/production.spec.ts \
  --grep-invert "auto-chat" \
  --reporter=list 2>&1
```

### 4.2 Authenticated Tests (sign-in + profile + matching)
```bash
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai/apps/student && \
  npx playwright test --config playwright.production.config.ts e2e/production-authenticated.spec.ts \
  --reporter=list 2>&1
```

### 4.3 Test Mode Auto-Chat (slow, optional)
Only run if 4.1 and 4.2 all passed:
```bash
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai/apps/student && \
  npx playwright test --config playwright.production.config.ts e2e/production.spec.ts \
  --grep "auto-chat" \
  --reporter=list \
  --timeout=180000 2>&1
```

### 4.4 Visual Screenshot Review
After tests, check screenshots exist and visually review them:
```bash
ls -la /tmp/prod-ui-tests/ 2>/dev/null || echo "No screenshots found"
```

Review each screenshot for:
- **page-home.png**: Landing page renders, gradient header visible, input area present
- **chat-initial.png**: Welcome hero visible, suggestion chips present
- **chat-sent.png**: User message appears right-aligned in purple
- **chat-response.png**: Coach response appears with markdown rendering
- **matches-page.png**: Grid of match cards with scores
- **auth-sign-in.png**: Clerk sign-in form renders
- **auth-sign-up.png**: Clerk sign-up form renders

---

## Phase 5: Data Flow Verification (End-to-End)

These tests verify complete data flows across the full stack.

### 5.1 Chat → Auto-Extract → Profile (Authenticated User)
This is the critical pipeline: chat message → backend extraction → session profile → persistent profile → profile page shows data.

Use curl to simulate the full flow:
```bash
# 1. Create session with a clerk_user_id
QA_USER="qa-e2e-$(date +%s)"
E2E_SESSION=$(curl -s --max-time 15 -X POST "$BACKEND_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"student_name\":\"QA E2E\",\"clerk_user_id\":\"$QA_USER\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")
echo "E2E Session: $E2E_SESSION for user: $QA_USER"

# 2. Send messages that should trigger extraction
curl -s --max-time 15 -X PUT "$BACKEND_URL/api/sessions/$E2E_SESSION/messages" \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[
    {\"role\":\"user\",\"content\":\"I love programming and computer science\"},
    {\"role\":\"assistant\",\"content\":\"Great! What are your strengths?\"},
    {\"role\":\"user\",\"content\":\"I'm good at math and have a 4.0 GPA\"},
    {\"role\":\"assistant\",\"content\":\"Impressive! What about the world?\"},
    {\"role\":\"user\",\"content\":\"I care about making technology accessible to everyone\"},
    {\"role\":\"assistant\",\"content\":\"What career appeals to you?\"},
    {\"role\":\"user\",\"content\":\"I want to be a software engineer at a big tech company\"}
  ]}"

# 3. Check session partial_profile was populated
curl -s --max-time 15 "$BACKEND_URL/api/sessions/$E2E_SESSION" | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('partial_profile',{})
dims_filled = sum(1 for k in ['passion','talent','mission','vocation'] if p.get(k))
print(f'Session profile dims: {dims_filled}/4')
print(f'Session extraction: {\"PASS\" if dims_filled >= 2 else \"FAIL\"}')"

# 4. Check persistent profile was synced (ikigai_profiles table)
curl -s --max-time 15 "$BACKEND_URL/api/user-profiles/$QA_USER" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    has_profile = d.get('id') is not None
    print(f'Persistent profile exists: {has_profile}')
    print(f'Persistent sync: {\"PASS\" if has_profile else \"FAIL\"} ')
except:
    print('Persistent sync: FAIL (no profile created)')" 2>/dev/null
```

### 5.2 Session Claiming (Anonymous → Authenticated)
```bash
# 1. Create anonymous session with messages
ANON_SESSION=$(curl -s --max-time 15 -X POST "$BACKEND_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"student_name":"AnonUser"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")

curl -s --max-time 15 -X PUT "$BACKEND_URL/api/sessions/$ANON_SESSION/messages" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"I love art and music"},{"role":"assistant","content":"Beautiful passions!"}]}'

# 2. Claim it for a new user
CLAIM_USER="qa-claim-$(date +%s)"
CLAIM_RESULT=$(curl -s --max-time 15 -X POST "$BACKEND_URL/api/sessions/$ANON_SESSION/claim" \
  -H "Content-Type: application/json" \
  -d "{\"clerk_user_id\":\"$CLAIM_USER\"}")
echo "Claim result: $(echo $CLAIM_RESULT | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"session={d.get(\"session_id\",\"?\")}, user={d.get(\"clerk_user_id\",\"?\")}") ' 2>/dev/null || echo 'FAIL')"

# 3. Verify the claimed session has messages and correct user
curl -s --max-time 15 "$BACKEND_URL/api/sessions/by-user/$CLAIM_USER" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    msgs = len(d.get('chat_messages',[]))
    user = d.get('clerk_user_id','')
    print(f'Claimed session messages: {msgs}, user: {user}')
    print(f'Session claiming: {\"PASS\" if msgs >= 2 and user == '$CLAIM_USER' else \"FAIL\"}')
except:
    print('Session claiming: FAIL')" 2>/dev/null
```

### 5.3 Profile Save → Match
```bash
# 1. Save a rich profile for matching
MATCH_USER="qa-match-$(date +%s)"
curl -s --max-time 15 -X PUT "$BACKEND_URL/api/user-profiles/$MATCH_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "passion":{"hobbies":["programming","AI","robotics"],"favorite_subjects":["Computer Science","Mathematics"]},
    "talent":{"gpa":3.9,"skills":["Python","Machine Learning","Data Analysis"]},
    "mission":{"causes":["Technology accessibility","Education equality"]},
    "vocation":{"career_interests":["Software Engineer","AI Researcher","Data Scientist"]}
  }'

# 2. Run matching from profile
MATCH_RESULT=$(curl -s --max-time 90 -X POST "$BACKEND_URL/api/matches/profile" \
  -H "Content-Type: application/json" \
  -d "{\"clerk_user_id\":\"$MATCH_USER\",\"top_n\":10}")
echo "Profile matching: $(echo $MATCH_RESULT | python3 -c '
import sys,json
d=json.load(sys.stdin)
matches=d.get("matches",[])
print(f"PASS ({len(matches)} matches)" if len(matches)>=3 else f"FAIL ({len(matches)} matches)")
if matches:
    m=matches[0]
    print(f"  Top: {m.get(\"university_name\",\"?\")} - {m.get(\"program_name\",\"?\")} ({m.get(\"composite_score\",0):.1%})")
' 2>/dev/null || echo 'FAIL')"
```

---

## Phase 6: Environment Audit

### 6.1 Vercel Environment Variables
```bash
cd /home/noelcacnio/Documents/repo/brightstepai/brightstepai/apps/student && npx vercel env ls production 2>/dev/null
```

Cross-reference against required vars:

| # | Variable | Required? |
|---|----------|-----------|
| 1 | `STUDENT_API_URL` | YES |
| 2 | `NEXT_PUBLIC_STUDENT_API_URL` | YES |
| 3 | `APP_ENV` | YES |
| 4 | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | YES |
| 5 | `CLERK_SECRET_KEY` | YES |
| 6 | `GROQ_API_KEY` | Medium (test mode) |
| 7 | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Low |
| 8 | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Low |
| 9 | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Low |
| 10 | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Low |

Auto-fix missing non-secret vars with known values (use `printf` not `echo`):
```bash
printf 'https://brightstep-ikigai-production.up.railway.app' | npx vercel env add STUDENT_API_URL production --yes
printf 'production' | npx vercel env add APP_ENV production --yes
```

### 6.2 Railway Environment Variables
Check if CORS or SSE failed — likely Railway env vars.

Auto-fixable:
```bash
railway variables set FRONTEND_URL=https://student-theta-teal.vercel.app
```

Manual check (secrets): `DATABASE_URL`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `FRONTEND_URL`, `APP_ENV`

---

## Phase 7: Fix & Deploy Loop

**If any tests failed:**

1. **Analyze the failure** — Read error messages, logs, screenshots
2. **Identify the root cause** — Read the relevant source code
3. **Implement the fix** — Edit the code
4. **Run local tests** — `source .venv/bin/activate && python -m pytest tests/ -x -q --ignore=tests/e2e --ignore=tests/test_full_research.py --ignore=tests/test_career_mapper.py`
5. **Deploy the fix:**
   - Backend changes: `railway up -d` (NEVER `railway redeploy`)
   - Frontend changes: `git add <files> && git commit -m "fix: <description>" && git push origin main`
   - Wait 2-3 minutes for deploy
6. **Re-test only the failing tests** from Phase 1-5
7. **Increment `ITERATION`** and go back to Phase 1 if `ITERATION < MAX_ITERATIONS`

**IMPORTANT deployment rules:**
- Always use `railway up -d` for backend (rebuilds from source)
- Never use `railway redeploy --yes` (only restarts container, doesn't rebuild)
- After adding/changing `NEXT_PUBLIC_*` vars, rebuild Vercel: `cd apps/student && npx vercel --prod --yes`
- After fixing code, run local tests BEFORE deploying

---

## Phase 8: Final Comprehensive Re-Test

After all fixes are deployed, run the COMPLETE test suite one final time:

1. **All backend API tests** (Phase 1)
2. **All frontend page routes** (Phase 2)
3. **All proxy routes** (Phase 3)
4. **Full Playwright suite** (Phase 4 — all tests including auto-chat)
5. **Data flow verification** (Phase 5)

Every single test must pass. If any fail, go back to Phase 7.

---

## Phase 9: Final Report

Print a comprehensive summary:

```
=============================================================
BRIGHTSTEP.AI OVERNIGHT QA REPORT
Date: $(date)
Iterations: $ITERATION
=============================================================

BACKEND (Railway Direct)
  Health check:           PASS/FAIL
  Session CRUD:           PASS/FAIL
  IKIGAI auto-extraction: PASS/FAIL (single message)
  Multi-dim extraction:   PASS/FAIL (X/4 dimensions)
  Scholarships:           PASS/FAIL
  SSE streaming:          PASS/FAIL (N data events)
  CORS preflight:         PASS/FAIL
  Matching (stateless):   PASS/FAIL (N matches)
  User profiles:          PASS/FAIL

FRONTEND (Vercel)
  Home page (/):          PASS/FAIL
  Chat page (/chat):      PASS/FAIL
  Matches page:           PASS/FAIL
  Sign-in page:           PASS/FAIL
  Sign-up page:           PASS/FAIL
  Chat sample:            PASS/FAIL
  Profile page:           PASS/FAIL

PROXY ROUTES (Vercel → Railway)
  Session proxy:          PASS/FAIL
  Scholarships proxy:     PASS/FAIL
  Test profiles proxy:    PASS/FAIL/SKIPPED

PLAYWRIGHT UI TESTS
  Core tests:             N/M passed
  Authenticated tests:    N/M passed
  Auto-chat test:         PASS/FAIL/SKIPPED
  Screenshots:            N files saved

DATA FLOW E2E
  Chat → Extract → Profile:  PASS/FAIL
  Session claiming:           PASS/FAIL
  Profile → Match:            PASS/FAIL

ENVIRONMENT
  Vercel vars:            N/10 set correctly
  Railway vars:           PASS/FAIL

FIXES APPLIED THIS RUN:
  $FIXES_APPLIED (or "None needed")

REMAINING ISSUES:
  $REMAINING_ISSUES (or "None — all clear!")

=============================================================
VERDICT: PASS / FAIL
=============================================================
```

If VERDICT is PASS: "All features verified. Production is healthy."
If VERDICT is FAIL: List remaining issues that need manual attention and why they couldn't be auto-fixed.

---

## Appendix: Common Auto-Fixes

| Symptom | Root Cause | Auto-Fix |
|---------|-----------|----------|
| Backend health check fails | Railway deployment crashed | Check logs, fix code, `railway up -d` |
| CORS preflight missing | `FRONTEND_URL` not set in Railway | `railway variables set FRONTEND_URL=...` + `railway up -d` |
| Proxy returns 500 | `STUDENT_API_URL` missing in Vercel | `printf 'url' \| npx vercel env add STUDENT_API_URL production --yes` |
| SSE empty response | `LLM_API_KEY` missing in Railway | Report — cannot auto-fix secrets |
| Matching returns 0 results | Embedding API down or key missing | Report — cannot auto-fix secrets |
| Playwright test timeout | Slow Railway cold start | Re-run with increased timeout |
| IKIGAI extraction saves nothing | `extract_profile_data_from_messages` bug | Fix `helpers.py`, run tests, deploy |
| Profile page empty after chat | `sync_to_persistent_profile` fails | Check session_manager.py, fix, deploy |
| Sign-in page blank | Clerk env vars missing | Report — cannot auto-fix Clerk secrets |
| `railway up` succeeds but old version serves | Build failed silently | `railway deployment list`, check build logs |

## Appendix: Key Source Files

| Area | File |
|------|------|
| Chat UI | `apps/student/app/components/chat/chat-interface.tsx` |
| Profile page | `apps/student/app/profile/page.tsx` |
| Matches page | `apps/student/app/matches/page.tsx` |
| API proxy (session) | `apps/student/app/api/session/route.ts` |
| API proxy (matches) | `apps/student/app/api/matches*/route.ts` |
| API proxy (profiles) | `apps/student/app/api/user-profiles/route.ts` |
| API client | `apps/student/lib/api-client.ts` |
| Backend app | `src/brightstep/student/app.py` |
| Session manager | `src/brightstep/student/session_manager.py` |
| Extraction logic | `src/brightstep/student/helpers.py` |
| Profile merge | `src/brightstep/student/profile_merge.py` |
| IKIGAI models | `src/brightstep/models/ikigai.py` |
| Playwright prod config | `apps/student/playwright.production.config.ts` |
| Playwright prod tests | `apps/student/e2e/production.spec.ts` |
| Playwright auth tests | `apps/student/e2e/production-authenticated.spec.ts` |
| Dockerfile | `deployment/railway/Dockerfile` |

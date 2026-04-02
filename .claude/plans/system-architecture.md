# Liz System Architecture & Build Plan

## Context

Liz is a greenfield AI Property Manager platform. Currently only has `intake/samples/` (10 labeled maintenance requests) and a product readme. The user wants a full system design followed by immediately building a Streamlit "LLM Arena" prototype that compares vision-capable LLMs head-to-head on maintenance intake classification, with the ability to assign the best model to each of the four product features.

---

## Architecture Overview

```
liz/
├── packages/shared/           # Shared Pydantic schemas, enums, constants
├── apps/
│   ├── arena/                 # Phase 0: Streamlit LLM Arena prototype
│   ├── api/                   # Phase 1: FastAPI backend
│   └── mobile/                # Phase 2: React Native (Expo) app
├── intake/samples/            # [EXISTS] 10 samples -> expand to 100
├── docker-compose.yml
├── pyproject.toml             # Monorepo root
└── .env.example
```

**Stack**: Python FastAPI | React Native (Expo) | PostgreSQL | Streamlit (prototyping)
**Auth & Billing**: Clerk (user management, auth, subscriptions)
**AI Providers**: OpenAI, Anthropic, Google, Groq (vision models)
**Testing**: pytest (100% core biz logic) | Detox (mobile E2E) | Playwright (web E2E)
**Email**: AgentMail | **Vendors**: Manual landlord list for MVP

---

## Vision-Capable Models

| Provider | Model | Speed | Cost/1M input | Best For |
|----------|-------|-------|---------------|----------|
| OpenAI | `gpt-4o` | Medium | ~$2.50 | Best all-around vision (Estimator) |
| OpenAI | `gpt-4o-mini` | Fast | ~$0.15 | Budget vision tasks |
| Anthropic | `claude-sonnet-4-20250514` | Medium | ~$3.00 | Best writing (Matchmaker) |
| Anthropic | `claude-haiku-4-5-20251001` | Fast | ~$0.80 | Fast structured output |
| Google | `gemini-2.0-flash` | Very Fast | ~$0.10 | Fastest + cheapest (Gatekeeper) |
| Google | `gemini-2.5-pro` | Medium | ~$1.25 | Strong reasoning |
| Groq | `llama-4-scout-17b-16e-instruct` | Ultra Fast | ~$0.11 | Fastest inference (Ledger) |
| Groq | `llava-v1.5-7b-4096-preview` | Ultra Fast | ~$0.05 | Budget vision baseline |

**Per-Feature Model Assignment** (initial hypothesis, validated by Arena):
- **Gatekeeper** (triage): `gemini-2.0-flash` -- speed + cost
- **Estimator** (vision analysis): `gpt-4o` -- best vision accuracy
- **Matchmaker** (work orders): `claude-sonnet-4-20250514` -- best writing
- **Ledger** (data summary): `llama-4-scout-17b-16e-instruct` -- fastest

---

## Folder Structure

### Shared Package (`packages/shared/`)
```
packages/shared/liz_shared/
├── schemas/          # Pydantic models: intake.py, property.py, vendor.py, ticket.py, model_registry.py
├── enums.py          # Category, Urgency, TicketStatus
└── constants.py
```

### Arena App (`apps/arena/`) -- PHASE 0, BUILD FIRST
```
apps/arena/
├── pyproject.toml
├── arena/
│   ├── app.py                    # Streamlit entry point
│   ├── components/
│   │   ├── sample_browser.py     # Col 1: browse intake/samples, show message + photos
│   │   ├── model_selector.py     # Col 2: checkboxes per provider (OpenAI/Anthropic/Google/Groq)
│   │   ├── results_grid.py       # Col 3+: side-by-side LLM outputs, color-coded accuracy
│   │   └── model_assignment.py   # Assign best model per feature, save to config
│   ├── services/
│   │   ├── sample_loader.py      # Load intake.json + photos from disk
│   │   ├── llm_runner.py         # Run classification across selected LLMs (async)
│   │   ├── providers/            # Provider implementations (reused by API later)
│   │   │   ├── base.py           # BaseLLMProvider ABC
│   │   │   ├── openai.py
│   │   │   ├── anthropic.py
│   │   │   ├── google.py
│   │   │   └── groq.py
│   │   └── scorer.py             # Score outputs vs ground truth
│   └── config/
│       └── models.yaml           # Model catalog + feature assignments
└── tests/
    ├── test_sample_loader.py
    ├── test_llm_runner.py
    └── test_scorer.py
```

### API Backend (`apps/api/`) -- PHASE 1
```
apps/api/api/
├── main.py                       # FastAPI app factory
├── config.py                     # pydantic-settings
├── core/
│   ├── ai/
│   │   ├── registry.py           # ModelRegistry (catalog + per-feature assignments)
│   │   ├── providers/            # Ported from arena
│   │   └── feature_config.py     # FeatureModelConfig persistence
│   ├── auth/
│   │   ├── clerk.py              # Clerk JWT verification, user sync
│   │   ├── deps.py               # get_current_user dependency (verifies Clerk session)
│   │   └── subscriptions.py      # Clerk subscription tier checks, feature gating
│   ├── db/
│   │   ├── session.py            # async SQLAlchemy
│   │   └── models.py             # ORM models
│   └── email/
│       └── agentmail.py          # AgentMail integration
├── features/
│   ├── gatekeeper/               # Triage + troubleshooting
│   │   ├── router.py, service.py, prompts.py, schemas.py
│   │   └── tests/
│   ├── estimator/                # Vision AI + cost estimates
│   │   ├── router.py, service.py, prompts.py, schemas.py
│   │   └── tests/
│   ├── matchmaker/               # Vendor dispatch + work orders
│   │   ├── router.py, service.py, prompts.py, schemas.py
│   │   └── tests/
│   └── ledger/                   # Operations dashboard
│       ├── router.py, service.py, schemas.py
│       └── tests/
└── admin/                        # Model registry admin endpoints
    ├── router.py
    └── tests/
```

### Mobile App (`apps/mobile/`) -- PHASE 2
```
apps/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Clerk-powered auth screens
│   │   ├── sign-in.tsx           # Clerk SignIn component
│   │   └── sign-up.tsx           # Clerk SignUp component
│   └── (tabs)/
│       ├── index.tsx             # Dashboard (Ledger)
│       ├── tickets/              # Gatekeeper + Estimator
│       ├── vendors/              # Matchmaker
│       └── settings/
├── features/                     # Feature modules with colocated tests
│   ├── gatekeeper/
│   │   ├── components/, hooks/, api.ts
│   │   └── __tests__/
│   ├── estimator/
│   ├── matchmaker/
│   └── ledger/
└── e2e/                          # Detox + Playwright E2E tests
    ├── detox.config.js
    ├── playwright.config.ts
    └── *.e2e.ts
```

---

## Auth & Subscriptions (Clerk)

**Why Clerk**: Handles auth (email/password, OAuth, MFA), user management, org/team support, and subscription billing out of the box. No custom auth tables needed -- Clerk is the source of truth for users.

### Integration Points

**Backend (FastAPI)**:
- `core/auth/clerk.py` -- Verifies Clerk JWT tokens on every request using Clerk's Python SDK
- `core/auth/deps.py` -- FastAPI dependency `get_current_user` extracts Clerk user ID from JWT, syncs to local `landlords` table on first request
- `core/auth/subscriptions.py` -- Checks Clerk metadata for subscription tier, gates features accordingly
- All feature endpoints require Clerk auth (except webhooks)

**Frontend (React Native)**:
- `@clerk/clerk-expo` SDK for sign-in/sign-up screens, session management
- `useAuth()` hook provides JWT for API calls
- `useUser()` for profile, `useOrganization()` for team/property management

**Subscription Tiers** (managed in Clerk dashboard):
- **Tier 1** ($19/unit): Self-serve AI -- Gatekeeper + Estimator only
- **Tier 2** ($49/unit): AI + Vendor Network -- adds Matchmaker
- **Tier 3** (1% monthly rent): Full Autopilot -- all features + priority support

**User Sync Flow**:
1. User signs up via Clerk (mobile or web)
2. Clerk webhook `user.created` fires -> API creates `landlords` row with `clerk_user_id`
3. Subsequent API requests verify Clerk JWT -> resolve to local landlord record
4. Subscription changes via Clerk webhook `user.updated` -> update tier in local DB

### Webhook Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/webhooks/clerk` | Clerk webhook receiver (user.created, user.updated, session.created) |

---

## Key API Endpoints

All endpoints below require Clerk JWT auth (header: `Authorization: Bearer <clerk_session_token>`).

| Feature | Method | Path | Description |
|---------|--------|------|-------------|
| Gatekeeper | POST | `/api/v1/gatekeeper/triage` | Classify message + photos |
| Gatekeeper | POST | `/api/v1/gatekeeper/triage/{id}/approve` | Landlord approves ticket |
| Estimator | POST | `/api/v1/estimator/analyze` | Vision AI damage + cost estimate |
| Matchmaker | POST | `/api/v1/matchmaker/draft-work-order/{id}` | AI drafts work order (Tier 2+) |
| Matchmaker | POST | `/api/v1/matchmaker/work-order/{id}/approve` | Approve & send to vendor (Tier 2+) |
| Ledger | GET | `/api/v1/ledger/dashboard` | Spend vs rent data |
| Admin | GET/PUT | `/api/v1/admin/models/assignments` | View/update model assignments |
| Webhooks | POST | `/api/v1/webhooks/clerk` | Clerk event webhooks (no auth, signature verified) |

---

## Database (PostgreSQL) -- Key Tables

- `landlords` -- Core user table, linked to Clerk via `clerk_user_id` + `subscription_tier`
- `properties`, `units`, `tenants` -- Property entities
- `maintenance_tickets` -- Tenant message, AI triage output, status, model_used
- `ticket_photos` -- Uploaded photos linked to tickets
- `cost_estimates` -- AI damage analysis + cost range
- `vendors` -- Manual landlord-maintained vendor list
- `work_orders` -- AI-drafted, landlord-approved work orders
- `model_catalog` -- All registered LLM models
- `feature_model_assignments` -- Which model is assigned to each feature
- `arena_runs` / `arena_results` -- Evaluation history
- `communications` -- AgentMail email log

---

## Build Order

### Phase 0: Arena Prototype (IMMEDIATE)
1. Project scaffolding: `pyproject.toml`, `.gitignore`, `.env.example`, `packages/shared/`
2. Build `apps/arena/` Streamlit app with all 4 provider integrations
3. Expand samples from 10 to 100 (Sonnet task -- creative generation, evenly distributed)
4. Run arena evaluations, determine per-feature model assignments

### Phase 1: Backend API (after Arena validates AI pipeline)
5. Docker Compose + PostgreSQL + Alembic migrations
6. FastAPI skeleton + Clerk auth integration (JWT verification, webhook receiver, user sync)
7. ModelRegistry (port providers from Arena)
8. Gatekeeper feature + AgentMail
9. Estimator feature (photo upload + vision)
10. Matchmaker feature (vendor CRUD + work orders) -- gated to Tier 2+
11. Ledger feature (aggregation queries)

### Phase 2: Mobile App (after API is functional)
12. Expo + React Native setup with `@clerk/clerk-expo` for auth
13. Build screens per feature (subscription-gated UI)
14. E2E tests (Playwright web + Detox mobile)

### Phase 3: Polish & Deploy
15. CI/CD (GitHub Actions)
16. Docker production builds
17. Configure Clerk production instance (subscription tiers, webhooks, OAuth providers)
18. Deploy API (Railway/Fly.io), mobile (Expo EAS)

---

## Samples Expansion (10 -> 100)

**Strategy**: Sonnet-level task (creative content generation, not complex reasoning)
- 7 categories x ~14-15 samples each = ~100
- Mix urgency levels within each category (low, medium, emergency)
- Realistic tenant messages with varying detail levels
- JSON-only (no real photos needed for evaluation -- Arena uses text + existing photo patterns)
- Source attribution can be synthetic

---

## Verification

After Arena is built:
1. `cd apps/arena && streamlit run arena/app.py` -- UI loads, samples browse, models selectable
2. Select samples + models, click "Run Arena" -- LLM calls execute, results appear side-by-side
3. Accuracy scores match ground truth comparison
4. Model assignment saves to `config/models.yaml`
5. `pytest apps/arena/tests/` -- All unit tests pass

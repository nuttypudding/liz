# Feature: Clerk Auth

**ID**: P1-002
**Ticket**: T-003
**Phase**: 1 — MVP

## Implementation Progress

> **Legend**: `[DONE]` = built and compiling, skip when generating tasks. `[TODO]` = needs work, generate tasks for these.

| Area | Status | Notes |
|------|--------|-------|
| `@clerk/nextjs` v7 installed | [DONE] | `apps/web/package.json` |
| `ClerkProvider` in root layout | [DONE] | `app/layout.tsx` wraps entire app |
| Sign-in / sign-up pages | [DONE] | `(auth)/sign-in`, `(auth)/sign-up` using Clerk components |
| Auth layout (centered card) | [DONE] | `(auth)/layout.tsx` |
| `middleware.ts` with role routing | [DONE] | Public routes, role-based redirects |
| `lib/clerk.ts` helpers | [DONE] | `getRole()`, `requireRole()` — read from `sessionClaims.metadata` |
| API routes use `auth()` | [DONE] | All 14 routes call `auth()` for userId |
| Clerk webhook (user.created) | [DONE] | `/api/webhook/clerk/route.ts` — svix-verified, syncs tenant by email |
| `.env.local` with dev keys | [DONE] | Clerk pk_test + sk_test configured |
| `.env.example` template | [DONE] | Placeholder values for all Clerk vars |
| Clerk webhook secret | [DONE] | `CLERK_WEBHOOK_SECRET` in `.env.local` |
| `svix` installed | [DONE] | Webhook signature verification |
| Clerk dashboard role metadata setup | [TODO] | No documentation on how roles get assigned |
| Role selection during sign-up | [TODO] | Users currently get no role — must be set manually |
| `.env.local` documentation | [TODO] | No guide on what each var does or how to obtain keys |
| Subscription/billing via Clerk | [TODO] | No billing setup, no plan gates |
| Production Clerk instance | [TODO] | Only dev keys exist |
| Error handling for auth failures | [TODO] | No error pages, no graceful degradation |
| Session edge cases | [TODO] | No handling for expired sessions, revoked tokens |
| Protected API route pattern (standardized) | [TODO] | Each route duplicates auth boilerplate |
| RLS / access control documentation | [TODO] | Pattern exists but undocumented |
| Token refresh / session management | [TODO] | Clerk handles this but behavior is untested |
| Onboarding redirect for new users | [DONE] | Dashboard checks `landlord_profiles` table |
| `UserButton` in headers | [DONE] | Present in landlord sidebar + tenant header |

## TL;DR

Complete Clerk authentication setup: role assignment during sign-up, subscription billing for landlords, standardized auth error handling, production configuration guide, and a reusable protected-route pattern that eliminates boilerplate from all 14+ API routes.

## Summary

Clerk is already integrated as the auth provider — `@clerk/nextjs` v7 is installed, middleware does role-based routing, API routes call `auth()`, and the webhook syncs tenant users to Supabase. But the critical gap is **role assignment**: there is currently no mechanism for a new user to choose whether they are a landlord or a tenant. The role field in `sessionClaims.metadata` is never set automatically.

This feature closes that gap and completes the auth layer:

1. **Role selection flow** — A post-sign-up interstitial page where new users pick "I'm a Landlord" or "I'm a Tenant". The selection is written to Clerk `publicMetadata.role` via an API route that calls Clerk's Backend API.
2. **Subscription billing** — Landlords are gated by a subscription plan (free tier for beta, paid tiers later). Clerk Billing manages plans. Tenants have no billing requirement.
3. **Auth error handling** — Dedicated error pages for unauthorized access, expired sessions, and generic auth failures.
4. **Standardized auth helper** — A `withAuth()` wrapper that eliminates the repeated `auth()` + null-check + role-check boilerplate across all API routes.
5. **Production readiness** — Documentation for Clerk dashboard configuration, production key rotation, and environment variable setup.

## User Stories

### New User (No Role Yet)
- As a new user, I want to choose whether I'm a landlord or tenant during sign-up so the app knows what to show me.
- As a new user, I want the role selection to be simple and visual (two big cards) so it takes under 5 seconds.
- As a new user, if I pick "Landlord" I want to be sent to onboarding; if I pick "Tenant" I want to be sent to the submit page.

### Landlord
- As a landlord, I want to manage my subscription plan from a billing page so I can see what I'm paying for.
- As a landlord on a free plan, I want core features to work without a credit card so I can try the product first.
- As a landlord, I want to see my current plan and usage on the settings page.

### Tenant
- As a tenant, I want to sign up with just email and password — no billing, no complicated setup.
- As a tenant, I want to be automatically linked to my landlord's property if my email matches.

### All Users
- As a user, I want to see a clear error page if I try to access something I'm not authorized for.
- As a user, I want to be redirected to sign-in if my session expires, not see a blank screen.
- As a user, I want the sign-in/sign-up pages to match the app's visual style.

## Architecture

```
Sign Up (Clerk <SignUp />)
    │
    ▼
Role Selection Page (/role-select)
    │
    ├── User picks "I'm a Landlord"
    │   │
    │   ▼
    │   POST /api/auth/set-role { role: "landlord" }
    │     │ → Clerk Backend API: update publicMetadata.role
    │     │ → Supabase: insert landlord_profiles row (defaults)
    │     │ → Return { redirect: "/onboarding" }
    │     ▼
    │   Redirect → /onboarding (from P1-003)
    │
    └── User picks "I'm a Tenant"
        │
        ▼
        POST /api/auth/set-role { role: "tenant" }
          │ → Clerk Backend API: update publicMetadata.role
          │ → Supabase: try to match email to existing tenant row
          │ → Return { redirect: "/submit" }
          ▼
        Redirect → /submit


Session Flow:
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser     │────▶│  Clerk Middleware │────▶│  Next.js Route  │
│  (cookie)    │     │  (middleware.ts)  │     │  (page or API)  │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │                         │
                    Checks session              Uses auth()
                    Reads role from              Gets userId
                    sessionClaims               Gets role
                           │                         │
                    No role? ──────▶ /role-select     │
                    No session? ──▶ /sign-in          │
                    Wrong role? ──▶ /unauthorized      │
                                                      ▼
                                              Queries Supabase
                                              (service role key,
                                               filtered by userId)


Billing Flow (Landlords Only):
┌──────────────────┐     ┌────────────────┐     ┌──────────────────┐
│  /billing page   │────▶│  Clerk Billing │────▶│  Plan metadata   │
│  (landlord only) │     │  (hosted UI)   │     │  on Clerk user   │
└──────────────────┘     └────────────────┘     └──────────────────┘
                                │
                         Manages subscriptions,
                         payment methods,
                         invoices
```

### New Routes

```
apps/web/app/
├── (auth)/
│   └── role-select/page.tsx         — Post-signup role picker (NEW)
├── (landlord)/
│   └── billing/page.tsx             — Subscription management (NEW)
├── unauthorized/page.tsx            — "You don't have access" (NEW)
└── api/
    └── auth/
        └── set-role/route.ts        — Set publicMetadata.role (NEW)
```

### Modified Routes

```
apps/web/
├── middleware.ts                     — Add /role-select to flow, no-role redirect
├── lib/clerk.ts                     — Add withAuth() helper, setUserRole()
└── app/(landlord)/settings/page.tsx — Add billing/plan summary card
```

## Tech Approach

### 1. Role Assignment via Clerk publicMetadata

Clerk stores custom data on users via `publicMetadata` (server-writable, client-readable). The role lives at `publicMetadata.role`. This is already read in `middleware.ts` from `sessionClaims.metadata.role`.

**How it gets set**: After sign-up, the user lands on `/role-select`. They pick a role. The page calls `POST /api/auth/set-role` which uses Clerk's Backend API (`clerkClient.users.updateUser()`) to set `publicMetadata.role`.

**Why not a Clerk custom field during sign-up?** Clerk's built-in `<SignUp />` component supports custom fields, but role selection is better as a distinct step:
- It allows custom UI (large tappable cards with icons, not a dropdown)
- It avoids coupling the flow to Clerk's component customization API
- It makes the tenant vs landlord distinction visually prominent

**Session refresh after role set**: After setting `publicMetadata.role`, the user's session claims must be refreshed. Clerk v7 handles this via `clerk.session.reload()` on the client, which fetches updated claims without requiring a full sign-out/sign-in.

### 2. Middleware Enhancement

Current middleware handles:
- Public routes (sign-in, sign-up, webhooks)
- Role-based redirects (tenant pages, landlord pages)

New behavior:
- `/role-select` added to public-ish routes (requires auth but not a role)
- If authenticated but no role → redirect to `/role-select`
- If authenticated with role but wrong route → redirect to `/unauthorized`

```
middleware.ts flow (updated):

1. Is public route? → pass through
2. Not authenticated? → auth.protect() redirects to /sign-in
3. Authenticated but no role? → redirect to /role-select
4. Has role, on /role-select? → redirect to role's home
5. Role mismatch? → redirect to /unauthorized
6. Pass through
```

### 3. Clerk Billing for Landlords

Clerk Billing (introduced in Clerk v5+) provides:
- Plan definitions in the Clerk dashboard
- Hosted billing portal (checkout, manage subscription, invoices)
- Plan metadata accessible via `sessionClaims` or `auth()`
- Usage-based or flat-rate pricing

**MVP plan structure**:

| Plan | Price | Limits | Gate |
|------|-------|--------|------|
| Free (Beta) | $0/mo | 3 properties, 20 requests/mo | None during beta |
| Starter | $19/mo | 10 properties, 100 requests/mo | After beta ends |
| Pro | $49/mo | Unlimited properties + requests | After beta ends |

For MVP: all landlords get "Free (Beta)" with no hard gates. The billing page shows plan info and a "Manage Subscription" button that opens Clerk's hosted billing portal. Actual enforcement (hard request limits) is Phase 2.

**Billing page approach**: A simple card showing current plan + a button to open Clerk's billing portal. No custom payment forms.

### 4. Standardized Auth Helper — `withAuth()`

Every API route currently repeats this pattern:

```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const role = await getRole();
if (role !== "landlord") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

The `withAuth()` helper wraps this:

```typescript
// lib/clerk.ts
export function withAuth(
  handler: (userId: string, role: "landlord" | "tenant") => Promise<NextResponse>,
  options?: { requiredRole?: "landlord" | "tenant" }
): () => Promise<NextResponse> {
  return async () => {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getRole();
    if (!role) {
      return NextResponse.json({ error: "No role assigned" }, { status: 403 });
    }

    if (options?.requiredRole && role !== options.requiredRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(userId, role);
  };
}
```

Usage:
```typescript
export const GET = withAuth(async (userId) => {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("properties").select("*").eq("landlord_id", userId);
  return NextResponse.json({ properties: data });
}, { requiredRole: "landlord" });
```

This eliminates ~10 lines of boilerplate per route handler. Existing routes are not refactored in this feature — the helper is created and new routes use it. A follow-up chore task can refactor existing routes.

### 5. Error Pages

Three new pages for auth error states:

- `/unauthorized` — "You don't have permission to view this page." with a "Go to Dashboard" / "Go Home" button
- `/role-select` — Not technically an error, but handles the "no role" state gracefully
- Sign-in redirect — Clerk already handles this via `auth.protect()` in middleware

For expired/invalid sessions, Clerk's middleware automatically redirects to sign-in. No custom page needed.

### 6. Production Configuration

A documented checklist for production Clerk setup:

1. Create production Clerk instance in dashboard
2. Set production API keys in Vercel environment variables
3. Configure allowed redirect URLs (production domain)
4. Set up Clerk webhook endpoint for production URL
5. Configure OAuth providers (Google, Apple) for production
6. Set up Clerk Billing plans
7. Enable rate limiting on sign-up

This is documented in the feature's task, not as a code change.

## UI Development Process

### Role Selection Page — `/role-select`

**When it appears**: Immediately after sign-up (or sign-in for users who somehow have no role). Clerk's `<SignUp />` completes → Clerk redirects to the app → middleware detects no role → redirects to `/role-select`.

**Layout**: Uses the same `(auth)` centered card layout. No sidebar, no navigation. Clean, focused page.

**Design principles**:
- Two large tappable cards, nothing else. Zero cognitive load.
- Each card has an icon, title, and one-sentence description.
- Tapping a card immediately triggers the API call and redirect. No "Next" button.
- Mobile-first: cards stack vertically on mobile, sit side-by-side on tablet+.

#### Screen Design

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              [Liz logo/wordmark]                │
│                                                 │
│           Welcome! Tell us about you.           │
│        This helps us set up your experience.    │
│                                                 │
│  ┌───────────────────┐  ┌───────────────────┐  │
│  │                   │  │                   │  │
│  │    [Building]     │  │  [Key/Home icon]  │  │
│  │                   │  │                   │  │
│  │  I'm a Landlord   │  │  I'm a Tenant    │  │
│  │                   │  │                   │  │
│  │  I manage rental  │  │  I rent a unit   │  │
│  │  properties       │  │  and need to     │  │
│  │                   │  │  submit requests  │  │
│  │                   │  │                   │  │
│  └───────────────────┘  └───────────────────┘  │
│                                                 │
│       ──────────── or ────────────              │
│                                                 │
│  Already have a Clerk account with a role?      │
│  [Sign out and try again]                       │
│                                                 │
└─────────────────────────────────────────────────┘

Mobile (< 640px):
┌──────────────────────────┐
│                          │
│    [Liz logo/wordmark]   │
│                          │
│  Welcome! Tell us        │
│  about you.              │
│                          │
│  ┌────────────────────┐  │
│  │    [Building]      │  │
│  │  I'm a Landlord    │  │
│  │  I manage rental   │  │
│  │  properties        │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │  [Key/Home icon]   │  │
│  │  I'm a Tenant      │  │
│  │  I rent a unit and │  │
│  │  need to submit    │  │
│  │  requests          │  │
│  └────────────────────┘  │
│                          │
└──────────────────────────┘
```

#### Component Hierarchy

```
RoleSelectPage (apps/web/app/(auth)/role-select/page.tsx)
│   Uses (auth) layout — centered card, no nav
│
├── Page heading
│   ├── App logo or wordmark (text)
│   ├── h1: "Welcome! Tell us about you."
│   └── p: "This helps us set up your experience."
│
├── Role cards container (grid: 1 col mobile, 2 col sm+)
│   ├── RoleCard (landlord)
│   │   ├── Icon: Building (lucide-react)
│   │   ├── Title: "I'm a Landlord"
│   │   ├── Description: "I manage rental properties"
│   │   └── onClick → POST /api/auth/set-role + redirect
│   │
│   └── RoleCard (tenant)
│       ├── Icon: Key (lucide-react)
│       ├── Title: "I'm a Tenant"
│       ├── Description: "I rent a unit and need to submit requests"
│       └── onClick → POST /api/auth/set-role + redirect
│
├── Loading state (spinner overlay when role is being set)
│
└── Footer link: "Sign out" (clears session, returns to /sign-in)
```

#### shadcn Components Needed

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Role option cards |
| `button` | Installed | Card tap target, sign-out link |
| `sonner` | Installed | Error toast if API call fails |
| `skeleton` | Installed | Loading state |

No new shadcn components needed for this page.

#### RoleCard Component

```
RoleCard (components/auth/role-card.tsx)
├── Props: { icon: LucideIcon, title: string, description: string, onClick: () => void, loading: boolean, disabled: boolean }
├── Renders: Card with hover/active states
│   ├── hover: scale(1.02) + border-primary/50 + shadow-md
│   ├── active: scale(0.98)
│   ├── disabled: opacity-50, pointer-events-none
│   └── loading: spinner overlay
└── Full card is clickable (button semantics, not anchor)
```

#### User Flow

```
1. User completes Clerk sign-up
2. Clerk redirects to "/" (or configured afterSignUpUrl)
3. middleware.ts detects: authenticated + no role
4. middleware.ts redirects to /role-select
5. User sees two cards: Landlord / Tenant
6. User taps a card
7. Card shows loading spinner
8. POST /api/auth/set-role { role: "landlord" | "tenant" }
9. API sets publicMetadata.role via Clerk Backend API
10. API creates landlord_profiles row (if landlord) or links tenant (if tenant)
11. Client calls clerk.session.reload() to refresh claims
12. Client redirects:
    - Landlord → /onboarding (if onboarding not completed) or /dashboard
    - Tenant → /submit
```

### Billing Page — `/billing`

**Who sees it**: Landlords only. Accessible from the settings page or sidebar.

**Layout**: Uses the `(landlord)` layout with sidebar navigation. Standard content page.

**Design**: Minimal MVP page. One card showing current plan, one button to open Clerk's billing portal. No custom payment forms.

#### Screen Design

```
┌─────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Billing                                  │
│             │                                           │
│  Dashboard  │  ┌─────────────────────────────────────┐  │
│  Requests   │  │ Current Plan                         │  │
│  Properties │  │                                      │  │
│  Vendors    │  │  ┌─────────┐                         │  │
│  Settings   │  │  │  FREE   │  Free (Beta)            │  │
│  Billing ●  │  │  │  BETA   │                         │  │
│             │  │  └─────────┘  You're on the free     │  │
│             │  │               beta plan.              │  │
│             │  │                                      │  │
│             │  │  Properties: 2 / 3                   │  │
│             │  │  Requests this month: 8 / 20         │  │
│             │  │                                      │  │
│             │  │  [Manage Subscription]               │  │
│             │  └─────────────────────────────────────┘  │
│             │                                           │
│             │  ┌─────────────────────────────────────┐  │
│             │  │ Available Plans                      │  │
│             │  │                                      │  │
│             │  │  Starter — $19/mo                    │  │
│             │  │  10 properties, 100 requests/mo      │  │
│             │  │  [Coming soon]                       │  │
│             │  │                                      │  │
│             │  │  Pro — $49/mo                        │  │
│             │  │  Unlimited properties + requests     │  │
│             │  │  [Coming soon]                       │  │
│             │  └─────────────────────────────────────┘  │
│             │                                           │
└─────────────┴───────────────────────────────────────────┘

Mobile:
┌──────────────────────────┐
│  Billing              ☰  │
│                          │
│  ┌────────────────────┐  │
│  │ Current Plan       │  │
│  │                    │  │
│  │  FREE BETA         │  │
│  │  Free (Beta)       │  │
│  │                    │  │
│  │  Properties: 2/3   │  │
│  │  Requests: 8/20    │  │
│  │                    │  │
│  │  [Manage Sub]      │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ Available Plans    │  │
│  │ ...                │  │
│  └────────────────────┘  │
│                          │
│  [Dashboard] [Submit]    │
│  [Properties] [Vendors]  │
└──────────────────────────┘
```

#### Component Hierarchy

```
BillingPage (apps/web/app/(landlord)/billing/page.tsx)
├── PageHeader ("Billing")
├── CurrentPlanCard (components/billing/current-plan-card.tsx)
│   ├── Badge: plan name (e.g., "FREE BETA")
│   ├── Plan description text
│   ├── Usage bars
│   │   ├── Progress: properties used / limit
│   │   └── Progress: requests this month / limit
│   └── Button: "Manage Subscription" → opens Clerk billing portal
│
└── AvailablePlansCard (components/billing/available-plans-card.tsx)
    ├── PlanTier (Starter)
    │   ├── Name, price, limits
    │   └── Badge: "Coming soon" (disabled)
    └── PlanTier (Pro)
        ├── Name, price, limits
        └── Badge: "Coming soon" (disabled)
```

#### shadcn Components Needed

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Plan cards |
| `badge` | Installed | Plan name, "Coming soon" |
| `button` | Installed | Manage subscription |
| `progress` | Installed | Usage bars |
| `separator` | Installed | Between plan tiers |

No new shadcn components needed.

### Unauthorized Page — `/unauthorized`

**When it appears**: When middleware detects a role mismatch (e.g., tenant tries to access `/dashboard` via direct URL entry after middleware redirect fails, or a deep-linked URL).

**Layout**: Standalone page, no sidebar or nav. Centered content.

#### Screen Design

```
┌──────────────────────────────────────┐
│                                      │
│          [ShieldAlert icon]          │
│                                      │
│       Access Denied                  │
│                                      │
│  You don't have permission to        │
│  view this page.                     │
│                                      │
│  [Go to Dashboard]  [Sign Out]       │
│                                      │
└──────────────────────────────────────┘
```

#### Component Hierarchy

```
UnauthorizedPage (apps/web/app/unauthorized/page.tsx)
├── Centered container (same pattern as auth layout)
├── Icon: ShieldAlert (lucide-react), large, muted color
├── h1: "Access Denied"
├── p: "You don't have permission to view this page."
├── Button group
│   ├── Button (primary): "Go to Dashboard" → redirects based on role
│   └── Button (outline): "Sign Out" → clerk signOut
└── No sidebar, no nav — standalone page
```

#### shadcn Components Needed

| Component | Status | Use |
|-----------|--------|-----|
| `button` | Installed | Action buttons |
| `card` | Installed | Container |

### Settings Page Update

The existing settings page at `/settings` gets a small addition: a "Plan & Billing" card that shows the current plan name and a link to `/billing`.

```
Existing SettingsPage
├── PageHeader ("Settings")
├── Tabs (AI Preferences, Notifications)    [EXISTS]
├── Re-run onboarding card                  [EXISTS]
├── Plan & Billing card                     [NEW]
│   ├── "Current plan: Free (Beta)"
│   └── Link: "Manage billing →" → /billing
└── Save button                             [EXISTS]
```

## Data Model

### No New Tables

This feature does not create new database tables. The `landlord_profiles` table (from P1-003) already stores the landlord's profile with `onboarding_completed`. The Clerk user's `publicMetadata.role` is the single source of truth for role.

### Clerk User Metadata Schema

Clerk's `publicMetadata` (server-writable, client-readable via session claims):

```typescript
// User.publicMetadata shape
interface ClerkPublicMetadata {
  role: "landlord" | "tenant";
}
```

This is read in middleware via `sessionClaims.metadata.role` and in API routes via `getRole()`.

### Clerk Billing Metadata

When Clerk Billing is active, plan info is available on the session:

```typescript
// Available via auth() or useAuth()
interface ClerkBillingMetadata {
  plan?: {
    id: string;
    name: string;       // "free_beta" | "starter" | "pro"
    status: string;     // "active" | "canceled" | "trialing"
  };
}
```

For MVP, this is informational only. No hard gates.

### TypeScript Types

```typescript
// lib/types.ts additions

export type UserRole = "landlord" | "tenant";

export interface SetRoleRequest {
  role: UserRole;
}

export interface SetRoleResponse {
  success: boolean;
  redirect: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  limits: {
    properties: number;
    requests_per_month: number;
  };
  status: "active" | "coming_soon";
}

export interface BillingUsage {
  properties_count: number;
  properties_limit: number;
  requests_this_month: number;
  requests_limit: number;
  plan: BillingPlan;
}
```

### Zod Validation Schemas

```typescript
// lib/validations.ts additions

export const setRoleSchema = z.object({
  role: z.enum(["landlord", "tenant"]),
});
```

## Integration Points

### 1. Middleware (`middleware.ts`)

The middleware is the central auth enforcement point. Changes:

```
Current flow:
  public route? → pass
  not authed? → auth.protect() → /sign-in
  role check → redirect

New flow:
  public route? → pass
  /role-select? → require auth but not role
  not authed? → auth.protect() → /sign-in
  no role? → redirect to /role-select
  role mismatch? → redirect to /unauthorized
  has role + correct route? → pass
```

Key: `/role-select` must be accessible to authenticated users without a role. It is not a "public" route (requires auth) but it is a "pre-role" route.

### 2. Clerk Backend API (`/api/auth/set-role`)

Uses `@clerk/nextjs/server`'s `clerkClient()` to update user metadata:

```typescript
import { clerkClient } from "@clerk/nextjs/server";

const client = await clerkClient();
await client.users.updateUser(userId, {
  publicMetadata: { role },
});
```

This is a server-only operation. The client cannot write to `publicMetadata`.

### 3. Clerk Webhook Enhancement

The existing webhook at `/api/webhook/clerk/route.ts` handles `user.created`. For billing:
- Add handling for `user.updated` events (plan changes)
- Add handling for `subscription.created` / `subscription.updated` events (if Clerk Billing emits them)

For MVP, the webhook change is minimal — just logging subscription events. Actual enforcement is Phase 2.

### 4. Clerk `<SignUp />` afterSignUpUrl

Clerk's `<SignUp />` component can be configured with `afterSignUpUrl` to redirect after sign-up:

```typescript
<SignUp afterSignUpUrl="/role-select" />
```

This replaces the current default redirect to "/".

### 5. Sidebar Navigation

Add "Billing" to the landlord sidebar nav (`components/layout/app-sidebar.tsx`), below "Settings".

### 6. Session Reload After Role Set

After the `/api/auth/set-role` call succeeds, the client must reload the session to pick up the new `publicMetadata`:

```typescript
import { useClerk } from "@clerk/nextjs";

const { session } = useClerk();
await session?.reload();
// Now sessionClaims.metadata.role is set
```

### 7. Existing API Routes (Informational)

All 14 existing API routes already call `auth()` and use `getRole()`. They will work correctly once roles are assigned. No changes needed to existing routes for this feature, though a follow-up chore could refactor them to use `withAuth()`.

## Manual Testing Checklist

### Sign-Up Flow (New User)
- [ ] Sign up with email + password — Clerk sign-up completes
- [ ] After sign-up, redirected to `/role-select` (not "/" or "/dashboard")
- [ ] `/role-select` shows two cards: Landlord and Tenant
- [ ] Tapping "I'm a Landlord" shows loading state on that card
- [ ] After role set, redirected to `/onboarding`
- [ ] Signing out and back in → goes to `/dashboard` (role persists)

### Sign-Up as Tenant
- [ ] Tapping "I'm a Tenant" shows loading state
- [ ] After role set, redirected to `/submit`
- [ ] Tenant can access `/submit` and `/my-requests`
- [ ] Tenant cannot access `/dashboard` — redirected away

### Sign-In Flow (Existing User)
- [ ] Sign in with existing landlord account → goes to `/dashboard`
- [ ] Sign in with existing tenant account → goes to `/submit`
- [ ] Sign in with account that has no role → goes to `/role-select`

### Role-Based Access Control
- [ ] Landlord accessing `/submit` → redirected to `/dashboard`
- [ ] Tenant accessing `/dashboard` → redirected to `/submit` or `/unauthorized`
- [ ] Unauthenticated user accessing `/dashboard` → redirected to `/sign-in`
- [ ] Unauthenticated user accessing `/role-select` → redirected to `/sign-in`

### Billing Page (Landlord)
- [ ] Navigate to `/billing` from sidebar — page loads
- [ ] Current plan card shows "Free (Beta)"
- [ ] Usage bars show correct property count and request count
- [ ] "Manage Subscription" button opens Clerk billing portal (or shows placeholder)
- [ ] Available plans show "Coming soon" badges
- [ ] Tenant cannot access `/billing` — redirected

### Error Handling
- [ ] Direct URL to `/unauthorized` shows error page with "Go to Dashboard" button
- [ ] Button on unauthorized page redirects correctly based on role
- [ ] "Sign Out" on unauthorized page clears session
- [ ] API route returns 401 for unauthenticated request (no session)
- [ ] API route returns 403 for wrong role (tenant calling landlord endpoint)
- [ ] API route returns 403 for no role (user hasn't completed role selection)

### Session Management
- [ ] Open app in two tabs — both stay authenticated
- [ ] Sign out in one tab — other tab redirects to sign-in on next navigation
- [ ] Leave app idle for extended period — session still valid (Clerk handles refresh)
- [ ] Role change via API reflects in middleware on next request

### withAuth() Helper
- [ ] New `/api/auth/set-role` uses withAuth() pattern
- [ ] Returns 401 for missing session
- [ ] Returns 403 for missing role (when requiredRole is set)
- [ ] Returns correct response for authorized request

### Environment Configuration
- [ ] App starts with all required env vars in `.env.local`
- [ ] App shows clear error if `CLERK_SECRET_KEY` is missing
- [ ] App shows clear error if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is missing
- [ ] `.env.example` has all required Clerk vars with descriptions

### Mobile Responsiveness
- [ ] `/role-select` — cards stack on mobile, side-by-side on tablet+
- [ ] `/billing` — content readable on iPhone SE (375px)
- [ ] `/unauthorized` — centered, readable on all sizes
- [ ] All touch targets at least 44x44px

### Edge Cases
- [ ] User signs up, closes browser before picking role → next sign-in goes to `/role-select`
- [ ] User picks landlord, then tries to access `/role-select` again → redirected to dashboard
- [ ] API call to set role fails (network error) → toast error, user can retry
- [ ] Two rapid clicks on a role card → only one API call (button disabled after first click)
- [ ] User with no Clerk metadata at all → treated as "no role"

## Tasks

Task outline for `/create-feature-tasks-in-backlog`:

### Foundation (no dependencies)
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 025 | Haiku | Add `withAuth()` helper to `lib/clerk.ts` + Zod `setRoleSchema` | -- |
| 026 | Haiku | Update `.env.example` with Clerk var descriptions + production setup guide | -- |

### Core Auth Flow
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 027 | Sonnet | Create `POST /api/auth/set-role` API route (Clerk Backend API `updateUser`) | 025 |
| 028 | Sonnet | Update `middleware.ts` — add no-role redirect to `/role-select`, pre-role route handling | -- |
| 029 | Opus | Build `/role-select` page with RoleCard components | 027, 028 |

### Billing
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 030 | Sonnet | Create billing API route or client-side data fetch for plan/usage info | 025 |
| 031 | Opus | Build `/billing` page (CurrentPlanCard + AvailablePlansCard) | 030 |
| 032 | Sonnet | Add "Billing" to landlord sidebar nav + plan summary card on settings page | 031 |

### Error Handling
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 033 | Opus | Build `/unauthorized` error page | 028 |

### Infrastructure
| ID | Tier | Task | Depends On |
|----|------|------|------------|
| 034 | Haiku | Update Clerk `<SignUp />` with `afterSignUpUrl="/role-select"` | 028 |
| 035 | Sonnet | Enhance Clerk webhook to handle `user.updated` + billing events | -- |
| 036 | Haiku | Write tests for `/api/auth/set-role` and `withAuth()` helper | 027 |

**Tier breakdown**: 3 Haiku, 4 Sonnet, 3 Opus = 10 tasks
**Estimated effort**: ~2-3 days

### Dependency Graph

```
025 (withAuth helper) ──────────────┬──▶ 027 (set-role API) ──┬──▶ 029 (role-select page)
                                    │                          │
026 (env docs) ─── independent      │   028 (middleware) ──────┤
                                    │         │                │
                                    ├──▶ 030 (billing API) ──▶ 031 (billing page) ──▶ 032 (sidebar)
                                    │
035 (webhook) ─── independent       │   028 ──▶ 033 (unauthorized page)
                                    │
034 (SignUp config) ─── depends 028 │   036 (tests) ─── depends 027
```

## Open Questions

1. **Role immutability** — Can a user change their role after initial selection? Recommendation: No. Once set, role is permanent. If someone picked wrong, they contact support (or we add an admin tool later). This avoids complex data migration between landlord and tenant contexts.

2. **Google OAuth + role** — If a user signs up via Google OAuth, they still need to pick a role. The `/role-select` interstitial handles this the same way regardless of auth method. Confirm this works with Clerk's OAuth flow.

3. **Clerk Billing availability** — Clerk Billing requires a paid Clerk plan and is not available on the free Clerk dev tier. If the project is still on Clerk's free tier at launch, the billing page should gracefully show "Billing features coming soon" rather than breaking. Confirm Clerk plan before building billing integration.

4. **Multi-tenant landlords** — A single person could be both a landlord (for their properties) and a tenant (in someone else's property). MVP does not support this — you pick one role. If this becomes a real need, a future feature could add role switching.

5. **Webhook idempotency** — The `user.created` webhook currently does a simple upsert. If Clerk retries the webhook (which it does on failure), the handler should be idempotent. The current implementation is safe (upsert by email), but the new `user.updated` handler should also be idempotent.

6. **Session claims propagation delay** — After calling `clerkClient.users.updateUser()` to set `publicMetadata.role`, there may be a brief delay before the updated claims appear in middleware. The client-side `session.reload()` should handle this, but test for race conditions where middleware checks the role before it propagates.

7. **Clerk v7 Billing API** — Clerk v7 (`@clerk/nextjs ^7.0.8`) is relatively new. Verify that the Billing API surface matches documentation. If Billing is not yet stable in v7, the billing page can use a simple "Coming soon" placeholder and skip the Clerk Billing integration for now.

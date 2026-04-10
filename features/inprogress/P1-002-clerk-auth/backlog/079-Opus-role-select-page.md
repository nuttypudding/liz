---
id: 079
title: Build /role-select page with RoleCard components
tier: Opus
depends_on: [77, 78]
feature: P1-002-clerk-auth
---

# 079 — Build /role-select Page

## Objective

Create the post-signup role selection page where new users choose "I'm a Landlord" or "I'm a Tenant". Tapping a card calls `POST /api/auth/set-role`, reloads the session, and redirects.

## Context

See feature plan: `features/inprogress/P1-002-clerk-auth/README.md` — "Role Selection Page" UI section.

This page uses the existing `(auth)` layout at `apps/web/app/(auth)/layout.tsx` (centered card, no sidebar). The two role cards should be large, tappable, and visually prominent.

## Implementation

### 1. Create `apps/web/app/(auth)/role-select/page.tsx`

Client component (`"use client"`). Uses the `(auth)` layout.

**User flow:**
1. Display heading: "Welcome! Tell us about you."
2. Show two large cards: Landlord (Building icon) and Tenant (Key icon)
3. On card tap: disable both cards, show spinner on tapped card
4. Call `POST /api/auth/set-role` with `{ role: "landlord" | "tenant" }`
5. On success: call `clerk.session.reload()` to refresh claims
6. Redirect to the URL from the response (`/onboarding` or `/submit`)
7. On error: show toast, re-enable cards

### 2. Create `apps/web/components/auth/role-card.tsx`

Props: `{ icon: LucideIcon, title: string, description: string, onClick: () => void, loading: boolean, disabled: boolean }`

Styling:
- Uses shadcn `Card` component
- Hover: `scale(1.02)` + `border-primary/50` + `shadow-md`
- Active: `scale(0.98)`
- Loading: spinner overlay
- Disabled: `opacity-50`, `pointer-events-none`
- Full card is a `<button>` for accessibility

### 3. Layout

- Mobile (< 640px): Cards stack vertically (grid-cols-1)
- Desktop (sm+): Cards side-by-side (grid-cols-2)
- Max width constrained, centered

### 4. Session reload

```typescript
import { useClerk } from "@clerk/nextjs";

const { session } = useClerk();
// After API success:
await session?.reload();
router.push(response.redirect);
```

### 5. Edge cases

- If user already has a role (somehow), the API returns 409 — redirect to role's home
- Double-click protection: disable cards after first click
- Sign-out link at bottom for stuck users

### shadcn Components

| Component | Status | Use |
|-----------|--------|-----|
| `card` | Installed | Role option cards |
| `button` | Installed | Sign-out link |
| `sonner` | Installed | Error toast |

## Acceptance Criteria

1. [ ] Verify correct model tier (Opus)
2. [ ] Page renders at `/role-select` within `(auth)` layout
3. [ ] Two cards displayed: Landlord (Building icon) + Tenant (Key icon)
4. [ ] Cards stack on mobile, side-by-side on desktop
5. [ ] Tapping a card shows loading state and disables both cards
6. [ ] Calls `POST /api/auth/set-role` with selected role
7. [ ] Reloads Clerk session after successful role set
8. [ ] Redirects landlord → `/onboarding`, tenant → `/submit`
9. [ ] Error toast shown on API failure, cards re-enabled
10. [ ] Double-click protection (cards disabled after first click)
11. [ ] Sign-out link present and functional
12. [ ] All touch targets at least 44x44px

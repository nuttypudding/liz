---
type: concept
tags: [auth, clerk, roles, landlord, tenant]
created: 2026-04-12
updated: 2026-04-12
confidence: high
---

# Clerk Roles

Liz uses Clerk's `publicMetadata` to store a user's role. The middleware reads this metadata on every request to enforce role-based routing.

## Roles

| Role | Access | Default landing |
|------|--------|----------------|
| `landlord` | Full dashboard, maintenance inbox, vendor management | `/dashboard` |
| `tenant` | Intake submission form only | `/submit` |

A third role (`vendor`) is planned but not implemented in MVP.

## How Roles Are Set

Roles live in Clerk's `publicMetadata` field on the user object:

```json
{ "role": "landlord" }
```

In Next.js middleware, this surfaces as:

```ts
sessionClaims?.metadata?.role
```

### Assignment paths

1. **Manual (dev/test)**: Set in Clerk Dashboard → Users → [user] → Public metadata.
2. **Webhook (production)**: The `user.created` webhook at `/api/webhook/clerk` assigns `landlord` as the default role for self-signup users.

## T-017 Gotcha: Missing Role on Self-Signup

Self-signup users had no `publicMetadata.role` set. `getRole()` returned `null`, causing the onboarding wizard to fail with "Failed to create property." Three-layer fix deployed (T-017):

1. Webhook (`user.created`) sets `{ "role": "landlord" }` on every new user.
2. Backend fallback: treat null role as `landlord`.
3. Landlord bootstrap: create the DB record if absent.

Fallback order: `publicMetadata.role` → backend default (`"landlord"`) → DB bootstrap.

## Related

- [[project/clerk-setup-guide]] — how to set roles in Clerk dashboard for local dev
- [[project/clerk-production-setup]] — webhook configuration for production role assignment
- [[decisions/2026-04-01-auth-clerk-not-supabase]] — why Clerk owns auth (not Supabase Auth)

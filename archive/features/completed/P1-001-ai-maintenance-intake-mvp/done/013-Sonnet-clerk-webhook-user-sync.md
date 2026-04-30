---
id: 013
title: Create Clerk webhook for user sync to Supabase
tier: Sonnet
depends_on: [1, 2]
feature: ai-maintenance-intake-mvp
---

# 013 — Create Clerk Webhook for User Sync to Supabase

## Objective

When a new user signs up via Clerk (especially a tenant), automatically create or link their record in the Supabase `tenants` table. This ensures the tenant's `clerk_user_id` is set so request queries work correctly.

## Context

- Clerk webhook endpoint should be at `/api/webhook/clerk` (already in public routes in middleware)
- The `tenants` table has a `clerk_user_id text` column that can be null (for tenants added by landlord before they sign up)
- When a tenant signs up, we need to match them to an existing tenant record (by email) or note that they're a new unlinked user
- Clerk sends `user.created` and `user.updated` webhook events

## Implementation

### Step 1: Create webhook endpoint

Create `apps/web/app/api/webhook/clerk/route.ts`:

```typescript
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) throw new Error("Missing CLERK_WEBHOOK_SECRET");

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  const body = await request.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  const evt = wh.verify(body, {
    "svix-id": svix_id!,
    "svix-timestamp": svix_timestamp!,
    "svix-signature": svix_signature!,
  }) as WebhookEvent;

  if (evt.type === "user.created") {
    const { id, email_addresses, public_metadata } = evt.data;
    const role = (public_metadata as any)?.role;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (role === "tenant" && primaryEmail) {
      const supabase = createServerSupabaseClient();

      // Try to match existing tenant by email
      const { data: existing } = await supabase
        .from("tenants")
        .select("id")
        .eq("email", primaryEmail)
        .is("clerk_user_id", null)
        .single();

      if (existing) {
        // Link existing tenant record
        await supabase
          .from("tenants")
          .update({ clerk_user_id: id })
          .eq("id", existing.id);
      }
      // If no match, tenant will be linked when landlord adds them
    }
  }

  return new Response("OK", { status: 200 });
}
```

### Step 2: Install svix

```bash
npm install svix
```

### Step 3: Configure Clerk webhook

In Clerk Dashboard → Webhooks:
1. Add endpoint: `https://<your-domain>/api/webhook/clerk` (use ngrok for local dev)
2. Subscribe to events: `user.created`, `user.updated`
3. Copy the signing secret → add to `.env.local` as `CLERK_WEBHOOK_SECRET`

### Step 4: Add env var

Add `CLERK_WEBHOOK_SECRET` to `.env.example` and `.env.local`.

## Acceptance Criteria

1. [ ] Verify correct model tier (Sonnet)
2. [ ] Webhook endpoint verifies Svix signatures
3. [ ] `user.created` event with `role: "tenant"` matches existing tenant by email
4. [ ] Matched tenants get `clerk_user_id` updated
5. [ ] Unmatched tenants don't cause errors
6. [ ] `CLERK_WEBHOOK_SECRET` added to `.env.example`
7. [ ] Webhook endpoint is in public routes (already handled in middleware)

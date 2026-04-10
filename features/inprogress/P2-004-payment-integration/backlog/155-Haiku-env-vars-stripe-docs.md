---
id: 155
title: Environment variables documentation + .env.example update
tier: Haiku
depends_on: [139]
feature: P2-004-payment-integration
---

# 155 — Environment variables documentation + .env.example update

## Objective
Update `.env.example` in the project root and document all Stripe environment variables required for the payment integration.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Developers need clear guidance on which Stripe API keys to use and where to find them.

## Implementation

**Update File**: `apps/web/.env.example`

Add the following Stripe environment variables with descriptive comments:

```bash
# ========================================
# STRIPE PAYMENT INTEGRATION
# ========================================

# Stripe API Keys
# Get these from: https://dashboard.stripe.com/apikeys
# Secret key for server-side operations (API routes)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Publishable key for client-side Stripe.js
# Safe to expose to frontend (starts with pk_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Connect Client ID
# Get this from: https://dashboard.stripe.com/settings/applications/summary
# Used to generate OAuth links for landlord account onboarding
STRIPE_CONNECT_CLIENT_ID=ca_test_your_client_id_here

# Webhook Secret for validating Stripe webhook events
# Get this from: https://dashboard.stripe.com/webhooks (after creating endpoint)
# Endpoint URL: https://yourdomain.com/api/webhooks/stripe
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here

# (Optional) Stripe Test/Live Mode Indicator
# Set to 'test' for development, 'live' for production
STRIPE_ENVIRONMENT=test
```

**Create/Update File**: `docs/STRIPE_SETUP.md` (documentation file)

```markdown
# Stripe Payment Integration Setup Guide

This guide explains how to set up Stripe for the Liz payment system.

## Overview

Stripe integration enables:
- **Rent Collection**: Tenants pay rent via Stripe Checkout
- **Stripe Connect**: Landlords receive payments directly to their bank accounts
- **Webhooks**: Automatic payment status updates

## Prerequisites

1. Stripe account: https://stripe.com
2. Test mode for development, live mode for production

## Step 1: Get API Keys

### Secret & Publishable Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
4. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## Step 2: Stripe Connect Setup

### Client ID

Stripe Connect allows landlords to onboard and receive payments in their own accounts.

1. Go to: https://dashboard.stripe.com/settings/applications/summary
2. Copy your **Client ID** (starts with `ca_test_` or `ca_live_`)
3. Add to `.env.local`:
   ```
   STRIPE_CONNECT_CLIENT_ID=ca_test_...
   ```

### OAuth Redirect URI

Add a redirect URI for your app:

1. In Settings → Applications, under "Redirect URIs"
2. Add: `https://yourdomain.com/dashboard/payments`
3. (For local testing: `http://localhost:3000/dashboard/payments`)

## Step 3: Webhooks

Webhooks allow Stripe to notify your app when events occur (e.g., payment completed).

### Create Webhook Endpoint

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - (For local testing with ngrok: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`)
4. Select events to listen for:
   - `checkout.session.completed` — When tenant completes payment
   - `account.updated` — When landlord's Stripe account status changes
5. Click "Add endpoint"

### Get Webhook Secret

1. After creating the endpoint, copy the **Signing Secret** (starts with `whsec_`)
2. Add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 4: Environment Variables

Update `apps/web/.env.local` with all keys:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_CONNECT_CLIENT_ID=ca_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ENVIRONMENT=test
```

## Step 5: Test the Integration

### Test Rent Payment (Tenant Flow)

1. Start dev server: `npm run dev`
2. Log in as a tenant
3. Navigate to `/pay`
4. Click "Pay Rent"
5. Use Stripe test card: **4242 4242 4242 4242**
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits
6. Complete checkout
7. Verify in dashboard that payment is marked as "completed"

### Test Stripe Connect (Landlord Flow)

1. Log in as a landlord
2. Navigate to `/dashboard/payments`
3. Click "Connect Stripe Account"
4. Complete the Stripe onboarding (use test account)
5. Verify status shows "connected" and "charges_enabled"

### Test Webhooks Locally (ngrok)

For local testing, use ngrok to expose your local server:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Expose via ngrok
ngrok http 3000
# You'll get a URL like: https://abc123.ngrok.io

# Update Stripe webhook endpoint to use ngrok URL
# Then trigger test webhook from Stripe dashboard
```

## Stripe Test Cards

Use these cards in test mode:

| Card Number | Expiry | CVC | Behavior |
|---|---|---|---|
| 4242 4242 4242 4242 | Any future | Any | Success |
| 4000 0000 0000 0002 | Any future | Any | Decline (generic) |
| 4000 0000 0000 0069 | Any future | Any | Decline (expired) |
| 5555 5555 5555 4444 | Any future | Any | Success (Mastercard) |

## Environment Variables Reference

| Variable | Purpose | Example | Required |
|---|---|---|---|
| STRIPE_SECRET_KEY | Server-side API key | sk_test_... | Yes |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Client-side key | pk_test_... | Yes |
| STRIPE_CONNECT_CLIENT_ID | Connect OAuth | ca_test_... | Yes |
| STRIPE_WEBHOOK_SECRET | Webhook verification | whsec_... | Yes |
| STRIPE_ENVIRONMENT | Test/Live mode | test | No (defaults to test) |

## Troubleshooting

### Webhook Not Received

1. Check webhook endpoint URL matches exactly: `https://yourdomain.com/api/webhooks/stripe`
2. Verify middleware excludes `/api/webhooks/stripe` from Clerk auth
3. Check Stripe dashboard → Webhooks → Event deliveries for failures

### "Invalid signature" Error

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check it matches the endpoint you created (not a different endpoint's secret)
3. Ensure webhook body is not modified before signature verification

### Stripe Connect Not Redirecting

1. Verify `STRIPE_CONNECT_CLIENT_ID` is correct
2. Check redirect URI is registered in Stripe settings
3. Ensure `/api/payments/connect/onboard` is working (test with curl)

### Test Card Declined

1. Use the exact card numbers above (spacing doesn't matter)
2. Ensure you're in **test mode** (not live mode)
3. Try a different test card from the table

## References

- [Stripe API Docs](https://stripe.com/docs)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
```

## Acceptance Criteria
1. [ ] `.env.example` updated with all Stripe variables
2. [ ] Each variable has clear comment explaining purpose
3. [ ] Example values show correct format (sk_test_, pk_test_, ca_test_, whsec_)
4. [ ] Documentation file created: `docs/STRIPE_SETUP.md`
5. [ ] Setup guide includes:
   - [ ] Step-by-step instructions for getting API keys
   - [ ] How to set up Stripe Connect Client ID
   - [ ] How to create and configure webhooks
   - [ ] Test card numbers for development
   - [ ] ngrok setup for local webhook testing
6. [ ] Environment variables reference table included
7. [ ] Troubleshooting section covers common issues
8. [ ] Links to official Stripe documentation provided
9. [ ] Instructions are clear for developers with no Stripe experience
10. [ ] No sensitive keys exposed in documentation (only format examples)

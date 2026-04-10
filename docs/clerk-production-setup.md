# Clerk Production Setup Guide

This guide walks through setting up Clerk authentication for production deployment.

## Prerequisites

- A Clerk account (https://clerk.com)
- Production domain (e.g., `liz-landlord.com`)
- Access to Vercel environment variables

## Setup Checklist

### 1. Create Production Clerk Instance

1. Go to https://dashboard.clerk.com
2. Click "Add application" or select existing application
3. Create a new instance for production (separate from development)
4. Note the Instance ID (appears in dashboard URL)

### 2. Set Production API Keys in Vercel

1. Get keys from https://dashboard.clerk.com → API Keys
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)
2. Go to Vercel project settings → Environment Variables
3. Add both keys for Production environment
   - **Important:** Do NOT use test keys in production
   - Both keys must be from the same Clerk instance

### 3. Configure Allowed Redirect URLs

1. In Clerk Dashboard → Applications → Settings
2. Go to "URLs" or "Allowed redirect URIs"
3. Add your production domain:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/sign-in`
   - `https://your-domain.com/sign-up`
4. Remove any development localhost URLs

### 4. Set Up Clerk Webhook

1. In Clerk Dashboard → Webhooks → Add Endpoint
2. Endpoint URL: `https://your-domain.com/api/webhook/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the signing secret and add to Vercel:
   - Set `CLERK_WEBHOOK_SECRET` in Production environment variables
5. Test the webhook from Clerk dashboard

### 5. Configure OAuth Providers (Optional)

For users to sign in with Google, Apple, etc.:

1. In Clerk Dashboard → Social Connections
2. Enable Google OAuth:
   - Redirect URI: `https://your-domain.com/auth/oauth_callback`
   - Add Google OAuth credentials (from Google Cloud Console)
3. Repeat for Apple, GitHub, etc. as needed

### 6. Enable Rate Limiting

1. In Clerk Dashboard → Security → Rate Limiting
2. Enable sign-up rate limiting (recommended: 5 attempts per hour per IP)
3. Configure appropriate limits for sign-in and password reset

### 7. Review Security Settings

1. Go to Clerk Dashboard → Security
2. Verify:
   - Multi-session support is enabled
   - Password requirements are strong
   - Email verification is required
   - Session timeout is configured (default: 3 hours)

### 8. Test Production Flow

1. Deploy the application to production
2. Test sign-up flow:
   - Sign up with new email
   - Verify email works correctly
   - Verify user role is set correctly
3. Test sign-in flow:
   - Sign in with existing account
   - Verify session is maintained
   - Verify user role loads correctly
4. Test OAuth sign-in (if configured)
5. Test sign-out and redirect

### 9. Monitor Webhooks

1. In Clerk Dashboard → Webhooks → View Logs
2. Verify webhook deliveries are successful (status 200)
3. Check application logs for webhook processing errors
4. Set up alerts if available

## Troubleshooting

### "Redirect URL not allowed" error

- Verify the domain in Clerk Dashboard → URLs matches your deployment URL
- Check for trailing slashes or protocol mismatches
- Wait 1-2 minutes for Clerk cache to update

### Webhook not received

- Verify endpoint URL is correct and accessible from the internet
- Check signing secret is correct in environment variables
- Review webhook logs in Clerk Dashboard
- Ensure route handler returns 200 status code

### User role not assigned

- Check that webhook is being received (see logs)
- Verify role assignment logic in `/api/webhook/clerk`
- Check Supabase user metadata was updated

### Session not persisting

- Verify `CLERK_SECRET_KEY` is production key (starts with `sk_live_`)
- Check cookie settings in Clerk Dashboard
- Clear browser cookies and test again

## Monitoring in Production

1. Set up error tracking (e.g., Sentry) for auth-related issues
2. Monitor webhook delivery rate in Clerk Dashboard
3. Watch for failed sign-ups or sign-ins in application logs
4. Set alerts for unusual authentication patterns

## Rollback Plan

If issues occur in production:

1. Keep development Clerk keys separate
2. Have rollback deployment ready
3. Document any custom user metadata structure
4. Keep recent backups of user data from Supabase

## References

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Clerk API Reference](https://clerk.com/docs/reference/backend-api)

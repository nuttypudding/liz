# Endpoints

> **Keep this file up to date.** When adding new API routes, changing Supabase config, updating Vercel deployments, or modifying environment URLs, update the relevant section below.

## Environments

### Local Development

| Service | URL |
|---------|-----|
| Next.js App | `http://192.168.50.249:3000` |
| Supabase API | `http://localhost:54321` |
| Supabase Studio | `http://localhost:54323` |
| Supabase Postgres | `localhost:54322` |
| Supabase Storage | `http://localhost:54321/storage/v1` |
| Supabase Auth | `http://localhost:54321/auth/v1` |
| Ngrok Tunnel (webhooks) | `https://unvenomed-finned-yulanda.ngrok-free.dev` |

### QA (Supabase Cloud)

| Service | URL |
|---------|-----|
| Supabase API | `https://kmtqmuedhwfcosbgsstu.supabase.co` |
| Supabase Studio | `https://supabase.com/dashboard/project/kmtqmuedhwfcosbgsstu` |

### Production

| Service | URL |
|---------|-----|
| Vercel (Frontend) | `https://web-lovat-sigma-36.vercel.app` |
| Vercel Project | `prj_DnDSbfQ2y0gh4EAG06PPbfKQsCiB` |
| Supabase API | _Not yet configured — using QA for now_ |

## Auth (Clerk)

| Resource | URL / Value |
|----------|-------------|
| Sign In | `/sign-in` |
| Sign Up | `/sign-up` |
| Clerk Dashboard | `https://dashboard.clerk.com` |
| Webhook endpoint | `/api/webhooks/clerk` |

## API Routes (Next.js)

All routes are relative to the app root (e.g. `http://192.168.50.249:3000` locally).

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/settings/profile` | Fetch landlord profile |
| PUT | `/api/settings/profile` | Update landlord profile / complete onboarding |
| GET | `/api/properties` | List landlord's properties (with tenants) |
| POST | `/api/properties` | Create a property |
| GET | `/api/properties/[id]` | Get single property |
| PUT | `/api/properties/[id]` | Update a property |
| DELETE | `/api/properties/[id]` | Delete a property |
| POST | `/api/properties/[id]/tenants` | Add tenant to property |
| GET | `/api/properties/[id]/rent-status` | Rent status for a property (overdue, last paid) |
| POST | `/api/properties/[id]/rent-payments` | Record a rent payment for a property |
| GET | `/api/tenants/[id]` | Get single tenant |
| PUT | `/api/tenants/[id]` | Update a tenant |
| DELETE | `/api/tenants/[id]` | Delete a tenant |
| GET | `/api/vendors` | List vendors (sorted by preferred/priority) |
| POST | `/api/vendors` | Create a vendor |
| GET | `/api/vendors/[id]` | Get single vendor |
| PUT | `/api/vendors/[id]` | Update a vendor |
| DELETE | `/api/vendors/[id]` | Delete a vendor |
| POST | `/api/intake` | Submit maintenance intake |
| POST | `/api/webhooks/clerk` | Clerk webhook for user sync |

## App Pages

| Route | Purpose |
|-------|---------|
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/onboarding` | 5-step onboarding wizard |
| `/dashboard` | Main landlord dashboard |
| `/dashboard/properties` | Properties list |
| `/dashboard/tenants` | Tenants list |
| `/dashboard/vendors` | Vendors list |
| `/dashboard/settings` | Landlord settings / AI preferences |

## Environment Files

| File | Environment | Notes |
|------|-------------|-------|
| `apps/web/.env.local` | Local dev | Supabase Docker + Clerk test keys |
| `apps/web/.env.qa` | QA | Supabase cloud + Clerk test keys |
| `apps/web/.env.example` | Template | Placeholder values for new devs |
| `.env` / `.env.local` | Root (Arena) | LLM API keys, root-level Clerk keys |

---
id: 138
title: Database migration — payment_periods, payments, vendor_payments, stripe_accounts tables
tier: Haiku
depends_on: []
feature: P2-004-payment-integration
---

# 138 — Database migration — payment_periods, payments, vendor_payments, stripe_accounts tables

## Objective
Create PostgreSQL migration that establishes the core payment schema: payment_periods, payments, vendor_payments, and stripe_accounts tables with all columns, indexes, and constraints as specified in the feature README data model.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

The payment system requires four interconnected tables:
- **stripe_accounts**: Track connected Stripe accounts per property
- **payment_periods**: Monthly rent periods for each property
- **payments**: Individual tenant rent payments
- **vendor_payments**: Manual vendor payment logging

## Implementation

1. **Create migration file** in `supabase/migrations/`:
   - Name: `[timestamp]_create_payment_schema.sql`
   - Use Supabase migration format

2. **stripe_accounts table**:
   - `id` (uuid, primary key)
   - `property_id` (uuid, foreign key to properties)
   - `stripe_account_id` (text, unique, NOT NULL)
   - `stripe_account_email` (text)
   - `charges_enabled` (boolean, default false)
   - `payouts_enabled` (boolean, default false)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
   - Index on property_id

3. **payment_periods table**:
   - `id` (uuid, primary key)
   - `property_id` (uuid, foreign key to properties)
   - `tenant_id` (uuid, foreign key to auth.users)
   - `year` (integer)
   - `month` (integer, 1-12)
   - `rent_amount` (numeric, NOT NULL)
   - `due_date` (date)
   - `status` ('pending' | 'paid' | 'late', default 'pending')
   - `paid_at` (timestamp, nullable)
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
   - Unique constraint on (property_id, tenant_id, year, month)
   - Indexes on property_id, tenant_id, status, year-month

4. **payments table**:
   - `id` (uuid, primary key)
   - `payment_period_id` (uuid, foreign key to payment_periods)
   - `tenant_id` (uuid, foreign key to auth.users)
   - `property_id` (uuid, foreign key to properties)
   - `amount` (numeric, NOT NULL)
   - `stripe_payment_intent_id` (text, unique, nullable)
   - `stripe_charge_id` (text, unique, nullable)
   - `payment_method` ('stripe_checkout', 'manual', default 'stripe_checkout')
   - `status` ('completed' | 'failed' | 'pending', default 'pending')
   - `paid_at` (timestamp, nullable)
   - `metadata` (jsonb, default '{}')
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())
   - Indexes on payment_period_id, tenant_id, property_id, stripe_payment_intent_id

5. **vendor_payments table**:
   - `id` (uuid, primary key)
   - `property_id` (uuid, foreign key to properties)
   - `vendor_name` (text, NOT NULL)
   - `amount` (numeric, NOT NULL)
   - `payment_date` (date, NOT NULL)
   - `description` (text)
   - `request_id` (uuid, foreign key to maintenance_requests, nullable)
   - `created_at` (timestamp, default now())
   - `created_by` (uuid, foreign key to auth.users)
   - Indexes on property_id, payment_date, request_id

6. **Enable RLS** (Row Level Security):
   - All tables: SELECT/INSERT/UPDATE allowed for authenticated users with matching property_id
   - Stripe accounts: Only landlord with property access can view

7. **Test migration locally**:
   ```bash
   supabase migration up
   supabase db inspect | grep -A 5 "payment_periods\|payments\|vendor_payments\|stripe_accounts"
   ```

## Acceptance Criteria
1. [ ] Migration file created in `supabase/migrations/`
2. [ ] All 4 tables created with correct columns and data types
3. [ ] Primary keys, foreign keys, and unique constraints defined
4. [ ] All indexes created as specified
5. [ ] RLS policies enabled on all tables
6. [ ] Migration runs successfully locally: `supabase migration up`
7. [ ] `supabase db inspect` confirms schema matches requirements
8. [ ] No TypeScript or syntax errors in migration SQL

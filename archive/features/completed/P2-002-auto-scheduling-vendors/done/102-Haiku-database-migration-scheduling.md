---
id: 102
title: Database migration — vendor_availability_rules, scheduling_tasks, notification_log tables
tier: Haiku
depends_on: []
feature: P2-002-auto-scheduling-vendors
---

# 102 — Database Migration — Vendor Availability Rules, Scheduling Tasks, Notification Log Tables

## Objective
Create Supabase migration for vendor availability, scheduling tasks, and notification log tables to support the vendor scheduling workflow.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create migration file in `apps/web/supabase/migrations/` (use timestamp pattern: `YYYYMMDDHHMMSS_description.sql`)
2. Define three tables:
   - **vendor_availability_rules**: Stores recurring availability windows per vendor
     - Columns: id (uuid pk), vendor_id (uuid fk), day_of_week (int 0-6), start_time (time), end_time (time), timezone (varchar), created_at, updated_at
   - **scheduling_tasks**: Tracks each scheduling workflow instance
     - Columns: id (uuid pk), request_id (uuid fk), vendor_id (uuid fk), tenant_id (uuid fk), status (enum: pending, awaiting_tenant, awaiting_vendor, confirmed, rescheduling, completed), scheduled_date (date), scheduled_time_start (time), scheduled_time_end (time), reschedule_count (int, default 0), created_at, updated_at
   - **notification_log**: Audit trail for all notifications sent
     - Columns: id (uuid pk), recipient_type (enum: landlord, tenant, vendor), recipient_id (uuid), channel (enum: email, sms, in_app), template (varchar), sent_at (timestamp), status (enum: sent, failed, bounced), created_at
3. Add indexes on foreign keys and status columns for query performance
4. Run migration locally using `supabase migration up`

## Acceptance Criteria
1. [ ] All three tables created successfully in local Supabase
2. [ ] Indexes present on vendor_id, request_id, status columns
3. [ ] Migration runs without errors locally
4. [ ] Table schemas match data model requirements

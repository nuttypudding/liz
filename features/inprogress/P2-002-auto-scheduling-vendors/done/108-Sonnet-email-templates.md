---
id: 108
title: React Email templates — schedule-confirmed, availability-prompt, reschedule-request
tier: Sonnet
depends_on: [107]
feature: P2-002-auto-scheduling-vendors
---

# 108 — React Email Templates — Schedule-Confirmed, Availability-Prompt, Reschedule-Request

## Objective
Create responsive React Email templates for the three primary scheduling notifications: confirming a scheduled appointment, prompting tenants for availability, and requesting vendor reschedule.

## Context
Reference: `features/inprogress/P2-002-auto-scheduling-vendors/README.md`

## Implementation
1. Create `apps/web/emails/schedule-confirmed.tsx`:
   - Props: workOrderId, workOrderTitle, propertyAddress, vendor name, scheduled_date, scheduled_time_start, scheduled_time_end, landlord name
   - Layout: Header (Liz branding), confirmation message, work order summary card, appointment details, property address, vendor contact info, reschedule link
   - Responsive design for mobile/desktop
   - Call-to-action: "View Details" button linking to relevant page

2. Create `apps/web/emails/availability-prompt.tsx`:
   - Props: tenantName, workOrderTitle, propertyAddress, availabilityDeadline, tenantResponseLink
   - Layout: Header, request context (what repair, where), "Please confirm your availability" message, link to availability submission form
   - Optional: show suggested time windows if available
   - CTA: "Submit Availability" button

3. Create `apps/web/emails/reschedule-request.tsx`:
   - Props: landlordName, vendorName, currentAppointmentDate/time, originalWorkOrderTitle, rescheduleLink
   - Layout: Header, "Reschedule Requested" message, current appointment details, vendor's reason (if provided), link to reschedule page
   - CTA: "Review Reschedule Request" button

4. All templates:
   - Use React Email standard components (Container, Row, Column, Button, Link, Text, Heading)
   - Include Liz branding/logo in header
   - Use consistent color scheme and typography
   - Responsive design (mobile-first)
   - Fallback plain-text versions

## Acceptance Criteria
1. [ ] `schedule-confirmed.tsx` renders with all required fields
2. [ ] `availability-prompt.tsx` renders with all required fields
3. [ ] `reschedule-request.tsx` renders with all required fields
4. [ ] All templates are responsive (preview in mobile/desktop)
5. [ ] All templates include consistent branding
6. [ ] All CTA buttons link to correct URLs
7. [ ] Templates can be rendered to HTML without errors

# 06 — Tenant Submit Flow

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

**Prerequisite:** Signed in as tenant. Tenant record linked to a property (via `/api/tenant/me`).

---

## 6.1 Submit Page Load

### TC-6.1.1: Page renders
- [ ] Navigate to `/submit`
- [ ] Page loads without errors
- [ ] Submit form visible with description textarea and photo uploader
- [ ] No console errors

### TC-6.1.2: Tenant profile loaded
- [ ] Page successfully fetches tenant profile (property_id loaded)
- [ ] No "property not found" or loading error
- [ ] If tenant has no linked property: shows appropriate error/guidance message

---

## 6.2 Submit Form

### TC-6.2.1: Description textarea
- [ ] Textarea visible and editable
- [ ] Placeholder text provides guidance (e.g., "Describe the issue...")
- [ ] Required field — form won't submit without text

### TC-6.2.2: Photo uploader
- [ ] Photo upload area visible
- [ ] Supports click-to-select files
- [ ] Supports drag-and-drop
- [ ] Shows file preview after selection
- [ ] Multiple files selectable

### TC-6.2.3: Validation — empty description
- [ ] Leave description empty
- [ ] Click "Submit Request"
- [ ] Validation error shown
- [ ] Form does not submit

### TC-6.2.4: Submit with description only (no photos)
- [ ] Enter issue description: "Water is leaking from the kitchen ceiling"
- [ ] Leave photo uploader empty
- [ ] Click "Submit Request"
- [ ] Loading/uploading indicator shown
- [ ] Request created successfully
- [ ] Transitions to gatekeeper response

### TC-6.2.5: Submit with photos
- [ ] Enter description: "Broken window in bedroom"
- [ ] Add 1–3 photos via uploader
- [ ] Click "Submit Request"
- [ ] Photos upload first, then request created
- [ ] Loading indicator for each stage (uploading photos → submitting → classifying)
- [ ] Transitions to gatekeeper response

### TC-6.2.6: Submit button states
- [ ] While idle: button enabled, says "Submit Request"
- [ ] While uploading: button disabled, shows "Uploading..." or spinner
- [ ] While submitting: button disabled, shows "Submitting..." or spinner
- [ ] After submit: button hidden (gatekeeper view shown)

---

## 6.3 Gatekeeper Response

### TC-6.3.1: Self-resolvable issue
- [ ] Submit an issue that's likely self-resolvable (e.g., "My garbage disposal isn't working")
- [ ] Gatekeeper response shows troubleshooting guide
- [ ] Guide has step-by-step instructions
- [ ] Two buttons visible: "Issue Resolved" and "Escalate to Landlord" (or similar)

### TC-6.3.2: Resolve — tenant self-fixes
- [ ] From gatekeeper response, click "Issue Resolved"
- [ ] Request marked as resolved (`POST /api/requests/{id}/resolve`)
- [ ] Success screen: "Issue resolved!" (or similar confirmation)
- [ ] Can navigate back to submit another request

### TC-6.3.3: Escalate — tenant needs help
- [ ] From gatekeeper response, click "Escalate to Landlord"
- [ ] Request escalated to landlord
- [ ] Success screen: "Request sent to your landlord" (or similar)
- [ ] Can navigate back to submit another request

### TC-6.3.4: Non-self-resolvable issue
- [ ] Submit a serious issue (e.g., "Gas leak smell in apartment")
- [ ] Gatekeeper skips troubleshooting
- [ ] Shows "Escalate to Landlord" option directly
- [ ] Request submitted to landlord's queue

---

## 6.4 AI Classification (Visible After Submit)

### TC-6.4.1: Classification runs
- [ ] After submission, AI classification executes
- [ ] Categories assigned: one of plumbing, electrical, hvac, structural, pest, appliance, general
- [ ] Urgency assigned: low, medium, or emergency
- [ ] Confidence score generated (0–1)

### TC-6.4.2: Photo analysis
- [ ] Submit request with photos
- [ ] AI uses photos in classification (Claude Vision)
- [ ] Classification may differ from text-only submission
- [ ] Photos visible on landlord's request detail page

---

## 6.5 Error States

### TC-6.5.1: Upload failure
- [ ] Simulate a large file or unsupported format
- [ ] Error message shown to user
- [ ] User can retry or remove the file
- [ ] Form remains usable

### TC-6.5.2: Submit failure
- [ ] If API returns an error during submission
- [ ] Error message displayed
- [ ] User can retry submission
- [ ] Form data preserved (description not cleared)

### TC-6.5.3: Classification failure
- [ ] If AI classification fails
- [ ] Request still created (just without classification)
- [ ] User sees appropriate message
- [ ] Landlord can still see the unclassified request

---

## 6.6 End-to-End Flow

### TC-6.6.1: Full cycle — submit, gatekeeper, escalate, landlord views
- [ ] **As tenant:** Submit a request with description and 1 photo
- [ ] **As tenant:** See gatekeeper response, click "Escalate"
- [ ] **As tenant:** See success confirmation
- [ ] **As landlord:** Navigate to `/requests`
- [ ] **As landlord:** New request visible in list with urgency badge
- [ ] **As landlord:** Click to view detail at `/requests/{id}`
- [ ] **As landlord:** See tenant message, photo, AI classification, cost estimate
- [ ] **As landlord:** Select vendor, edit work order, dispatch

### TC-6.6.2: Full cycle — submit, self-resolve
- [ ] **As tenant:** Submit a minor issue (e.g., "Light bulb burned out")
- [ ] **As tenant:** See troubleshooting guide from gatekeeper
- [ ] **As tenant:** Click "Issue Resolved"
- [ ] **As tenant:** See success confirmation
- [ ] **As landlord:** Request visible in Resolved tab on `/requests`

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/19 test cases passed

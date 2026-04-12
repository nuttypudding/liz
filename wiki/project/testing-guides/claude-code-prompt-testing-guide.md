---
type: project
tags: [testing, claude-code, prompt, manual-testing]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/claude-code-prompt-testing-guide.md
---

# Claude Code Prompt: Generate Non-Technical Testing Guide for Liz

Copy and paste the prompt below into Claude Code from the project root.

---

## Prompt

```
Read the entire codebase for the Liz property management app (apps/web/) and generate a comprehensive, non-technical manual testing guide as a single markdown file at docs/testing/MANUAL_TEST_GUIDE.md.

## Context
Liz is a property management app with two user roles:
- **Landlord**: manages properties, tenants, vendors, maintenance requests, AI-powered triage, and dispatching
- **Tenant**: submits maintenance requests, views request status, receives AI gatekeeper troubleshooting

The app uses Clerk for auth, Supabase for the database, and Claude AI for request classification/triage.

## Requirements

### Audience
Write for a non-technical person (e.g., a product manager or QA intern with no dev experience). Assume they:
- Do NOT know what a console, API, or database is
- CAN follow step-by-step click-by-click instructions
- Need to know exactly what to type, click, and look for on screen

### Format for every test case
Use this exact structure:

```
#### TEST-XXX: [Short name]
**What we're testing:** [One sentence plain-English explanation]
**Steps:**
1. [Exact action — e.g., "Click the blue 'Add Property' button in the top-right corner"]
2. [Next action]
3. ...
**You should see:** [Exact description of expected result — what appears on screen, what changes, what message shows]
**If something's wrong:** [Describe what a failure looks like — blank screen, no message, wrong redirect, etc.]
```

### Scope — cover ALL of the following by scanning the actual code

**1. Sign Up & Sign In**
- New landlord registration and email verification
- New tenant registration
- Signing in as landlord vs tenant
- Wrong password / invalid email errors
- Signing out

**2. Role-Based Access**
- What happens when a landlord tries to visit tenant-only pages (and vice versa)
- What happens when a logged-out user tries to visit any protected page
- Where each role lands after login (landlord → /dashboard, tenant → /submit)

**3. Onboarding Wizard (Landlord)**
- Walk through every step: risk appetite, delegation mode, auto-approve slider, add first property
- Skipping onboarding with defaults
- Verify settings saved after completion
- Re-running onboarding from Settings

**4. Landlord Dashboard**
- All stat cards (emergencies, open requests, avg resolution, monthly spend)
- Property selector dropdown filtering
- Emergency banner, onboarding banner, late payment banner
- Spend chart rendering
- Recent requests list and clicking into a request
- Property drill-down tabs (documents, photos, utilities)
- Empty state when no properties exist

**5. Properties Management**
- Adding a property (fill in every field, save, verify it appears)
- Editing a property
- Deleting a property (confirm dialog, verify removal)
- Adding a tenant to a property (every field including lease dates, custom fields)
- Editing and deleting tenants
- Lease status badges (active, expiring soon, expired)
- Document upload, view, download, delete
- Utility auto-detect, manual entry, confirm/N-A, save

**6. Vendors Management**
- Adding a vendor (every field: name, phone, email, specialty, priority, notes, custom fields)
- Vendor card display verification
- Editing a vendor
- Deleting a vendor
- Sort order by priority rank

**7. Maintenance Requests (Landlord View)**
- Request list page (table on desktop, cards on mobile)
- Tabs: All, Emergency, In Progress, Resolved
- Filters: by property, by urgency, search box, combined filters
- Request detail page: tenant message, photos, urgency/status badges
- AI classification card (category, urgency, confidence, recommended action)
- Cost estimate display
- Vendor selection dropdown and auto-match by category
- Work order draft editing
- Approve & Dispatch flow (button states, success, already-dispatched state)

**8. Tenant Submit Flow**
- Submit page loads with form
- Typing a description and submitting (no photos)
- Submitting with photos (drag-and-drop and click-to-select)
- Button state changes during upload/submit
- Gatekeeper response for self-resolvable issues (troubleshooting steps shown)
- Clicking "Issue Resolved" vs "Escalate to Landlord"
- Gatekeeper response for serious issues (direct escalation)
- End-to-end: tenant submits → landlord sees it in requests

**9. Tenant My Requests**
- List page with tabs: All, Active, Resolved
- Empty state with link to submit
- Request detail (read-only, no dispatch controls)
- Cross-user isolation (Tenant A can't see Tenant B's requests)

**10. Settings**
- AI Preferences tab: risk appetite cards, delegation mode cards, auto-approve slider
- Notifications tab: emergency alerts toggle, all request alerts toggle
- Save button states (disabled until changed, loading, success toast)
- Verify settings persist after navigating away and back
- Re-run onboarding button

**11. Navigation & Layout**
- Landlord sidebar links and active states (desktop)
- Mobile bottom nav (appears < 1024px, correct items, active states)
- Tenant nav items (Submit, My Requests only — no landlord items)
- Responsive behavior: desktop, tablet, mobile, 320px
- Sheet/dialog open and close behavior (Escape, click outside)

**12. Edge Cases & Error Handling**
- Every empty state (dashboard, properties, vendors, requests, my-requests)
- Form validation boundaries (0 units, negative rent, bad emails, long strings)
- Network offline behavior
- Slow network loading states
- Invalid/nonexistent request IDs in URL
- Double-click prevention on submit and dispatch buttons
- Deleting a property that has tenants and/or requests
- Deleting a vendor that's assigned to a request
- Rapid navigation between pages

**13. Cross-Browser & Accessibility Basics**
- Chrome, Firefox, Safari, mobile Chrome, mobile Safari
- Keyboard navigation (Tab, Enter, Escape)
- Form labels present, buttons have names, focus indicators visible

### Additional instructions
- Number every test case sequentially (TEST-001, TEST-002, ...) for easy reference in bug reports
- Group test cases under clear section headings matching the features above
- At the top of the doc, include:
  - A "Before You Start" section explaining how to open the app, what two browser windows are for, and how to report a bug (screenshot + test case number + what happened vs what should have happened)
  - A test account table with placeholder rows for landlord and tenant emails
  - A progress tracker checklist for each section
- At the bottom, include a blank "Bugs Found" table with columns: Bug #, Test Case, What Happened, Expected, Screenshot, Severity (Blocker / Major / Minor / Cosmetic)
- Use friendly, encouraging language throughout — no jargon
- If you discover features in the codebase not listed above, add test cases for them too
- Total test case count should be 150+
```

---

## Usage

```bash
# From the Liz project root:
claude -p "$(cat docs/testing/claude-code-prompt-testing-guide.md)"

# Or paste the prompt section directly into Claude Code's interactive mode
```

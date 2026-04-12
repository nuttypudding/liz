---
type: project
tags: [testing, manual-testing, guide]
created: 2026-04-12
updated: 2026-04-12
confidence: high
source_migration: docs/testing-guides/MANUAL_TEST_GUIDE.md
---

# Liz Property Manager — Manual Testing Guide

**Version:** 1.0
**Last Updated:** April 8, 2026
**App URL:** https://web-lovat-sigma-36.vercel.app
**Phase:** Phase 1 — MVP Complete

---

## Before You Start

Welcome! This guide walks you through testing every feature in the Liz property management app. You don't need any technical experience — just follow the steps and note what you see.

### What You Need

1. **A computer** with a web browser (Chrome recommended)
2. **Two browser windows** — one for testing as a **landlord**, one for testing as a **tenant** (use an incognito/private window for the second account)
3. **A phone or tablet** (optional) — for testing the mobile experience
4. **About 2.5 hours** — you don't have to do it all at once!

### How to Open the App

1. Open your browser (Chrome, Firefox, or Safari)
2. Go to: **https://web-lovat-sigma-36.vercel.app**
3. You should see the Liz landing page or sign-in page

### How to Report a Bug

When something doesn't work right:
1. **Note the test case number** (e.g., TEST-042)
2. **Take a screenshot** (press `Cmd+Shift+4` on Mac or `Win+Shift+S` on Windows)
3. **Write down:** what you did, what happened, and what should have happened
4. Add it to the **Bugs Found** table at the bottom of this document

### Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Landlord | _(ask your team lead)_ | _(ask your team lead)_ | Main test account — manages properties |
| Tenant | _(ask your team lead)_ | _(ask your team lead)_ | Must be linked to a property |

---

## Progress Tracker

Check off each section as you complete it:

- [ ] Section 1: Sign Up & Sign In (TEST-001 to TEST-013)
- [ ] Section 2: Role-Based Access (TEST-014 to TEST-024)
- [ ] Section 3: Onboarding Wizard (TEST-025 to TEST-038)
- [ ] Section 4: Landlord Dashboard (TEST-039 to TEST-066)
- [ ] Section 5: Properties Management (TEST-067 to TEST-101)
- [ ] Section 6: Vendors Management (TEST-102 to TEST-120)
- [ ] Section 7: Maintenance Requests — Landlord (TEST-121 to TEST-152)
- [ ] Section 8: Tenant Submit Flow (TEST-153 to TEST-171)
- [ ] Section 9: Tenant My Requests (TEST-172 to TEST-185)
- [ ] Section 10: Settings (TEST-186 to TEST-201)
- [ ] Section 11: Navigation & Layout (TEST-202 to TEST-220)
- [ ] Section 12: Edge Cases & Error Handling (TEST-221 to TEST-252)
- [ ] Section 13: Cross-Browser & Accessibility (TEST-253 to TEST-265)

---

## Section 1: Sign Up & Sign In

---

#### TEST-001: New landlord registration
**What we're testing:** A brand-new user can create a landlord account
**Steps:**
1. Open the app in your browser: https://web-lovat-sigma-36.vercel.app/sign-up
2. You should see a sign-up form
3. Type in a new email address (one you haven't used before)
4. Create a strong password (at least 8 characters, with a number and symbol)
5. Click the "Sign Up" or "Continue" button
6. Check your email for a verification code
7. Enter the verification code when prompted
**You should see:** After verifying your email, you should be taken to the onboarding wizard page (a "Welcome to Liz!" screen) or the main dashboard
**If something's wrong:** The sign-up form doesn't appear, you get a blank page, or you never receive the verification email

---

#### TEST-002: New tenant registration
**What we're testing:** A tenant can create an account
**Steps:**
1. Open a new incognito/private browser window
2. Go to: https://web-lovat-sigma-36.vercel.app/sign-up
3. Type in a different email address than the landlord account
4. Create a password and click "Sign Up"
5. Verify your email when prompted
**You should see:** After sign-up, you should land on the tenant submission page (`/submit`) or be asked to set up your profile
**If something's wrong:** You end up on the landlord dashboard instead of the tenant page, or the sign-up fails silently

---

#### TEST-003: Sign-up form won't submit when empty
**What we're testing:** The form catches missing information
**Steps:**
1. Go to the sign-up page
2. Don't type anything in any field
3. Click the "Sign Up" button
**You should see:** Red error messages appear under the empty fields telling you what's required
**If something's wrong:** The form submits anyway, or you see a confusing error page

---

#### TEST-004: Can't sign up with an email already in use
**What we're testing:** Duplicate accounts are prevented
**Steps:**
1. Go to the sign-up page
2. Type in the same email you used for the landlord account
3. Fill in a password and click "Sign Up"
**You should see:** An error message like "This email is already registered" or "Account already exists"
**If something's wrong:** A second account is created, or you see a generic error with no explanation

---

#### TEST-005: Weak password is rejected
**What we're testing:** The app requires a strong password
**Steps:**
1. Go to the sign-up page
2. Type in a new email
3. Type a very short password like "123"
4. Click "Sign Up"
**You should see:** An error message about password requirements (too short, needs special characters, etc.)
**If something's wrong:** The weak password is accepted

---

#### TEST-006: Landlord can sign in
**What we're testing:** An existing landlord can log back in
**Steps:**
1. Go to: https://web-lovat-sigma-36.vercel.app/sign-in
2. Type your landlord email address
3. Type your password
4. Click "Sign In"
**You should see:** You're taken to the main dashboard page. You should see a sidebar on the left with links like "Dashboard", "Requests", "Properties", "Vendors", and "Settings"
**If something's wrong:** You stay on the sign-in page, see an error, or land on the wrong page

---

#### TEST-007: Tenant can sign in
**What we're testing:** An existing tenant can log back in
**Steps:**
1. Open an incognito/private browser window
2. Go to: https://web-lovat-sigma-36.vercel.app/sign-in
3. Type your tenant email address
4. Type your password
5. Click "Sign In"
**You should see:** You're taken to the tenant submit page (`/submit`). The navigation should show "Submit" and "My Requests" — NOT the landlord items
**If something's wrong:** You see the landlord dashboard, or the page doesn't load

---

#### TEST-008: Wrong password shows error
**What we're testing:** The app tells you when your password is wrong
**Steps:**
1. Go to the sign-in page
2. Type your real email address
3. Type a wrong password (like "wrongpassword123")
4. Click "Sign In"
**You should see:** An error message like "Incorrect password" or "Invalid credentials"
**If something's wrong:** You get signed in anyway, or the page crashes

---

#### TEST-009: Non-existent email shows error
**What we're testing:** The app handles unknown emails gracefully
**Steps:**
1. Go to the sign-in page
2. Type an email that doesn't have an account: `nobody-here@example.com`
3. Type any password
4. Click "Sign In"
**You should see:** An error message like "No account found" or "Invalid credentials"
**If something's wrong:** The page hangs or shows a technical error

---

#### TEST-010: Email stays filled after a failed sign-in
**What we're testing:** You don't have to retype your email after making a mistake
**Steps:**
1. Go to the sign-in page
2. Type your email address
3. Type a wrong password
4. Click "Sign In" and see the error
5. Look at the email field
**You should see:** Your email address is still in the email field — you only need to fix the password
**If something's wrong:** The email field gets cleared and you have to type it again

---

#### TEST-011: Sign out from landlord account
**What we're testing:** The sign-out button works
**Steps:**
1. Sign in as a landlord
2. Look for your profile picture or initials — usually in the sidebar at the bottom or top-right corner
3. Click on it
4. Click "Sign Out" from the dropdown menu
**You should see:** You're taken back to the sign-in page. If you try to go to `/dashboard`, you should be redirected to sign-in
**If something's wrong:** Nothing happens when you click Sign Out, or you stay signed in

---

#### TEST-012: Sign out from tenant account
**What we're testing:** Tenants can sign out too
**Steps:**
1. Sign in as a tenant
2. Find and click your profile picture or initials
3. Click "Sign Out"
**You should see:** You're taken back to the sign-in page
**If something's wrong:** The Sign Out option isn't visible, or it doesn't work

---

#### TEST-013: Sign-in page looks correct
**What we're testing:** The sign-in page displays properly
**Steps:**
1. Go to the sign-in page without being logged in
2. Look at the page layout
**You should see:** A clean sign-in form with email and password fields, a "Sign In" button, and a link to sign up. The page should look professional, not broken
**If something's wrong:** Elements overlap, the form is off-center, or it looks visually broken

---

## Section 2: Role-Based Access

---

#### TEST-014: Logged-out user can't see the dashboard
**What we're testing:** You can't sneak into the app without signing in
**Steps:**
1. Open an incognito/private browser window (make sure you're not signed in)
2. Type this in the address bar: https://web-lovat-sigma-36.vercel.app/dashboard
3. Press Enter
**You should see:** You're automatically redirected to the sign-in page
**If something's wrong:** You can see the dashboard without signing in

---

#### TEST-015: Logged-out user can't see properties
**What we're testing:** Protected pages redirect to sign-in
**Steps:**
1. In your incognito window (not signed in), go to: https://web-lovat-sigma-36.vercel.app/properties
**You should see:** Redirected to the sign-in page
**If something's wrong:** The properties page loads without signing in

---

#### TEST-016: Logged-out user can't see requests
**What we're testing:** The requests page is protected
**Steps:**
1. In your incognito window (not signed in), go to: https://web-lovat-sigma-36.vercel.app/requests
**You should see:** Redirected to the sign-in page
**If something's wrong:** The requests page loads without signing in

---

#### TEST-017: Logged-out user can't see submit page
**What we're testing:** Tenant pages are also protected
**Steps:**
1. In your incognito window (not signed in), go to: https://web-lovat-sigma-36.vercel.app/submit
**You should see:** Redirected to the sign-in page
**If something's wrong:** The submit form loads without signing in

---

#### TEST-018: Logged-out user can't see settings
**What we're testing:** Settings page is protected
**Steps:**
1. In your incognito window (not signed in), go to: https://web-lovat-sigma-36.vercel.app/settings
**You should see:** Redirected to the sign-in page
**If something's wrong:** Settings load without signing in

---

#### TEST-019: Landlord can't visit the tenant submit page
**What we're testing:** Landlords are kept in their own area
**Steps:**
1. Sign in as a landlord
2. Type this in the address bar: https://web-lovat-sigma-36.vercel.app/submit
3. Press Enter
**You should see:** You're redirected to the dashboard — not the tenant submit page
**If something's wrong:** The tenant submit page loads for a landlord

---

#### TEST-020: Landlord can't visit tenant "My Requests"
**What we're testing:** Landlords can't see the tenant request list
**Steps:**
1. While signed in as a landlord, go to: https://web-lovat-sigma-36.vercel.app/my-requests
**You should see:** Redirected to the dashboard
**If something's wrong:** The tenant "My Requests" page loads for a landlord

---

#### TEST-021: Tenant can't visit the landlord dashboard
**What we're testing:** Tenants can't access landlord features
**Steps:**
1. Sign in as a tenant
2. Go to: https://web-lovat-sigma-36.vercel.app/dashboard
**You should see:** Redirected to `/submit` (the tenant's home page)
**If something's wrong:** The landlord dashboard loads for a tenant

---

#### TEST-022: Tenant can't visit properties page
**What we're testing:** Tenants can't manage properties
**Steps:**
1. While signed in as a tenant, go to: https://web-lovat-sigma-36.vercel.app/properties
**You should see:** Redirected to `/submit`
**If something's wrong:** The properties page loads for a tenant

---

#### TEST-023: Tenant can't visit vendors page
**What we're testing:** Tenants can't see vendor information
**Steps:**
1. While signed in as a tenant, go to: https://web-lovat-sigma-36.vercel.app/vendors
**You should see:** Redirected to `/submit`
**If something's wrong:** The vendors page loads for a tenant

---

#### TEST-024: Root page redirects based on role
**What we're testing:** Going to the home page sends you to the right place
**Steps:**
1. Sign in as a landlord and go to: https://web-lovat-sigma-36.vercel.app/
2. Note where you land
3. Sign out, then sign in as a tenant and go to the same URL
4. Note where you land
**You should see:** Landlord lands on `/dashboard`. Tenant lands on `/submit`
**If something's wrong:** Both roles go to the same page, or you see an error

---

## Section 3: Onboarding Wizard

---

#### TEST-025: Wizard loads for new landlord
**What we're testing:** New landlords see the onboarding setup
**Steps:**
1. Sign in as a brand-new landlord (one who hasn't completed onboarding)
2. You should be automatically taken to `/onboarding`
**You should see:** A "Welcome to Liz!" heading with a multi-step wizard. A progress indicator shows you're on step 1
**If something's wrong:** You go straight to the dashboard, or you see a blank page

---

#### TEST-026: Step 1 — Risk Appetite options display
**What we're testing:** The first step shows three AI strategy choices
**Steps:**
1. On the onboarding wizard, look at step 1
**You should see:** Three clickable cards: "Save Money", "Balanced" (marked as recommended), and "Move Fast". Each card has a description explaining what it means
**If something's wrong:** Cards don't display, or "Balanced" isn't marked as recommended

---

#### TEST-027: Step 1 — Can select each option
**What we're testing:** You can click to choose your preference
**Steps:**
1. Click "Save Money" — it should highlight
2. Click "Balanced" — "Save Money" deselects, "Balanced" highlights
3. Click "Move Fast" — same behavior
**You should see:** Only one card is highlighted at a time, with clear visual feedback (border color, checkmark, etc.)
**If something's wrong:** Multiple cards stay selected, or nothing visually changes when you click

---

#### TEST-028: Step 1 — Next button advances
**What we're testing:** Clicking Next takes you to step 2
**Steps:**
1. Select any risk appetite option
2. Click the "Next" button
**You should see:** The wizard advances to step 2 (Delegation Mode). The progress indicator updates
**If something's wrong:** Nothing happens, or you get an error

---

#### TEST-029: Step 2 — Delegation Mode options
**What we're testing:** Step 2 shows automation choices
**Steps:**
1. Advance to step 2
**You should see:** Three cards: "I approve everything" (Manual), "Auto-approve small jobs" (Assist), and "Full autopilot" (Auto). The "Full autopilot" option should appear grayed out or marked "Coming Soon"
**If something's wrong:** All three options are selectable, or the "Coming Soon" label is missing

---

#### TEST-030: Step 2 — Auto-approve slider appears
**What we're testing:** Choosing "Auto-approve small jobs" reveals a cost threshold slider
**Steps:**
1. On step 2, click "Auto-approve small jobs"
2. Look below the cards
**You should see:** A slider appears with a dollar amount range ($50 to $500). The default value should be around $150. Dragging the slider changes the amount in real-time
**If something's wrong:** No slider appears, or the slider doesn't move

---

#### TEST-031: Step 2 — Back button preserves selection
**What we're testing:** Going back doesn't lose your step 1 choice
**Steps:**
1. From step 2, click the "Back" button
2. Look at step 1
**You should see:** Your previous risk appetite selection is still highlighted (whichever card you chose before)
**If something's wrong:** Step 1 resets to nothing selected, or shows a different selection

---

#### TEST-032: Step 3 — Add first property form
**What we're testing:** Step 3 lets you create your first property
**Steps:**
1. Advance to step 3
**You should see:** A form with fields for Property Name, Address, Unit Count, and Monthly Rent. There should also be a "Skip" option
**If something's wrong:** The form doesn't appear, or fields are missing

---

#### TEST-033: Step 3 — Required fields are validated
**What we're testing:** You can't save a property without required info
**Steps:**
1. On step 3, leave all fields empty
2. Click "Save" or "Finish"
**You should see:** Error messages appear under the required fields (at least Property Name and Address)
**If something's wrong:** The form submits with empty fields

---

#### TEST-034: Step 3 — Successfully add a property
**What we're testing:** You can create your first property during onboarding
**Steps:**
1. Type a property name: "My First Property"
2. Type a street address: "100 Main Street"
3. Type a city: "Austin"
4. Type a state: "TX"
5. Type a ZIP code: "78701"
6. Set unit count to 2
7. Set monthly rent to 1500
8. Click "Save" or "Finish"
**You should see:** The wizard completes and you're taken to the main dashboard. Your new property should appear in the dashboard
**If something's wrong:** The save fails, or you end up on a blank page

---

#### TEST-035: Step 3 — Skip property creation
**What we're testing:** You can skip adding a property
**Steps:**
1. On step 3, click "Skip" instead of filling in the form
**You should see:** The wizard completes and takes you to the dashboard with no properties yet (empty state)
**If something's wrong:** The Skip button doesn't work, or it creates a blank property

---

#### TEST-036: Wizard completion saves settings
**What we're testing:** Your onboarding choices are saved to your profile
**Steps:**
1. Complete the entire wizard with specific choices (e.g., "Save Money" + "Manual")
2. After landing on the dashboard, navigate to `/settings`
3. Check the AI Preferences tab
**You should see:** Your settings match what you chose during onboarding
**If something's wrong:** Settings show defaults instead of your choices

---

#### TEST-037: Can't re-visit onboarding after completion
**What we're testing:** Completed onboarding doesn't replay automatically
**Steps:**
1. After completing onboarding, type this in the address bar: https://web-lovat-sigma-36.vercel.app/onboarding
**You should see:** You're redirected to the dashboard (since onboarding is already done)
**If something's wrong:** The onboarding wizard starts over again

---

#### TEST-038: Skip entire onboarding with defaults
**What we're testing:** The "Use default AI settings" skip option works
**Steps:**
1. On step 1 of onboarding, look for a "Use default AI settings" or "Skip" link
2. Click it
**You should see:** You skip the entire wizard and land on the dashboard. Settings should show balanced + manual defaults
**If something's wrong:** The skip link doesn't appear, or it doesn't save defaults

---

## Section 4: Landlord Dashboard

---

#### TEST-039: Dashboard page loads
**What we're testing:** The main dashboard displays correctly
**Steps:**
1. Sign in as a landlord
2. You should land on `/dashboard` (or navigate there via the sidebar)
**You should see:** A loading animation briefly, then the dashboard with stat cards, charts, and recent activity. No blank areas or error messages
**If something's wrong:** The page is blank, stuck loading forever, or shows an error message

---

#### TEST-040: Dashboard with no properties (empty state)
**What we're testing:** The dashboard handles having zero properties gracefully
**Steps:**
1. Sign in as a landlord who has no properties
2. Go to `/dashboard`
**You should see:** A friendly empty state with a message like "Add your first property to get started" and a button to add one. Stats should show zeros
**If something's wrong:** The page crashes or shows broken/random numbers

---

#### TEST-041: Property selector shows all properties
**What we're testing:** The dropdown at the top lists your properties
**Steps:**
1. Sign in as a landlord who has at least 2 properties
2. Look for the property selector/dropdown near the top of the dashboard
3. Click it
**You should see:** "All Properties" as the default selection, plus each of your properties listed by name
**If something's wrong:** The dropdown is empty, or properties are missing

---

#### TEST-042: Filter dashboard by a specific property
**What we're testing:** Selecting a property filters the dashboard data
**Steps:**
1. Click the property selector dropdown
2. Choose a specific property
**You should see:** The stat cards, recent requests, and spend chart all update to show data for only that property. Numbers may change
**If something's wrong:** Nothing changes, or the dashboard goes blank

---

#### TEST-043: Return to "All Properties" view
**What we're testing:** You can go back to the overview
**Steps:**
1. While filtered to a specific property, click the dropdown
2. Select "All Properties"
**You should see:** The dashboard returns to showing combined data for all properties
**If something's wrong:** The filter gets stuck and you can't go back to the overview

---

#### TEST-044: Emergency count stat card
**What we're testing:** The emergency counter shows the right number
**Steps:**
1. On the dashboard, find the stat card that shows emergency issues (usually has a red accent)
2. Note the number shown
**You should see:** The number of emergency-urgency maintenance requests. It should be styled with red/alert colors. If there are no emergencies, it should show 0
**If something's wrong:** The number is negative, shows "NaN", or doesn't match reality

---

#### TEST-045: Open requests stat card
**What we're testing:** The open requests counter works
**Steps:**
1. Find the stat card showing open (active) requests
**You should see:** The total number of requests that haven't been resolved yet. The number should change when you filter by property
**If something's wrong:** The count is wrong or doesn't update when filtering

---

#### TEST-046: Average resolution time stat card
**What we're testing:** The average resolution metric displays correctly
**Steps:**
1. Find the stat card showing average resolution time (in days)
**You should see:** A number like "3.5 days" or "N/A" if no requests have been resolved yet. It should be a reasonable number (not negative or absurdly large)
**If something's wrong:** Shows a negative number, "NaN", or unreasonably large value

---

#### TEST-047: Monthly spend stat card
**What we're testing:** The spending total displays correctly
**Steps:**
1. Find the stat card showing this month's spending
**You should see:** A dollar amount formatted like "$1,250" or "$0" if nothing has been spent. Should update when filtering by property
**If something's wrong:** Shows weird formatting, negative amounts, or "undefined"

---

#### TEST-048: Emergency alert banner appears
**What we're testing:** A warning banner shows when there are emergencies
**Steps:**
1. Make sure at least one maintenance request has "emergency" urgency
2. Look at the top of the dashboard
**You should see:** A red or orange alert banner showing the number of emergency issues, possibly with a link to view them
**If something's wrong:** There are emergencies but no banner, or the banner shows for non-emergencies

---

#### TEST-049: Emergency banner hidden when none exist
**What we're testing:** The banner disappears when there are no emergencies
**Steps:**
1. If possible, make sure no emergency requests exist (or resolve them all)
2. Refresh the dashboard
**You should see:** No emergency banner at the top
**If something's wrong:** A banner shows "0 emergencies" instead of disappearing

---

#### TEST-050: Onboarding banner for new users
**What we're testing:** New landlords see a setup prompt
**Steps:**
1. Sign in as a landlord who hasn't completed onboarding
**You should see:** A banner or card prompting you to complete onboarding, with a button that takes you to `/onboarding`
**If something's wrong:** No onboarding prompt appears for new users

---

#### TEST-051: Onboarding banner hidden after completion
**What we're testing:** The prompt goes away after onboarding
**Steps:**
1. Complete onboarding, then return to the dashboard
**You should see:** No onboarding banner
**If something's wrong:** The onboarding banner still shows after completing setup

---

#### TEST-052: Late payment banner
**What we're testing:** A warning shows when rent is overdue
**Steps:**
1. If any tenant has overdue rent, check the dashboard
**You should see:** A banner indicating overdue payments with the number of affected properties
**If something's wrong:** Overdue rent exists but no banner shows, or the banner shows when no rent is overdue

---

#### TEST-053: Spend chart displays
**What we're testing:** The spending chart renders correctly
**Steps:**
1. Look for the spending chart area on the dashboard (usually a bar or line chart)
**You should see:** A chart showing monthly spending trends. The x-axis shows months, the y-axis shows dollar amounts
**If something's wrong:** The chart area is blank, shows an error, or displays garbled data

---

#### TEST-054: Spend chart with no data
**What we're testing:** The chart handles zero spending gracefully
**Steps:**
1. If no spending has been recorded, look at the chart area
**You should see:** An empty chart with zero line, or a message like "No spending data yet"
**If something's wrong:** The chart crashes or shows random data

---

#### TEST-055: Spend chart filters with property
**What we're testing:** The chart updates when you select a property
**Steps:**
1. Select a specific property from the property selector
2. Look at the spend chart
**You should see:** The chart updates to show only that property's spending. Select "All Properties" to see the aggregate again
**If something's wrong:** The chart doesn't change when filtering

---

#### TEST-056: Recent requests list shows items
**What we're testing:** The dashboard shows your most recent maintenance requests
**Steps:**
1. Look for the "Recent Requests" section on the dashboard
**You should see:** Up to 3 recent maintenance requests, each showing an urgency badge (colored), category, a preview of the tenant's message, and the date
**If something's wrong:** The list is empty when requests exist, or it shows more than expected

---

#### TEST-057: Recent requests — empty state
**What we're testing:** The section handles no requests gracefully
**Steps:**
1. If no maintenance requests exist, look at the Recent Requests section
**You should see:** A message like "No requests yet" — no broken layout or error
**If something's wrong:** Blank space, loading spinner that never stops, or an error

---

#### TEST-058: Recent request urgency badges
**What we're testing:** Color coding matches urgency
**Steps:**
1. Look at the urgency badges on recent requests
**You should see:** Emergency = red badge, Medium = yellow/orange badge, Low = green badge
**If something's wrong:** All badges are the same color, or colors don't match urgency

---

#### TEST-059: Click a recent request to see details
**What we're testing:** Requests are clickable and link to their detail page
**Steps:**
1. Click on any request in the Recent Requests list
**You should see:** You're taken to the request detail page (`/requests/{id}`) with full information about that request
**If something's wrong:** Nothing happens when you click, or you go to the wrong page

---

#### TEST-060: Property drill-down appears when property selected
**What we're testing:** Selecting a property shows its details
**Steps:**
1. Select a specific property from the property selector
2. Look for a drill-down section that appears
**You should see:** Tabs or sections for Documents, Photos, and Utilities for that specific property
**If something's wrong:** No drill-down appears, or it shows wrong data

---

#### TEST-061: Property drill-down — Documents tab
**What we're testing:** You can view documents for a property
**Steps:**
1. In the property drill-down, click the "Documents" tab
**You should see:** A list of documents uploaded for that property, or a "No documents" message if none exist
**If something's wrong:** Tab doesn't load, or shows documents from a different property

---

#### TEST-062: Property drill-down — Photos tab
**What we're testing:** You can view photos for a property
**Steps:**
1. Click the "Photos" tab in the drill-down
**You should see:** Photo thumbnails associated with the property/requests, or "No photos" if none exist
**If something's wrong:** Photos don't load, or show incorrect images

---

#### TEST-063: Property drill-down — Utilities tab
**What we're testing:** You can view utility providers
**Steps:**
1. Click the "Utilities" tab in the drill-down
**You should see:** Utility providers configured for the property (water, electric, gas, etc.), or a "No utilities configured" message
**If something's wrong:** Tab shows error or data from wrong property

---

#### TEST-064: Dashboard desktop layout
**What we're testing:** The dashboard looks right on a computer screen
**Steps:**
1. Open the dashboard on a regular-sized browser window (at least 1024px wide)
**You should see:** Stats cards in a row, sidebar on the left, chart and requests neatly arranged. Everything fits without scrolling sideways
**If something's wrong:** Elements overlap, content spills off-screen, or the layout looks jumbled

---

#### TEST-065: Dashboard tablet layout
**What we're testing:** The dashboard adapts to tablet screens
**Steps:**
1. Resize your browser window to about 800px wide (or test on a tablet)
**You should see:** Stats cards rearrange to 2 columns. Content still readable. No sideways scrolling
**If something's wrong:** Layout breaks, text gets cut off, or you can scroll sideways

---

#### TEST-066: Dashboard mobile layout
**What we're testing:** The dashboard works on phones
**Steps:**
1. Resize your browser to about 375px wide (or open on your phone)
**You should see:** Stats cards stack vertically (one per row). Bottom navigation bar appears. Sidebar is hidden. Everything is readable and scrollable
**If something's wrong:** Content overlaps, text is tiny, or you need to scroll sideways

---

## Section 5: Properties Management

---

#### TEST-067: Properties page loads
**What we're testing:** The properties list page works
**Steps:**
1. Click "Properties" in the sidebar (or go to `/properties`)
**You should see:** A list of your properties as cards, or an empty state if you haven't added any
**If something's wrong:** Blank page, error message, or infinite loading

---

#### TEST-068: Properties empty state
**What we're testing:** The page is helpful when you have no properties
**Steps:**
1. As a landlord with zero properties, go to `/properties`
**You should see:** A "No properties yet" message with a prominent "Add Property" button
**If something's wrong:** A blank page or confusing error

---

#### TEST-069: Properties list displays correctly
**What we're testing:** Property cards show the right info
**Steps:**
1. With at least one property, look at the property cards
**You should see:** Each card shows: property name, address, unit count, and monthly rent amount
**If something's wrong:** Missing information or incorrect values

---

#### TEST-070: Open "Add Property" form
**What we're testing:** The add form slides open
**Steps:**
1. Click the "Add Property" button
**You should see:** A form slides in from the right side with fields for: Property Name, Street Address, Apt/Unit Number, City, State, ZIP Code, Unit Count, and Monthly Rent
**If something's wrong:** Nothing happens, or the form appears broken

---

#### TEST-071: Add Property — empty form validation
**What we're testing:** Required fields are enforced
**Steps:**
1. Open the "Add Property" form
2. Don't fill in anything
3. Click "Save Property"
**You should see:** Error messages under required fields (Property Name, Street Address, City, State, and ZIP Code are required)
**If something's wrong:** The empty form saves successfully

---

#### TEST-072: Add Property — invalid unit count
**What we're testing:** You can't enter zero or negative units
**Steps:**
1. In the add property form, type 0 for Unit Count
2. Try to save
**You should see:** An error message (minimum 1 unit)
**If something's wrong:** A property with 0 units is created

---

#### TEST-073: Add Property — negative rent rejected
**What we're testing:** Rent can't be negative
**Steps:**
1. In the add property form, type -500 for Monthly Rent
2. Try to save
**You should see:** An error message about invalid rent amount
**If something's wrong:** A property with negative rent is saved

---

#### TEST-074: Add Property — successful creation
**What we're testing:** You can add a new property
**Steps:**
1. Click "Add Property"
2. Type Property Name: "Oak Manor"
3. Type Street Address: "123 Oak Street"
4. Type City: "Austin"
5. Type State: "TX"
6. Type ZIP Code: "78701"
7. Set Unit Count to 4
8. Set Monthly Rent to 1200
9. Click "Save Property"
**You should see:** The form closes. A success message appears (like "Property created!"). The new property card appears in the list. You may see a prompt to auto-detect utilities
**If something's wrong:** The form doesn't close, no success message, or the property doesn't appear

---

#### TEST-075: Cancel property creation
**What we're testing:** Closing the form without saving doesn't create anything
**Steps:**
1. Click "Add Property"
2. Fill in some fields
3. Click "Cancel" or the X button to close the form
**You should see:** The form closes without saving. No new property appears
**If something's wrong:** A partial property gets created

---

#### TEST-076: Open edit form for a property
**What we're testing:** You can edit an existing property
**Steps:**
1. Find an existing property card
2. Click the "Edit" button on that card
**You should see:** The form slides open with all fields filled in with the current property data
**If something's wrong:** The form opens empty, or shows wrong data

---

#### TEST-077: Edit form shows correct current data
**What we're testing:** Pre-filled values match what you saved
**Steps:**
1. Open the edit form for a property you know the details of
2. Check each field
**You should see:** Property Name, Street Address, City, State, ZIP Code, Unit Count, and Monthly Rent all match the existing values
**If something's wrong:** Any field shows incorrect data

---

#### TEST-078: Successfully edit a property
**What we're testing:** Changes are saved
**Steps:**
1. Open the edit form for a property
2. Change the name to "Oak Manor Updated"
3. Click "Save Property"
**You should see:** The form closes. A success message appears. The property card now shows "Oak Manor Updated"
**If something's wrong:** The old name still shows, or you get an error

---

#### TEST-079: Edit with address change triggers utility re-detect
**What we're testing:** Changing address prompts utility update
**Steps:**
1. Edit a property and change one or more address fields (street, city, state, or ZIP)
2. Save the property
**You should see:** A prompt asking if you want to re-detect utilities for the new address. Previously confirmed utility entries should be preserved
**If something's wrong:** No re-detect prompt appears, or confirmed utilities get overwritten

---

#### TEST-080: Delete property — confirmation dialog
**What we're testing:** You can't accidentally delete a property
**Steps:**
1. Click "Delete" on a property card
**You should see:** A confirmation dialog asking "Are you sure?" with the property name. Two buttons: "Cancel" and "Delete" (or "Confirm")
**If something's wrong:** The property gets deleted immediately without asking

---

#### TEST-081: Cancel delete
**What we're testing:** Canceling keeps the property
**Steps:**
1. Click "Delete" on a property
2. In the confirmation dialog, click "Cancel"
**You should see:** The dialog closes. The property is still there
**If something's wrong:** The property gets deleted anyway

---

#### TEST-082: Confirm delete
**What we're testing:** Confirming actually removes the property
**Steps:**
1. Click "Delete" on a property you want to remove
2. Click "Confirm" or "Delete" in the dialog
**You should see:** The property disappears from the list. A success message confirms deletion. Any tenants under that property are also removed
**If something's wrong:** The property stays, or you get an error

---

#### TEST-083: View tenants under a property
**What we're testing:** Each property shows its tenants
**Steps:**
1. Find a property that has tenants
2. Expand or click into the property to see the tenant list
**You should see:** Each tenant shows: name, email, phone, unit number, and a lease status badge (green = Active, yellow = Expiring Soon, red = Expired)
**If something's wrong:** Tenant list doesn't appear, or information is missing

---

#### TEST-084: Open "Add Tenant" form
**What we're testing:** You can add tenants to a property
**Steps:**
1. Within a property, click "Add Tenant"
**You should see:** A form with fields for: First Name, Last Name, Email, Phone, Unit Number, Move-in Date, Lease Type, Lease Start, Lease End, and Rent Due Day
**If something's wrong:** Form doesn't open, or fields are missing

---

#### TEST-085: Add Tenant — required field validation
**What we're testing:** First name, last name, and email are required
**Steps:**
1. Open the Add Tenant form
2. Leave First Name empty, click Save
3. Leave Last Name empty, click Save
4. Leave Email empty, click Save
5. Type "not-an-email" in the email field, click Save
**You should see:** Error messages for each: first name required, last name required, email required, invalid email format
**If something's wrong:** The form saves without a name or with an invalid email

---

#### TEST-086: Add Tenant — successful creation
**What we're testing:** You can add a tenant to a property
**Steps:**
1. Fill in: First Name = "Jane", Last Name = "Doe", Email = "jane@test.com", Phone = "555-1234", Unit = "2A"
2. Set Lease Type to "Yearly", Start = today, End = 1 year from today
3. Click "Save Tenant"
**You should see:** The form closes. The new tenant appears under the property with an "Active" green badge
**If something's wrong:** Save fails, or tenant doesn't appear

---

#### TEST-087: Add Tenant — with custom fields
**What we're testing:** You can add extra information to tenants
**Steps:**
1. Open the Add Tenant form
2. Fill in required fields
3. Add a custom field: Key = "Parking Spot", Value = "P12"
4. Add another: Key = "Pet", Value = "Cat"
5. Save
**You should see:** Tenant created with a note showing custom fields count (like "2 custom fields")
**If something's wrong:** Custom fields aren't saved, or the count is wrong

---

#### TEST-088: Edit a tenant
**What we're testing:** You can update tenant information
**Steps:**
1. Click "Edit" on an existing tenant
2. Change the name and phone number
3. Click Save
**You should see:** The form closes. Updated name and phone appear on the tenant card
**If something's wrong:** Old data still shows, or the update fails

---

#### TEST-089: Delete a tenant
**What we're testing:** You can remove a tenant
**Steps:**
1. Click "Delete" on a tenant
2. Confirm in the dialog
**You should see:** The tenant is removed from the property's list
**If something's wrong:** The tenant stays, or you see an error

---

#### TEST-090: Lease status badge — Active
**What we're testing:** Active leases show a green badge
**Steps:**
1. Add or find a tenant with a lease end date more than 60 days in the future
**You should see:** A green "Active" badge on their card
**If something's wrong:** Wrong color or missing badge

---

#### TEST-091: Lease status badge — Expiring Soon
**What we're testing:** Soon-to-expire leases show a yellow badge
**Steps:**
1. Add or edit a tenant with a lease end date less than 60 days from today
**You should see:** A yellow "Expiring Soon" badge
**If something's wrong:** Still shows green "Active" or wrong badge

---

#### TEST-092: Lease status badge — Expired
**What we're testing:** Expired leases show a red badge
**Steps:**
1. Find or create a tenant whose lease end date is in the past
**You should see:** A red "Expired" badge
**If something's wrong:** Shows green or yellow instead

---

#### TEST-093: Open document section
**What we're testing:** You can view documents for a property
**Steps:**
1. Within a property, find the Documents section or button
**You should see:** A document gallery or upload area
**If something's wrong:** The section doesn't appear or shows an error

---

#### TEST-094: Upload a document
**What we're testing:** You can attach files to a property
**Steps:**
1. Click the upload button or drag a file into the upload area
2. Select a document type (like "Lease Agreement")
3. Optionally assign it to a specific tenant
4. Click Upload
**You should see:** The document appears in the gallery showing file name, type, and upload date
**If something's wrong:** Upload fails, file doesn't appear, or you see an error

---

#### TEST-095: View/download a document
**What we're testing:** Uploaded documents can be opened
**Steps:**
1. Click on a document in the gallery
**You should see:** The document opens in a preview (for images/PDFs) or downloads to your computer
**If something's wrong:** Nothing happens, or you get a "file not found" error

---

#### TEST-096: Delete a document
**What we're testing:** You can remove uploaded documents
**Steps:**
1. Click the delete button on a document
2. Confirm the deletion
**You should see:** The document disappears from the gallery
**If something's wrong:** The document stays, or you get an error

---

#### TEST-097: Upload document without tenant assignment
**What we're testing:** Documents can be property-level (not tied to a specific tenant)
**Steps:**
1. Upload a document without selecting a specific tenant
**You should see:** The document appears under the property generally, not under a specific tenant
**If something's wrong:** You're forced to select a tenant, or the upload fails

---

#### TEST-098: Open utility setup
**What we're testing:** You can manage utility providers for a property
**Steps:**
1. Within a property, click the "Utilities" button or tab
**You should see:** A utility setup panel with categories like Water, Electric, Gas, Internet
**If something's wrong:** The panel doesn't open or shows an error

---

#### TEST-099: Auto-detect utilities
**What we're testing:** The AI can suggest utility providers based on the address
**Steps:**
1. In the utility setup, click "Auto-Detect" or a similar button
**You should see:** A loading indicator, then utility providers fill in for each category based on the property's address
**If something's wrong:** Nothing happens, or you get an error during detection

---

#### TEST-100: Manual utility entry
**What we're testing:** You can type in providers yourself
**Steps:**
1. For any utility category, manually type a provider name
2. Save
**You should see:** Your typed provider is saved for that category
**If something's wrong:** Manual entries aren't saved

---

#### TEST-101: Confirm/N-A utilities persist on re-detect
**What we're testing:** Confirmed utilities don't get overwritten
**Steps:**
1. Mark a utility as "Confirmed"
2. Mark another as "N/A" (not applicable)
3. Click re-detect
**You should see:** Confirmed and N/A entries stay unchanged. Only unconfirmed entries get updated
**If something's wrong:** Your confirmed entries get overwritten by auto-detect

---

## Section 6: Vendors Management

---

#### TEST-102: Vendors page loads
**What we're testing:** The vendors page displays correctly
**Steps:**
1. Click "Vendors" in the sidebar (or go to `/vendors`)
**You should see:** A grid of vendor cards, or an empty state if you haven't added any
**If something's wrong:** Blank page, error, or infinite loading

---

#### TEST-103: Vendors empty state
**What we're testing:** The page is helpful when you have no vendors
**Steps:**
1. As a landlord with zero vendors, go to `/vendors`
**You should see:** A "No vendors yet" message with a prominent "Add Vendor" button
**If something's wrong:** Blank page or confusing error

---

#### TEST-104: Vendor card grid layout
**What we're testing:** Vendor cards adapt to screen size
**Steps:**
1. With several vendors, look at the layout at different window sizes
**You should see:** Desktop: 3 columns. Tablet: 2 columns. Mobile: 1 column
**If something's wrong:** Cards overlap, or the grid doesn't adapt

---

#### TEST-105: Open "Add Vendor" form
**What we're testing:** The add vendor form works
**Steps:**
1. Click "Add Vendor"
**You should see:** A form slides in with fields for: Business Name, Phone, Email, Specialty, Priority Rank, Notes, and Custom Fields
**If something's wrong:** Form doesn't open, or fields are missing

---

#### TEST-106: Add Vendor — required fields validated
**What we're testing:** Business Name is required
**Steps:**
1. Leave Business Name empty
2. Click Save
**You should see:** An error message saying the name is required
**If something's wrong:** A vendor is created with no name

---

#### TEST-107: Add Vendor — successful creation
**What we're testing:** You can add a new vendor
**Steps:**
1. Fill in: Business Name = "FastFix Plumbing", Phone = "555-0001", Email = "info@fastfix.com"
2. Select Specialty = "Plumbing"
3. Select Priority Rank = "1st — Preferred"
4. Add Notes: "Available 24/7 for emergencies"
5. Click Save
**You should see:** The form closes, a success message appears, and a new vendor card shows in the grid
**If something's wrong:** Save fails, or the vendor doesn't appear

---

#### TEST-108: Vendor card shows all information
**What we're testing:** Vendor cards display properly
**Steps:**
1. Look at the vendor card you just created
**You should see:** Business name, specialty badge (e.g., "Plumbing"), priority badge (e.g., "1st"), phone number (clickable), email (clickable), notes preview, and custom fields count
**If something's wrong:** Information is missing or incorrectly displayed

---

#### TEST-109: Specialty options list
**What we're testing:** All vendor specialties are available
**Steps:**
1. Open the add/edit vendor form
2. Click the Specialty dropdown
**You should see:** Options for: Plumbing, Electrical, HVAC, Structural, Pest, Appliance, General
**If something's wrong:** Options are missing, or there are duplicate/extra options

---

#### TEST-110: Priority rank options
**What we're testing:** Priority ranking works
**Steps:**
1. Open the vendor form
2. Click the Priority Rank dropdown
**You should see:** Options: Unranked, 1st — Preferred, 2nd, 3rd
**If something's wrong:** Options are missing or incorrectly labeled

---

#### TEST-111: Add vendor with custom fields
**What we're testing:** Extra info can be saved on vendors
**Steps:**
1. Open Add Vendor form
2. Fill required fields
3. Click "Add Custom Field"
4. Enter Key = "License #", Value = "PL-12345"
5. Add another: Key = "Insurance", Value = "Covered"
6. Save
**You should see:** Vendor card shows "2 custom fields" or similar indicator
**If something's wrong:** Custom fields aren't saved or displayed

---

#### TEST-112: Open edit vendor form
**What we're testing:** You can edit existing vendors
**Steps:**
1. Click "Edit" on a vendor card
**You should see:** The form opens with all current vendor data pre-filled
**If something's wrong:** Form opens empty, or shows wrong data

---

#### TEST-113: Edit form shows correct data
**What we're testing:** All fields match the existing vendor
**Steps:**
1. Open edit form for a vendor you know the details of
2. Check each field: name, phone, email, specialty, priority, notes, custom fields
**You should see:** Everything matches what was previously saved
**If something's wrong:** Any field shows incorrect data

---

#### TEST-114: Successfully edit a vendor
**What we're testing:** Changes save properly
**Steps:**
1. Change the business name and phone number
2. Click Save
**You should see:** The form closes, success message appears, and the card shows updated data
**If something's wrong:** Old data still shows, or the update fails

---

#### TEST-115: Delete vendor — confirmation dialog
**What we're testing:** Deleting requires confirmation
**Steps:**
1. Click "Delete" on a vendor card
**You should see:** A confirmation dialog with the vendor name and Cancel/Delete buttons
**If something's wrong:** Vendor deletes immediately without asking

---

#### TEST-116: Cancel vendor delete
**What we're testing:** Canceling keeps the vendor
**Steps:**
1. Click Delete, then click Cancel in the dialog
**You should see:** Dialog closes, vendor still visible
**If something's wrong:** Vendor gets deleted anyway

---

#### TEST-117: Confirm vendor delete
**What we're testing:** Confirming removes the vendor
**Steps:**
1. Click Delete, then Confirm
**You should see:** Vendor card disappears, success message shown
**If something's wrong:** Vendor stays, or you get an error

---

#### TEST-118: Vendors sorted by priority
**What we're testing:** Preferred vendors appear first
**Steps:**
1. Make sure you have vendors with different priority ranks (1st, 2nd, 3rd, Unranked)
2. Look at the order of vendor cards
**You should see:** 1st (Preferred) vendors at the top, then 2nd, then 3rd, then Unranked at the bottom
**If something's wrong:** Vendors appear in random or wrong order

---

#### TEST-119: Phone number is clickable
**What we're testing:** You can call a vendor by clicking their phone
**Steps:**
1. On a vendor card, click the phone number
**You should see:** Your device offers to make a phone call (on mobile) or shows a tel: link action
**If something's wrong:** Nothing happens when clicking the phone number

---

#### TEST-120: Email is clickable
**What we're testing:** You can email a vendor by clicking their email
**Steps:**
1. On a vendor card, click the email address
**You should see:** Your email app opens with the vendor's email pre-filled
**If something's wrong:** Nothing happens when clicking the email

---

## Section 7: Maintenance Requests (Landlord View)

---

#### TEST-121: Requests page loads
**What we're testing:** The requests list page works
**Steps:**
1. Click "Requests" in the sidebar (or go to `/requests`)
**You should see:** A list of maintenance requests or an empty state message
**If something's wrong:** Blank page, error, or infinite loading

---

#### TEST-122: Requests list — desktop view
**What we're testing:** Requests display as a table on desktop
**Steps:**
1. View `/requests` on a wide screen (1024px+)
**You should see:** A scrollable table with columns: Urgency, Category, Property, Tenant, Description, Date, Status. Each row is clickable
**If something's wrong:** Table doesn't render, columns overlap, or rows aren't clickable

---

#### TEST-123: Requests list — mobile view
**What we're testing:** Requests display as cards on mobile
**Steps:**
1. View `/requests` on a narrow screen (<768px, or on your phone)
**You should see:** Request cards stacked vertically, each showing urgency badge, category, tenant name, description preview, and date
**If something's wrong:** Table doesn't convert to cards, or cards look broken

---

#### TEST-124: Tab — All requests
**What we're testing:** The "All" tab shows everything
**Steps:**
1. Click the "All" tab (should be selected by default)
**You should see:** All maintenance requests regardless of status
**If something's wrong:** Some requests are missing

---

#### TEST-125: Tab — Emergency
**What we're testing:** The Emergency tab filters correctly
**Steps:**
1. Click the "Emergency" tab
**You should see:** Only requests with emergency urgency (all should have red badges). Count in the tab should match
**If something's wrong:** Non-emergency requests appear, or emergency ones are missing

---

#### TEST-126: Tab — In Progress
**What we're testing:** The In Progress tab shows active requests
**Steps:**
1. Click "In Progress" tab
**You should see:** Only requests with active statuses (submitted, triaged, approved, dispatched). No resolved or closed requests
**If something's wrong:** Resolved requests appear in this tab

---

#### TEST-127: Tab — Resolved
**What we're testing:** The Resolved tab shows completed requests
**Steps:**
1. Click "Resolved" tab
**You should see:** Only requests that are resolved or closed. No active requests
**If something's wrong:** Active requests appear in this tab

---

#### TEST-128: Filter by property
**What we're testing:** You can see requests for one property only
**Steps:**
1. Use the property filter dropdown
2. Select a specific property
**You should see:** Only requests for that property. Select "All Properties" to see everything again
**If something's wrong:** Filter doesn't work, or shows wrong results

---

#### TEST-129: Filter by urgency
**What we're testing:** You can filter by how urgent requests are
**Steps:**
1. Use the urgency filter dropdown
2. Select "Emergency" — only emergency requests show
3. Select "Medium" — only medium requests show
4. Select "Low" — only low requests show
5. Clear the filter — all urgencies show
**You should see:** The list updates to match your filter selection each time
**If something's wrong:** Filtering doesn't change the list

---

#### TEST-130: Search by tenant name
**What we're testing:** You can search for requests
**Steps:**
1. Type a partial tenant name in the search box
**You should see:** The list filters to show only requests matching that name
**If something's wrong:** Search doesn't filter, or returns wrong results

---

#### TEST-131: Search by description
**What we're testing:** Search works on issue descriptions too
**Steps:**
1. Type a word from an issue description (like "leak" or "broken")
**You should see:** Requests with that word in the description appear
**If something's wrong:** No results when there should be matches

---

#### TEST-132: Combined filters
**What we're testing:** Multiple filters work together
**Steps:**
1. Select a property AND a urgency level
**You should see:** Only requests matching both criteria
**If something's wrong:** Filters conflict or one overrides the other

---

#### TEST-133: Empty filter results
**What we're testing:** The app handles "no matches" gracefully
**Steps:**
1. Apply filters that match no requests
**You should see:** A "No requests found" message — not a blank page or error
**If something's wrong:** Blank list with no explanation, or the page crashes

---

#### TEST-134: Navigate to request detail
**What we're testing:** You can view full details of a request
**Steps:**
1. Click on any request in the list
**You should see:** You're taken to `/requests/{id}` with the full request details. A back link is visible to return to the list
**If something's wrong:** Nothing happens when clicking, or you go to the wrong request

---

#### TEST-135: Tenant message on detail page
**What we're testing:** The tenant's original message is shown
**Steps:**
1. On a request detail page, look for the tenant's message
**You should see:** The full text of what the tenant typed when submitting the issue, along with the tenant's name
**If something's wrong:** Message is missing, truncated, or shows wrong text

---

#### TEST-136: Request photos display
**What we're testing:** Photos attached to requests are visible
**Steps:**
1. Open a request that has photos attached
**You should see:** Photo thumbnails (up to 3) that you can click to view larger. If no photos: appropriate "No photos" text
**If something's wrong:** Photos don't load, show as broken images, or are missing

---

#### TEST-137: Urgency and status badges on detail page
**What we're testing:** Badges display correctly on the detail page
**Steps:**
1. Check the urgency badge: Emergency = red, Medium = yellow, Low = green
2. Check the status badge: shows current status (submitted, triaged, dispatched, etc.)
**You should see:** Correct colors and labels matching the request's actual urgency and status
**If something's wrong:** Wrong colors or labels

---

#### TEST-138: AI Classification card
**What we're testing:** The AI's analysis is shown
**Steps:**
1. On the detail page, look for the AI Classification section
**You should see:** Category (like "Plumbing"), Urgency level (with color), Confidence score (0-100%), and Recommended action text
**If something's wrong:** Classification section is missing, or values seem random

---

#### TEST-139: Cost estimate display
**What we're testing:** The estimated cost range is shown
**Steps:**
1. Look for the cost estimate section on the detail page
**You should see:** A price range like "$50 — $200" formatted as currency
**If something's wrong:** Cost shows as "undefined", negative, or missing entirely

---

#### TEST-140: Vendor selector displays
**What we're testing:** You can choose a vendor for the job
**Steps:**
1. On the detail page, look for the vendor dropdown
**You should see:** A list of your vendors. Vendors matching the request's category should appear first (e.g., plumbing vendors for a plumbing issue)
**If something's wrong:** Vendor list is empty, or vendors aren't sorted by relevance

---

#### TEST-141: Auto-match vendor by category
**What we're testing:** The system suggests relevant vendors first
**Steps:**
1. Open a "Plumbing" request — plumbing vendors should appear first in the dropdown
2. Open an "Electrical" request — electrical vendors should appear first
**You should see:** Category-matching vendors are prioritized in the dropdown
**If something's wrong:** All vendors appear in random order

---

#### TEST-142: Change selected vendor
**What we're testing:** You can switch to a different vendor
**Steps:**
1. Select one vendor from the dropdown
2. Then select a different vendor
**You should see:** The selection updates immediately to the new vendor
**If something's wrong:** Selection doesn't change, or both vendors appear selected

---

#### TEST-143: Work order draft text
**What we're testing:** A work order template is pre-filled
**Steps:**
1. Look for the work order text area on the detail page
**You should see:** Pre-filled text with property details, issue description, and tenant information. The text should be editable
**If something's wrong:** Work order area is blank, or text isn't editable

---

#### TEST-144: Edit work order text
**What we're testing:** You can customize the work order
**Steps:**
1. Click into the work order text area
2. Add a note like "Please call tenant before arriving"
3. Click somewhere else on the page
**You should see:** Your changes stay (the text isn't reset). If you navigate away and come back, changes may or may not persist depending on if auto-save is implemented
**If something's wrong:** Text resets immediately after editing

---

#### TEST-145: Approve & Dispatch — button disabled without vendor
**What we're testing:** You can't dispatch without selecting a vendor
**Steps:**
1. Make sure no vendor is selected
2. Look at the "Approve & Dispatch" button
**You should see:** The button is grayed out or disabled
**If something's wrong:** You can click dispatch without a vendor selected

---

#### TEST-146: Approve & Dispatch — successful
**What we're testing:** Dispatching a request works
**Steps:**
1. Select a vendor
2. Review/edit the work order text
3. Click "Approve & Dispatch"
**You should see:** A loading indicator briefly, then a success message. The request status changes to "dispatched". The dispatch date/time is shown. The Approve button becomes disabled
**If something's wrong:** Nothing happens, you get an error, or the status doesn't update

---

#### TEST-147: Already dispatched request
**What we're testing:** You can't dispatch the same request twice
**Steps:**
1. Go to a request that was already dispatched
**You should see:** The Approve button is disabled. Status shows "dispatched" with the date. Vendor and work order details are still visible
**If something's wrong:** The dispatch button is still active

---

#### TEST-148: Resolve a dispatched request
**What we're testing:** You can mark a request as resolved
**Steps:**
1. Go to a dispatched request
2. Look for a "Resolve" button
3. Click it
**You should see:** The request status changes to "resolved". The resolve date is shown
**If something's wrong:** Resolve fails, or the button isn't available

---

#### TEST-149: Invalid request ID — 404
**What we're testing:** Bad URLs are handled gracefully
**Steps:**
1. Type a fake URL: https://web-lovat-sigma-36.vercel.app/requests/fake-id-12345
**You should see:** A "Request not found" message, not a crash. Navigation still works
**If something's wrong:** Blank page, crash, or a technical error stack trace

---

#### TEST-150: Request detail — desktop layout
**What we're testing:** The detail page looks right on desktop
**Steps:**
1. Open a request detail page on a wide screen
**You should see:** Two-column layout — request details/photos on the left, AI classification/vendor/dispatch on the right
**If something's wrong:** Elements overlap or all stack vertically on desktop

---

#### TEST-151: Request detail — mobile layout
**What we're testing:** The detail page works on mobile
**Steps:**
1. Open a request detail on a phone or narrow window
**You should see:** Single-column layout with everything stacked. Approve button at the bottom (possibly sticky). Everything readable
**If something's wrong:** Content overlaps, text is cut off, or the dispatch button is unreachable

---

#### TEST-152: Back link returns to list
**What we're testing:** You can go back to the requests list
**Steps:**
1. From a request detail page, click the back link/arrow
**You should see:** You return to `/requests` with the same filters/tab you had before
**If something's wrong:** Back link is missing, or you go to the wrong page

---

## Section 8: Tenant Submit Flow

---

#### TEST-153: Submit page loads
**What we're testing:** The tenant submission form works
**Steps:**
1. Sign in as a tenant
2. Go to `/submit`
**You should see:** A form with a text area to describe the issue and an area to upload photos
**If something's wrong:** Blank page, error message, or form doesn't appear

---

#### TEST-154: Tenant profile detected
**What we're testing:** The system knows which property the tenant belongs to
**Steps:**
1. On the submit page, check that there's no error about "property not found"
**You should see:** The page loads normally — the tenant is linked to their landlord's property
**If something's wrong:** An error message about missing property or tenant profile

---

#### TEST-155: Description field placeholder and validation
**What we're testing:** The text field provides guidance
**Steps:**
1. Look at the text area — it should have placeholder text like "Describe the issue..."
2. Try to submit without typing anything
**You should see:** The placeholder text disappears when you start typing. Submitting empty shows a validation error
**If something's wrong:** No placeholder, or empty form submits successfully

---

#### TEST-156: Photo uploader works
**What we're testing:** You can attach photos to your request
**Steps:**
1. Look for the photo upload area
2. Click it to select files, or drag a photo into it
**You should see:** A file selection dialog opens (or drag-and-drop works). After selecting, you see a preview of the photo. You can select multiple files
**If something's wrong:** Upload area doesn't respond, or no preview shows

---

#### TEST-157: Submit with description only (no photos)
**What we're testing:** You can submit without photos
**Steps:**
1. Type a description: "Water is leaking from the kitchen ceiling"
2. Don't add any photos
3. Click "Submit Request"
**You should see:** A loading indicator, then the request is created. You'll see the gatekeeper response
**If something's wrong:** Submission fails, or you're forced to add photos

---

#### TEST-158: Submit with photos
**What we're testing:** Photos are included with the request
**Steps:**
1. Type a description: "Broken window in bedroom"
2. Add 1-3 photos
3. Click "Submit Request"
**You should see:** Loading indicator for uploading photos, then for submitting. The request is created with photos attached
**If something's wrong:** Photos fail to upload, or the request is created without the photos

---

#### TEST-159: Submit button state changes
**What we're testing:** The button prevents double-submission
**Steps:**
1. Fill in a description
2. Watch the submit button as you click it
**You should see:** While idle: "Submit Request". While uploading: "Uploading..." (disabled). While submitting: "Submitting..." (disabled). After success: button disappears or changes
**If something's wrong:** Button stays enabled during submission, or text doesn't change

---

#### TEST-160: Gatekeeper — self-resolvable issue
**What we're testing:** The AI suggests troubleshooting for minor issues
**Steps:**
1. Submit a minor issue like "My garbage disposal isn't working"
**You should see:** A gatekeeper response with troubleshooting steps (e.g., "Try pressing the reset button on the bottom"). Two buttons: "Issue Resolved" and "Escalate to Landlord"
**If something's wrong:** No troubleshooting guide, or it goes straight to the landlord

---

#### TEST-161: Resolve — tenant self-fixes
**What we're testing:** The "Issue Resolved" button works
**Steps:**
1. After seeing the gatekeeper response, click "Issue Resolved"
**You should see:** A success screen confirming the issue is resolved. You should be able to submit a new request
**If something's wrong:** Nothing happens, or you get an error

---

#### TEST-162: Escalate — tenant needs help
**What we're testing:** The "Escalate to Landlord" button works
**Steps:**
1. After seeing the gatekeeper response, click "Escalate to Landlord"
**You should see:** A confirmation like "Request sent to your landlord." You should be able to submit another request
**If something's wrong:** Escalation fails, or no confirmation appears

---

#### TEST-163: Gatekeeper — serious issue (skip troubleshooting)
**What we're testing:** Dangerous issues go straight to the landlord
**Steps:**
1. Submit a serious issue like "I smell gas in my apartment"
**You should see:** The gatekeeper skips troubleshooting and directly offers to escalate to the landlord. It may show urgent safety instructions
**If something's wrong:** You see trivial troubleshooting steps for a gas leak

---

#### TEST-164: AI Classification runs after submit
**What we're testing:** The AI categorizes the request
**Steps:**
1. Submit a request and note the gatekeeper response
2. Sign in as the landlord and check the request
**You should see:** The request has AI classification: category (plumbing, electrical, etc.), urgency (low/medium/emergency), and confidence score
**If something's wrong:** Request shows without classification, or category seems completely wrong

---

#### TEST-165: Photo analysis by AI
**What we're testing:** Photos help the AI classify better
**Steps:**
1. As a tenant, submit a request with photos of the issue
2. As the landlord, check the request detail
**You should see:** Photos visible on the detail page. The AI classification may account for what's visible in the photos
**If something's wrong:** Photos aren't shown on landlord's view

---

#### TEST-166: Upload failure handling
**What we're testing:** The app handles photo upload errors gracefully
**Steps:**
1. Try uploading a very large file (>20MB) or an unsupported format (like .exe)
**You should see:** An error message explaining the problem. You can remove the bad file and try again. The form still works
**If something's wrong:** The page crashes, or the upload silently fails

---

#### TEST-167: Submit failure handling
**What we're testing:** The app handles submission errors
**Steps:**
1. If the submission API fails (e.g., network issue)
**You should see:** An error message. Your description text is still in the form (not cleared). You can retry
**If something's wrong:** Form data is lost, or no error is shown

---

#### TEST-168: End-to-end — submit, escalate, landlord views
**What we're testing:** The complete flow from tenant to landlord
**Steps:**
1. **As tenant:** Submit a request with a description and 1 photo
2. **As tenant:** See gatekeeper response, click "Escalate to Landlord"
3. **As tenant:** See success confirmation
4. **As landlord:** Go to `/requests`
5. **As landlord:** Find the new request in the list (it should show urgency badge)
6. **As landlord:** Click to view details at `/requests/{id}`
7. **As landlord:** Verify: tenant message, photo, AI classification, cost estimate are all present
8. **As landlord:** Select a vendor, edit work order, click "Approve & Dispatch"
**You should see:** Each step works smoothly from tenant submission all the way through landlord dispatch
**If something's wrong:** Any step fails, data is missing, or the request doesn't appear for the landlord

---

#### TEST-169: End-to-end — submit, self-resolve
**What we're testing:** Tenant resolves their own issue
**Steps:**
1. **As tenant:** Submit a minor issue (e.g., "Light bulb burned out in hallway")
2. **As tenant:** See troubleshooting guide, click "Issue Resolved"
3. **As tenant:** See success confirmation
4. **As landlord:** Go to `/requests` > "Resolved" tab
5. **As landlord:** Find the resolved request
**You should see:** The request shows as resolved in the landlord's request list
**If something's wrong:** The resolved request doesn't appear for the landlord

---

#### TEST-170: Submit another request after completing one
**What we're testing:** You can submit multiple requests in a session
**Steps:**
1. Complete a full submit → gatekeeper → resolve/escalate flow
2. Navigate to `/submit` again
**You should see:** A fresh, empty form ready for a new submission
**If something's wrong:** The old submission data still shows, or the form is disabled

---

#### TEST-171: Submit page on mobile
**What we're testing:** The submission form works on phones
**Steps:**
1. Open `/submit` on a mobile device or narrow window
**You should see:** Text area is full-width, photo uploader works, submit button is easily tappable
**If something's wrong:** Elements overlap, button is too small, or layout is broken

---

## Section 9: Tenant My Requests

---

#### TEST-172: My Requests page loads
**What we're testing:** Tenants can see their submitted requests
**Steps:**
1. Sign in as a tenant
2. Go to `/my-requests`
**You should see:** A list of your previously submitted requests, or an empty state if you haven't submitted any
**If something's wrong:** Blank page, error, or infinite loading

---

#### TEST-173: Empty state with submit link
**What we're testing:** New tenants get guidance
**Steps:**
1. As a tenant with zero requests, go to `/my-requests`
**You should see:** A "No requests yet" message with a button or link to "Submit a Request" that goes to `/submit`
**If something's wrong:** Blank page, or no link to submit

---

#### TEST-174: Request list shows correctly
**What we're testing:** Request cards display proper info
**Steps:**
1. With submitted requests, look at the cards
**You should see:** Each card shows: urgency badge, category, description preview, date, and status
**If something's wrong:** Missing information or wrong values

---

#### TEST-175: Tab — All
**What we're testing:** The "All" tab shows everything
**Steps:**
1. Click the "All" tab (should be default)
**You should see:** All your requests, both active and resolved
**If something's wrong:** Some requests are missing

---

#### TEST-176: Tab — Active
**What we're testing:** Active tab filters to open requests
**Steps:**
1. Click the "Active" tab
**You should see:** Only requests with non-resolved statuses. No resolved or closed requests
**If something's wrong:** Resolved requests appear

---

#### TEST-177: Tab — Resolved
**What we're testing:** Resolved tab shows completed requests
**Steps:**
1. Click the "Resolved" tab
**You should see:** Only resolved or closed requests
**If something's wrong:** Active requests appear

---

#### TEST-178: Empty tab state
**What we're testing:** Empty tabs are handled gracefully
**Steps:**
1. Click a tab that has no matching requests
**You should see:** A "No requests" message with a link to submit a new one
**If something's wrong:** Blank space with no explanation

---

#### TEST-179: Navigate to request detail
**What we're testing:** You can view your request details
**Steps:**
1. Click on any request card
**You should see:** Full details at `/my-requests/{id}` — your message, photos, urgency badge, status, category
**If something's wrong:** Click doesn't work, or wrong request loads

---

#### TEST-180: Detail page is read-only
**What we're testing:** Tenants can't dispatch or edit requests
**Steps:**
1. On a request detail page as a tenant
**You should see:** Your message, photos, AI classification info — but NO vendor selector, NO work order editor, NO dispatch button
**If something's wrong:** You see landlord-only controls like "Approve & Dispatch"

---

#### TEST-181: AI classification visible to tenant
**What we're testing:** Tenants can see how their issue was categorized
**Steps:**
1. On a request detail, look for the classification info
**You should see:** Category (with icon), urgency badge, status badge, and recommended action text
**If something's wrong:** Classification section is missing for tenants

---

#### TEST-182: Metadata card on detail
**What we're testing:** Request metadata displays correctly
**Steps:**
1. On a request detail, look for metadata like submitted date, property name, and request ID
**You should see:** All three pieces of information displayed clearly
**If something's wrong:** Metadata is missing or shows wrong values

---

#### TEST-183: Request not found for invalid ID
**What we're testing:** Bad URLs show a friendly error
**Steps:**
1. Go to: https://web-lovat-sigma-36.vercel.app/my-requests/fake-id-99999
**You should see:** "Request not found" message — not a crash
**If something's wrong:** Blank page, crash, or technical error

---

#### TEST-184: Tenant sees only their own requests
**What we're testing:** One tenant can't see another's requests
**Steps:**
1. Submit 2 requests as Tenant A
2. Sign in as Tenant B (different account)
3. Go to `/my-requests`
**You should see:** Tenant B sees only their own requests (or empty state), NOT Tenant A's requests
**If something's wrong:** Tenant B can see Tenant A's requests

---

#### TEST-185: Tenant can't access another tenant's request detail
**What we're testing:** Direct URL to another tenant's request is blocked
**Steps:**
1. Copy a request ID from Tenant A's request
2. Sign in as Tenant B
3. Try to access `/my-requests/{tenantA-request-id}`
**You should see:** "Not found" or an error — NOT Tenant A's request details
**If something's wrong:** Tenant B can view Tenant A's private request

---

## Section 10: Settings

---

#### TEST-186: Settings page loads
**What we're testing:** The settings page works
**Steps:**
1. Click "Settings" in the sidebar (or go to `/settings`)
**You should see:** A page with two tabs: "AI Preferences" and "Notifications". AI Preferences tab is selected by default
**If something's wrong:** Blank page, missing tabs, or error

---

#### TEST-187: Risk Appetite cards display
**What we're testing:** AI preference options show correctly
**Steps:**
1. On the AI Preferences tab, look at the Risk Appetite section
**You should see:** Three clickable cards: "Save Money", "Balanced" (marked recommended), "Move Fast". Your current selection is highlighted
**If something's wrong:** Cards don't display, or current selection isn't highlighted

---

#### TEST-188: Change Risk Appetite
**What we're testing:** You can switch your AI strategy
**Steps:**
1. Click "Save Money" — it highlights
2. Click "Move Fast" — "Save Money" deselects, "Move Fast" highlights
3. Notice the "Save Changes" button becomes enabled
**You should see:** Only one card selected at a time, with the save button becoming active after any change
**If something's wrong:** Multiple selections, or save button stays disabled

---

#### TEST-189: Delegation Mode cards display
**What we're testing:** Automation level options show correctly
**Steps:**
1. Look at the Delegation Mode section
**You should see:** Three cards: "I approve everything" (Manual), "Auto-approve small jobs" (Assist), "Full autopilot" (Auto — marked as coming soon/grayed out)
**If something's wrong:** Missing cards, or "Full autopilot" is selectable when it shouldn't be

---

#### TEST-190: Auto-approve slider appears for Assist mode
**What we're testing:** The cost threshold slider shows when needed
**Steps:**
1. Click "Auto-approve small jobs"
**You should see:** A slider appears below with a range of $50 to $500, defaulting to $150. Dragging changes the dollar value in real-time
**If something's wrong:** No slider appears, or the slider doesn't move

---

#### TEST-191: Slider hidden for Manual mode
**What we're testing:** The slider disappears when not needed
**Steps:**
1. Click "I approve everything" (Manual)
**You should see:** The auto-approve slider disappears
**If something's wrong:** Slider stays visible in Manual mode

---

#### TEST-192: Switch to Notifications tab
**What we're testing:** The second tab works
**Steps:**
1. Click the "Notifications" tab
**You should see:** Notification settings with toggle switches
**If something's wrong:** Tab doesn't switch, or content is blank

---

#### TEST-193: Emergency alerts toggle
**What we're testing:** You can control emergency notifications
**Steps:**
1. On the Notifications tab, find the "Emergency alerts" toggle
2. Click it to switch on/off
**You should see:** The toggle switches state. The "Save Changes" button becomes enabled
**If something's wrong:** Toggle doesn't respond, or save button stays disabled

---

#### TEST-194: All request alerts toggle
**What we're testing:** You can control all-request notifications
**Steps:**
1. Find the "All request alerts" toggle
2. Switch it
**You should see:** Toggle changes state, save button becomes enabled
**If something's wrong:** Same as above

---

#### TEST-195: Save button disabled when nothing changed
**What we're testing:** The save button knows when there are no changes
**Steps:**
1. Load the settings page without changing anything
**You should see:** "Save Changes" button is grayed out/disabled
**If something's wrong:** Save button is enabled with no changes

---

#### TEST-196: Successfully save settings
**What we're testing:** Changes are saved
**Steps:**
1. Change the Risk Appetite and toggle a notification setting
2. Click "Save Changes"
**You should see:** Loading indicator briefly, then a success message like "Settings saved!" The save button returns to disabled state
**If something's wrong:** Save fails, no success message, or button stays enabled

---

#### TEST-197: Verify settings persist
**What we're testing:** Changes survive page navigation
**Steps:**
1. Save some settings changes
2. Navigate to `/dashboard`
3. Come back to `/settings`
**You should see:** All your previously saved settings are still selected correctly
**If something's wrong:** Settings reverted to defaults

---

#### TEST-198: Save from Notifications tab
**What we're testing:** Both tabs save together
**Steps:**
1. Change something on AI Preferences tab
2. Switch to Notifications tab and change a toggle
3. Click "Save Changes"
**You should see:** Both the AI preference change and notification change are saved
**If something's wrong:** Only one tab's changes are saved

---

#### TEST-199: Re-run onboarding button exists
**What we're testing:** You can redo the onboarding wizard
**Steps:**
1. Look for a "Re-run onboarding" button on the settings page
**You should see:** A button that lets you restart the onboarding wizard
**If something's wrong:** No re-run button exists

---

#### TEST-200: Re-run onboarding works
**What we're testing:** Clicking re-run takes you through onboarding again
**Steps:**
1. Click "Re-run onboarding"
**You should see:** You're taken to `/onboarding`. The wizard starts from step 1. You can complete it again
**If something's wrong:** Nothing happens, or you get an error

---

#### TEST-201: Settings after re-run onboarding
**What we're testing:** Onboarding updates overwrite previous settings
**Steps:**
1. Re-run onboarding and choose different options than before
2. Complete the wizard
3. Go to `/settings`
**You should see:** Settings reflect your new onboarding choices
**If something's wrong:** Old settings remain despite choosing new ones in onboarding

---

## Section 11: Navigation & Layout

---

#### TEST-202: Landlord sidebar renders (desktop)
**What we're testing:** The sidebar navigation appears on wide screens
**Steps:**
1. Sign in as a landlord on a desktop-sized browser (1024px+ wide)
**You should see:** A left sidebar with the "Liz" brand/logo, plus links for: Dashboard, Requests, Properties, Vendors, Settings. Your profile picture/initials at the bottom
**If something's wrong:** Sidebar is missing, or links are incomplete

---

#### TEST-203: Sidebar active state
**What we're testing:** The current page is highlighted in the sidebar
**Steps:**
1. Navigate to each page by clicking sidebar links
2. Check which link is highlighted after each click
**You should see:** On `/dashboard`: Dashboard highlighted. On `/requests`: Requests highlighted. And so on for each page
**If something's wrong:** Wrong link highlighted, or no highlighting at all

---

#### TEST-204: Sidebar navigation works
**What we're testing:** All sidebar links navigate correctly
**Steps:**
1. Click Dashboard — goes to `/dashboard`
2. Click Requests — goes to `/requests`
3. Click Properties — goes to `/properties`
4. Click Vendors — goes to `/vendors`
5. Click Settings — goes to `/settings`
**You should see:** Each click takes you to the right page. Pages load without a full refresh (smooth transition)
**If something's wrong:** Links go to wrong pages, or the whole page reloads each time

---

#### TEST-205: Mobile bottom navigation appears
**What we're testing:** Phone users get bottom navigation
**Steps:**
1. Sign in as a landlord
2. Make your browser window narrow (<1024px) or open on a phone
**You should see:** A bottom navigation bar with icons for Dashboard, Requests, Properties, Vendors, Settings. The sidebar is hidden
**If something's wrong:** Both sidebar and bottom nav show, or neither shows

---

#### TEST-206: Mobile bottom nav active state
**What we're testing:** The current page's icon is highlighted on mobile
**Steps:**
1. On mobile, tap each nav icon and check if it highlights
**You should see:** The currently active page's icon is visually distinguished (different color or weight)
**If something's wrong:** No active indicator, or wrong icon highlighted

---

#### TEST-207: Bottom nav doesn't overlap content
**What we're testing:** You can see everything with the bottom nav
**Steps:**
1. On mobile, scroll to the bottom of any page
**You should see:** All content is visible — the bottom nav doesn't cover the last items on the page. Content scrolls independently of the nav
**If something's wrong:** The last card or button is hidden behind the bottom nav

---

#### TEST-208: Tenant sees tenant navigation only
**What we're testing:** Tenants don't see landlord menu items
**Steps:**
1. Sign in as a tenant
2. Look at the navigation (sidebar or bottom nav)
**You should see:** Only "Submit" (or "New Request") and "My Requests". NO Dashboard, Properties, Vendors, or Settings links
**If something's wrong:** Tenant sees landlord navigation items

---

#### TEST-209: Tenant mobile navigation
**What we're testing:** Tenant bottom nav is correct on mobile
**Steps:**
1. Sign in as tenant on mobile
**You should see:** Bottom nav with only tenant items (Submit, My Requests). Tapping navigates correctly
**If something's wrong:** Landlord items appear, or navigation doesn't work

---

#### TEST-210: User button / Sign out
**What we're testing:** The profile button works
**Steps:**
1. Click your profile picture or initials (usually in the sidebar or header)
**You should see:** A dropdown with options like "Profile" and "Sign Out"
**If something's wrong:** Nothing happens when clicking

---

#### TEST-211: Sign out via user button
**What we're testing:** Signing out from the profile dropdown
**Steps:**
1. Click profile picture, then "Sign Out"
**You should see:** You're logged out and redirected to `/sign-in`
**If something's wrong:** You stay logged in, or get an error

---

#### TEST-212: Desktop layout (1024px+)
**What we're testing:** Wide screen layout
**Steps:**
1. Use a browser at 1024px or wider
**You should see:** Sidebar on left, bottom nav hidden, content uses remaining width, multi-column layouts where appropriate
**If something's wrong:** Layout is cramped or broken

---

#### TEST-213: Tablet layout (768px–1023px)
**What we're testing:** Medium screen layout
**Steps:**
1. Resize browser to about 900px wide
**You should see:** Content adapts — cards may go to 2 columns, sidebar may be hidden, no horizontal scrollbar
**If something's wrong:** Horizontal scrollbar appears, or content is unreadable

---

#### TEST-214: Mobile layout (<768px)
**What we're testing:** Small screen layout
**Steps:**
1. Resize to about 375px or open on phone
**You should see:** Single-column layout, bottom nav visible, all text readable without zooming, buttons big enough to tap (at least 44px)
**If something's wrong:** Text is tiny, buttons are too small, or you need to scroll sideways

---

#### TEST-215: Very small screen (320px)
**What we're testing:** Ultra-narrow screens still work
**Steps:**
1. Resize browser to 320px wide
**You should see:** Content is still readable, no overlapping elements, forms still usable, navigation functional
**If something's wrong:** Elements overlap, text is cut off, or the app is unusable

---

#### TEST-216: Loading states between pages
**What we're testing:** Page transitions feel smooth
**Steps:**
1. Navigate between different pages via the sidebar
**You should see:** A brief loading indicator (skeleton, spinner) before content appears. No flash of unstyled content
**If something's wrong:** Content pops in jarringly, or loading never finishes

---

#### TEST-217: Sheet/form behavior — slide in
**What we're testing:** Add/edit forms appear correctly
**Steps:**
1. Click "Add Property" (or Add Vendor, Add Tenant)
**You should see:** A panel slides smoothly from the right side of the screen
**If something's wrong:** Form appears abruptly, or doesn't appear at all

---

#### TEST-218: Sheet/form — close by clicking outside
**What we're testing:** You can dismiss forms by clicking the backdrop
**Steps:**
1. Open any form sheet (Add Property, etc.)
2. Click on the dimmed/grayed-out area behind the form
**You should see:** The form closes
**If something's wrong:** Clicking outside doesn't close it

---

#### TEST-219: Sheet/form — close with Escape key
**What we're testing:** The Escape key closes forms
**Steps:**
1. Open any form sheet
2. Press the Escape key on your keyboard
**You should see:** The form closes
**If something's wrong:** Nothing happens when pressing Escape

---

#### TEST-220: Sheet/form on mobile
**What we're testing:** Forms work on small screens
**Steps:**
1. On mobile, open any form (Add Property, Add Vendor, etc.)
**You should see:** The form takes up most of the screen. All fields are usable. You can scroll within the form if it's long
**If something's wrong:** Form is too small to use, or extends beyond the screen

---

## Section 12: Edge Cases & Error Handling

---

#### TEST-221: Dashboard empty — no properties
**What we're testing:** Dashboard doesn't crash with zero data
**Steps:**
1. Sign in as landlord with 0 properties, go to `/dashboard`
**You should see:** Friendly empty state with guidance to add your first property. Stats show zeros. No crashes
**If something's wrong:** Page crashes or shows garbled data

---

#### TEST-222: Properties page — no properties
**What we're testing:** Properties page empty state
**Steps:**
1. With 0 properties, go to `/properties`
**You should see:** "No properties yet" message with working "Add Property" button
**If something's wrong:** Blank page or error

---

#### TEST-223: Vendors page — no vendors
**What we're testing:** Vendors page empty state
**Steps:**
1. With 0 vendors, go to `/vendors`
**You should see:** "No vendors yet" message with working "Add Vendor" button
**If something's wrong:** Blank page or error

---

#### TEST-224: Requests page — no requests
**What we're testing:** Requests page empty state
**Steps:**
1. With 0 requests, go to `/requests`
**You should see:** "No requests found" message. Tabs still visible and clickable
**If something's wrong:** Blank list, or tabs don't work

---

#### TEST-225: Tenant my-requests — no requests
**What we're testing:** Tenant empty state
**Steps:**
1. As tenant with 0 requests, go to `/my-requests`
**You should see:** "No requests yet" with a "Submit a Request" link that goes to `/submit`
**If something's wrong:** Blank page or no link to submit

---

#### TEST-226: Property form — unit count boundary: 1
**What we're testing:** Minimum valid unit count
**Steps:**
1. Open Add Property, set Unit Count = 1
2. Save
**You should see:** Property saves successfully with 1 unit
**If something's wrong:** Rejected when it should be accepted

---

#### TEST-227: Property form — very long name
**What we're testing:** Long text doesn't break the layout
**Steps:**
1. Open Add Property
2. Type a very long name (200+ characters)
3. Save and check the card
**You should see:** Property saves. The card handles the long name gracefully (truncates or wraps)
**If something's wrong:** Name overflows and breaks the layout

---

#### TEST-228: Tenant form — valid email formats
**What we're testing:** Common email formats are accepted
**Steps:**
1. Try saving a tenant with email "test@example.com" — should work
2. Try "user+tag@domain.co" — should work
**You should see:** Both email formats are accepted
**If something's wrong:** Valid emails are rejected

---

#### TEST-229: Tenant form — invalid email format
**What we're testing:** Bad emails are caught
**Steps:**
1. Try saving a tenant with email "not-an-email"
**You should see:** An error message about invalid email format
**If something's wrong:** The invalid email is accepted

---

#### TEST-230: Tenant form — lease date logic
**What we're testing:** Lease dates make sense
**Steps:**
1. Set Lease Start = today, Lease End = 1 year from today — should work
2. Set Lease Start after Lease End (backwards dates)
**You should see:** Normal dates are accepted. Backwards dates should show a warning or be rejected
**If something's wrong:** Backwards dates are silently accepted

---

#### TEST-231: Vendor form — phone formatting
**What we're testing:** Phone numbers are handled flexibly
**Steps:**
1. Enter "5551234567" (just digits)
2. Enter "(555) 123-4567" (formatted)
3. Save each
**You should see:** Both formats are accepted
**If something's wrong:** One format is rejected

---

#### TEST-232: Submit form — very long description
**What we're testing:** Long text doesn't break submission
**Steps:**
1. As tenant, type a very long issue description (2000+ characters)
2. Submit
**You should see:** The request is created successfully
**If something's wrong:** Submission fails due to length, or text is silently truncated

---

#### TEST-233: Network offline — page behavior
**What we're testing:** The app handles lost internet gracefully
**Steps:**
1. Open any page
2. Turn off your internet connection (airplane mode, or disconnect WiFi)
3. Try to navigate or interact
**You should see:** An error message or indication that you're offline — NOT a blank white screen
**If something's wrong:** Blank white page, or the app pretends everything is fine

---

#### TEST-234: Slow network — loading states
**What we're testing:** The app shows progress on slow connections
**Steps:**
1. In Chrome, open Developer Tools (F12), go to Network tab
2. Select "Slow 3G" from the throttle dropdown
3. Navigate to `/dashboard`
**You should see:** Loading spinners or skeleton placeholders while data loads. Page eventually renders
**If something's wrong:** No loading indicators, infinite spinner, or the page never loads

---

#### TEST-235: Invalid request ID in URL
**What we're testing:** Bad URLs don't crash the app
**Steps:**
1. Go to: https://web-lovat-sigma-36.vercel.app/requests/00000000-0000-0000-0000-000000000000
**You should see:** "Not found" message with working navigation
**If something's wrong:** App crashes or shows a technical error

---

#### TEST-236: Expired/cleared session
**What we're testing:** Stale sessions redirect to sign-in
**Steps:**
1. Sign in to the app
2. Clear your browser cookies (or wait for the session to expire)
3. Try to interact with the app
**You should see:** You're redirected to the sign-in page
**If something's wrong:** You see an error page, or sensitive data is still visible

---

#### TEST-237: Double-click prevention on submit
**What we're testing:** Rapid clicking doesn't create duplicate requests
**Steps:**
1. As tenant, fill in a request and rapidly click "Submit Request" twice
**You should see:** Only ONE request is created. The button disables after the first click
**If something's wrong:** Two duplicate requests appear

---

#### TEST-238: Double-click prevention on dispatch
**What we're testing:** Rapid clicking doesn't dispatch twice
**Steps:**
1. As landlord on a request detail, rapidly click "Approve & Dispatch" twice
**You should see:** Only one dispatch action occurs. Button disables after first click
**If something's wrong:** Duplicate dispatch calls

---

#### TEST-239: Rapid page navigation
**What we're testing:** Quick page switching doesn't crash the app
**Steps:**
1. Rapidly click through sidebar items: Dashboard → Requests → Properties → Vendors → Settings → Dashboard
**You should see:** No crashes, no errors, the final page renders correctly
**If something's wrong:** App freezes, shows old data, or crashes

---

#### TEST-240: Delete property with tenants
**What we're testing:** Deleting a property cleans up associated tenants
**Steps:**
1. Create a property and add 2 tenants to it
2. Delete the property
**You should see:** Property and both tenants are removed. No orphaned tenant records appear elsewhere
**If something's wrong:** Property deletes but tenants remain without a property

---

#### TEST-241: Delete property with requests
**What we're testing:** Requests are handled when their property is deleted
**Steps:**
1. Create a property, submit a request against it
2. Delete the property
**You should see:** The request is handled gracefully (removed or marked appropriately). No broken references on the requests page
**If something's wrong:** Requests show with a missing/blank property name

---

#### TEST-242: Edit property — changes reflect elsewhere
**What we're testing:** Name changes propagate through the app
**Steps:**
1. Edit a property's name
2. Check the dashboard property selector
3. Check the requests page
**You should see:** The new property name appears everywhere, not the old one
**If something's wrong:** Old name appears on some pages

---

#### TEST-243: Delete vendor assigned to a request
**What we're testing:** The app handles missing vendors gracefully
**Steps:**
1. Assign a vendor to a request (dispatch it)
2. Delete that vendor
3. View the dispatched request
**You should see:** The request detail handles the missing vendor gracefully (shows "Vendor removed" or similar, not a crash)
**If something's wrong:** Request detail page crashes

---

#### TEST-244: Filters reset with no matching results
**What we're testing:** You can clear filters easily
**Steps:**
1. On `/requests`, apply filters that match nothing
2. See "No requests found"
3. Clear all filters
**You should see:** The full request list returns
**If something's wrong:** Filters get stuck and you can't see your requests

---

#### TEST-245: Very long vendor notes
**What we're testing:** Long text is handled on cards
**Steps:**
1. Add a vendor with 500+ character notes
**You should see:** The vendor card shows a truncated preview of the notes (not the full text overflowing the card)
**If something's wrong:** Card layout breaks due to long text

---

#### TEST-246: Dashboard load performance
**What we're testing:** The dashboard loads quickly
**Steps:**
1. Navigate to the dashboard and time how long it takes to fully load
**You should see:** Full content visible within 3 seconds on a normal connection
**If something's wrong:** Takes more than 5 seconds, or the page never fully loads

---

#### TEST-247: Properties page with many items
**What we're testing:** Performance with lots of properties
**Steps:**
1. If you have 10+ properties, navigate to `/properties`
**You should see:** Page renders without lag. Scrolling is smooth
**If something's wrong:** Page is slow to render, or scrolling is janky

---

#### TEST-248: Memory stability
**What we're testing:** The app doesn't slow down over time
**Steps:**
1. Navigate between different pages 10+ times (Dashboard → Properties → Requests → Vendors → back, etc.)
**You should see:** The app remains responsive throughout
**If something's wrong:** Each page load gets slower, or the app eventually freezes

---

#### TEST-249: Rent due day boundary values
**What we're testing:** Rent due day accepts valid day numbers
**Steps:**
1. Add a tenant with rent due day = 1 (first of month)
2. Edit to rent due day = 31 (last of month)
**You should see:** Both values are accepted
**If something's wrong:** Valid day numbers are rejected

---

#### TEST-250: Custom field with special characters
**What we're testing:** Special characters in custom fields don't break anything
**Steps:**
1. Add a tenant or vendor with custom field: Key = "Notes/Comments", Value = "Has a dog & cat <3"
**You should see:** The field saves and displays correctly, including special characters
**If something's wrong:** Characters are escaped weirdly, or the save fails

---

#### TEST-251: Photo drag-and-drop on submit
**What we're testing:** Drag-and-drop photo upload works
**Steps:**
1. As tenant on `/submit`, drag a photo from your desktop onto the upload area
**You should see:** The photo is accepted and a preview appears
**If something's wrong:** Nothing happens on drop, or you get an error

---

#### TEST-252: Multiple photo upload
**What we're testing:** You can attach multiple photos at once
**Steps:**
1. On the submit page, select 3 photos at once (hold Ctrl/Cmd while clicking)
**You should see:** All 3 photos show previews
**If something's wrong:** Only 1 photo uploads, or the app crashes

---

## Section 13: Cross-Browser & Accessibility

---

#### TEST-253: Chrome — full functionality
**What we're testing:** Everything works in Chrome
**Steps:**
1. Open the app in the latest Chrome
2. Navigate through: sign-in, dashboard, properties, vendors, requests
**You should see:** Everything renders correctly and all interactions work
**If something's wrong:** Any feature is broken in Chrome

---

#### TEST-254: Firefox — full functionality
**What we're testing:** Everything works in Firefox
**Steps:**
1. Open the app in the latest Firefox
2. Navigate through main pages and test a form submission
**You should see:** Everything renders correctly, forms submit properly, no layout differences
**If something's wrong:** Layout looks different, or features don't work

---

#### TEST-255: Safari — full functionality
**What we're testing:** Everything works in Safari
**Steps:**
1. If you have access to Safari, open the app
2. Test main flows including date inputs (Safari has a different date picker)
**You should see:** Everything works correctly
**If something's wrong:** Date fields don't work, or layout issues appear

---

#### TEST-256: Mobile Chrome (Android)
**What we're testing:** Touch interactions work on Android
**Steps:**
1. Open the app on an Android phone in Chrome
2. Test: tap navigation, fill a form, scroll lists
**You should see:** Touch interactions are responsive, bottom nav works, forms usable with on-screen keyboard
**If something's wrong:** Taps don't register, or the keyboard covers input fields

---

#### TEST-257: Mobile Safari (iOS)
**What we're testing:** The app works on iPhones
**Steps:**
1. Open the app on an iPhone in Safari
2. Test main flows
**You should see:** No viewport issues, forms work with iOS keyboard, everything renders correctly
**If something's wrong:** Pages zoom in unexpectedly, or forms don't work

---

#### TEST-258: Keyboard navigation — Tab key
**What we're testing:** You can navigate without a mouse
**Steps:**
1. On any page, press Tab repeatedly
**You should see:** Focus moves through each interactive element (buttons, links, form fields) in a logical order. Each focused element has a visible outline/ring
**If something's wrong:** Focus jumps randomly, or you can't see where focus is

---

#### TEST-259: Keyboard — Enter activates buttons
**What we're testing:** Keyboard-only interaction works
**Steps:**
1. Tab to a button
2. Press Enter
**You should see:** The button activates (same as clicking it)
**If something's wrong:** Nothing happens on Enter

---

#### TEST-260: Keyboard — Escape closes modals
**What we're testing:** Escape key is universally supported
**Steps:**
1. Open a form sheet or dialog
2. Press Escape
**You should see:** The sheet/dialog closes
**If something's wrong:** Escape doesn't close it

---

#### TEST-261: Form field labels
**What we're testing:** Screen readers can identify form fields
**Steps:**
1. Open any form (Add Property, Add Vendor, etc.)
2. Click inside each field
**You should see:** Each field has a visible label above or near it. Clicking the label moves focus to the field
**If something's wrong:** Fields have no labels, or labels don't focus the field

---

#### TEST-262: Button accessible names
**What we're testing:** Buttons are descriptive
**Steps:**
1. Look at all buttons on a page
**You should see:** Every button has readable text or an icon with a tooltip. No blank/unnamed buttons
**If something's wrong:** Buttons with only icons and no tooltip or label

---

#### TEST-263: Image alt text
**What we're testing:** Photos have descriptions for accessibility
**Steps:**
1. On a request detail with photos, hover over the photos
**You should see:** Photos have alt text (you can check in browser inspector, or hover to see a tooltip)
**If something's wrong:** Photos have empty alt text or no alt attribute

---

#### TEST-264: Color contrast — text readability
**What we're testing:** Text is easy to read
**Steps:**
1. Browse through all pages
**You should see:** All text is clearly readable against its background. Light gray text on white is a common issue to look for
**If something's wrong:** You have to squint or lean in to read text

---

#### TEST-265: Information not only via color
**What we're testing:** Colorblind users can still understand the UI
**Steps:**
1. Look at urgency badges and lease status badges
**You should see:** In addition to color, badges also have text labels (like "Emergency", "Active", "Expired")
**If something's wrong:** Urgency is conveyed only by color with no text label

---

## Bugs Found

Record any bugs here during testing. Include as much detail as possible!

| Bug # | Test Case | What Happened | What Should Have Happened | Screenshot | Severity |
|-------|-----------|---------------|---------------------------|------------|----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

**Severity Guide:**
- **Blocker** — The feature doesn't work at all, blocks other testing
- **Major** — The feature mostly works but has a significant problem
- **Minor** — Small issue that doesn't block usage (cosmetic, typo, alignment)
- **Cosmetic** — Purely visual, doesn't affect functionality

---

## Testing Complete!

Thank you for testing Liz! Your work helps us build a better product for landlords and tenants.

**Total test cases:** 265
**Estimated time:** ~2.5–3 hours for a full pass

When you're done, save this file with your results and share it with the team.

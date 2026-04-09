# 08 — Settings

**Status:** Not Started | In Progress | Complete
**Tester:** _________________
**Date:** _________________

**Prerequisite:** Signed in as landlord with onboarding completed.

---

## 8.1 Settings Page Load

### TC-8.1.1: Page renders
- [ ] Navigate to `/settings`
- [ ] Page loads without errors
- [ ] Two tabs visible: "AI Preferences" and "Notifications"
- [ ] Current settings loaded from API

### TC-8.1.2: Default tab
- [ ] "AI Preferences" tab selected by default
- [ ] AI preference options visible

---

## 8.2 AI Preferences Tab

### TC-8.2.1: Risk Appetite options
- [ ] Three cards displayed: Save Money, Balanced, Move Fast
- [ ] "Balanced" marked as recommended
- [ ] Current selection highlighted (matches profile)
- [ ] Clicking a card selects it (visual feedback)

### TC-8.2.2: Change Risk Appetite
- [ ] Select "Save Money" (cost_first)
- [ ] Card shows selected state
- [ ] "Save Changes" button becomes enabled
- [ ] Select "Move Fast" (speed_first)
- [ ] Previous selection deselects

### TC-8.2.3: Delegation Mode options
- [ ] Three cards: "I approve everything" (manual), "Auto-approve small jobs" (assist), "Full autopilot" (auto)
- [ ] "Full autopilot" marked as coming soon or disabled
- [ ] Current selection highlighted

### TC-8.2.4: Auto-approve threshold (assist mode)
- [ ] Select "Auto-approve small jobs"
- [ ] Slider appears for auto-approve threshold
- [ ] Slider range: $50 — $500
- [ ] Default value: $150
- [ ] Drag slider — value updates in real-time
- [ ] Value formatted as currency

### TC-8.2.5: Threshold hidden for other modes
- [ ] Select "I approve everything" — threshold slider hidden
- [ ] Select "Full autopilot" — cannot select (disabled)

---

## 8.3 Notifications Tab

### TC-8.3.1: Switch to notifications tab
- [ ] Click "Notifications" tab
- [ ] Notification settings visible

### TC-8.3.2: Emergency alerts toggle
- [ ] Toggle for "Emergency alerts" visible
- [ ] Current state matches profile (on/off)
- [ ] Toggle switch works — flips state
- [ ] "Save Changes" button becomes enabled after change

### TC-8.3.3: All request alerts toggle
- [ ] Toggle for "All request alerts" visible
- [ ] Current state matches profile
- [ ] Toggle switch works

---

## 8.4 Saving Settings

### TC-8.4.1: Save button state
- [ ] On page load with no changes: "Save Changes" button disabled
- [ ] After making any change: button becomes enabled
- [ ] Button shows at bottom of page (sticky)

### TC-8.4.2: Successful save
- [ ] Change Risk Appetite and notification toggle
- [ ] Click "Save Changes"
- [ ] Loading indicator during API call
- [ ] Toast notification: "Settings saved" (or similar)
- [ ] Button returns to disabled state (no unsaved changes)

### TC-8.4.3: Verify persistence
- [ ] Save settings
- [ ] Navigate away to `/dashboard`
- [ ] Return to `/settings`
- [ ] Settings reflect previously saved values
- [ ] No regression to defaults

### TC-8.4.4: Save from notifications tab
- [ ] Switch to Notifications tab
- [ ] Toggle a notification setting
- [ ] Click "Save Changes"
- [ ] Both AI preferences and notification changes saved

---

## 8.5 Re-Run Onboarding

### TC-8.5.1: Re-run onboarding button
- [ ] "Re-run onboarding" button visible on settings page
- [ ] Click the button
- [ ] Confirmation dialog or immediate redirect to `/onboarding`

### TC-8.5.2: Onboarding re-runs
- [ ] After clicking re-run: redirected to `/onboarding`
- [ ] Wizard shows from step 1
- [ ] Previous settings may be pre-selected (or default)
- [ ] Can complete onboarding again
- [ ] After completion: returns to `/dashboard` with updated settings

---

## Issues Found

| # | Test Case | Description | Severity | Screenshot |
|---|-----------|-------------|----------|------------|
| | | | | |

---

**Completion:** ___/16 test cases passed

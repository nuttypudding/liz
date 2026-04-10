---
id: 221
title: Build communication reviewer UI — inline review component
tier: Opus
depends_on: [210, 214]
feature: P3-003-legal-compliance-engine
---

# 221 — Communication Reviewer UI

## Objective
Build an inline UI component for reviewing landlord messages before sending. Displays flagged text with severity colors, shows suggested corrections, and allows override with acknowledgment. Integrates into existing communication features (tenant messages, maintenance requests, etc.).

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

Before landlords communicate with tenants, the compliance engine should scan for fair housing violations and improper language. The communication reviewer provides real-time feedback without blocking communication.

## Implementation

1. **Create CommunicationReviewerPanel component** — `apps/web/components/compliance/CommunicationReviewerPanel.tsx`
   - Props:
     - `messageText: string` — The text to review
     - `propertyId: uuid` — Property for jurisdiction context
     - `onReviewComplete: (findings, safe) => void` — Callback when review done
     - `isOpen: boolean` — Control panel visibility
     - `onClose: () => void` — Close callback
   - This component calls POST /api/compliance/review and displays results

2. **Component layout**:
   - **Header**:
     - Title: "Message Review"
     - Close button (X)
     - DisclaimerBanner: "This AI review does not replace legal counsel."

   - **Status section** (initially):
     - While loading: Spinner + "Reviewing your message for compliance..."
     - After review: Overall risk level badge (low/medium/high with color)
     - Safe-to-send indicator: Green checkmark + "Safe to send" OR Red X + "Review findings before sending"

   - **Findings section**:
     - If no findings: Green checkmark + "No issues found"
     - If findings exist: List of findings organized by severity

   - **Finding item**:
     - Severity color indicator (red for error, orange for warning)
     - Severity label (ERROR | WARNING)
     - Type label (fair_housing | notice_language | disclosure | other)
     - "Flagged text" in gray box with red highlight/underline
     - "Reason" explaining the issue
     - "Suggestion" showing recommended correction in green box
     - "Copy suggestion" button to copy corrected text to clipboard

   - **Action buttons**:
     - "Send Anyway" button (red/warning style) — if there are findings
     - "Edit Message" button — returns focus to text editor
     - "Send Message" button (green/success style) — only if safe_to_send is true

3. **Display modes**:
   - **Modal/drawer**:
     - Full-screen overlay (on mobile) or side drawer (on desktop)
     - Triggered from message textarea
     - Can be dismissed and reopened

   - **Inline panel**:
     - Appears below message textarea
     - Always visible while editing
     - Compact view that expands on click

4. **Integration points** (where this component is used):
   - Tenant messaging feature (if exists)
   - Maintenance request communication
   - Custom location: `/app/(landlord)/compliance/messages/review` page for testing
   - Notice generator preview (optional, for notice text)

5. **User flows**:

   **Happy path (no findings)**:
   - User types message
   - Clicks "Review" button
   - Component shows "No issues found"
   - User clicks "Send Message"
   - Message sent

   **Issues found, user accepts suggestion**:
   - User types message with problematic language
   - Clicks "Review" button
   - Component highlights issues with severity colors
   - User clicks "Copy suggestion" for each issue
   - User manually updates message with suggestions
   - User clicks "Review" again
   - No issues on re-review
   - User sends message

   **Issues found, user ignores**:
   - User types message with issues
   - Clicks "Review" button
   - Issues highlighted
   - User clicks "Send Anyway" button
   - Confirmation dialog: "Are you sure? This message may violate fair housing laws. I take full responsibility."
   - User checks checkbox to confirm
   - Message sent with acknowledgment logged

6. **State management**:
   - Store review findings in React state or parent component
   - Cache findings while user edits (clear on text change)
   - Track whether user acknowledged "send anyway"

7. **Design patterns**:
   - Use existing card, button, badge components
   - Red (#ef4444) for error severity
   - Orange (#f97316) for warning severity
   - Green (#22c55e) for suggestions
   - Gray (#e5e7eb) for quoted/flagged text
   - Use DisclaimerBanner at top

8. **Loading and error states**:
   - Show spinner while fetching review from API
   - If API error: Show error message + "Try again" button
   - Handle network timeout gracefully

9. **Storybook story** — `apps/web/components/compliance/CommunicationReviewerPanel.stories.tsx`
   - Show loading state
   - Show no-findings state
   - Show with multiple findings (warnings + errors)
   - Show different message types (short, long, with special characters)

10. **Update endpoints.md**
    - Document new component and its integration points

## Acceptance Criteria
1. [ ] CommunicationReviewerPanel component created
2. [ ] Calls POST /api/compliance/review on mount
3. [ ] Displays overall_risk_level with color coding
4. [ ] Shows all findings with severity, type, flagged_text, reason, suggestion
5. [ ] Supports "Copy suggestion" button for each finding
6. [ ] "Send Anyway" button triggers confirmation dialog
7. [ ] "Send Anyway" action logs acknowledgment to compliance_audit_log
8. [ ] DisclaimerBanner displayed at top
9. [ ] Loading state with spinner
10. [ ] Error state with retry button
11. [ ] Responsive design (modal on mobile, drawer on desktop)
12. [ ] Storybook stories created
13. [ ] No TypeScript errors

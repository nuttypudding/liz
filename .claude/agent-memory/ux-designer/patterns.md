# UX Patterns — Liz Dashboard

## Mobile-First Navigation
- Tenant: sticky bottom nav bar (Submit, My Requests) — 2 items max
- Landlord mobile: sticky bottom nav (Dashboard, Requests, Properties, Vendors) — 4 items
- Landlord desktop: sidebar-07 (collapses to icons at md breakpoint)
- Use `use-mobile` hook from shadcn to detect mobile and swap navigation component

## Gatekeeper Response Pattern
- After form submit: replace submit form with a full-screen response card
- Two large CTA buttons: "This fixed it" (outlined/secondary) and "I still need help" (primary)
- This is NOT a modal — it replaces the page content to feel like a native app transition

## RequestCard Pattern
- Mobile: full-width card, urgency badge top-right, category icon left, status bottom
- Desktop: table row or card in grid
- Emergency cards: use `border-l-4 border-red-500` left accent to draw the eye

## Photo Uploader Pattern
- On mobile: single large "Take Photo / Choose File" button that opens native picker
- On desktop: drag-and-drop zone + file input
- Preview grid: 3 columns of thumbnails with remove (X) button on each
- Use `aspect-square` thumbnails for consistent grid

## Cost Estimate Display
- Show as: "$150 – $400 (AI Estimate)"
- Confidence: small progress bar or text "(High / Medium / Low confidence)"
- Always include disclaimer text: "Based on typical market rates"

## Work Order Draft
- Use Textarea (shadcn) — pre-filled with AI draft, fully editable
- Label: "AI-Generated Work Order" with edit indicator
- Save on blur, not on submit — reduce friction

## Empty States
- Use `empty` component from shadcn
- Landlord no properties: EmptyMedia with icon, CTA "Add Your First Property"
- Landlord no vendors: CTA "Add Vendor"
- Tenant no requests: CTA "Submit a Request"

## Approval Flow
- "Approve & Send" uses AlertDialog for confirmation — not a direct action
- After confirmation: Sonner toast "Work order sent to [vendor name]"
- Button becomes disabled/loading during API call, then shows success state

---
id: 223
title: Build legal knowledge base UI — topic grid + detail views
tier: Opus
depends_on: [210, 217]
feature: P3-003-legal-compliance-engine
---

# 223 — Legal Knowledge Base UI

## Objective
Build a legal knowledge base UI where landlords can browse and search jurisdiction rules by topic. Displays rule text, statute citations, and jurisdiction-specific details in an organized, searchable format.

## Context
Reference: `features/inprogress/P3-003-legal-compliance-engine/README.md`

The knowledge base empowers landlords to understand the legal rules governing their properties. It's both an educational tool and a reference they can cite for compliance decisions.

## Implementation

1. **Create knowledge base page** — `apps/web/app/(landlord)/compliance/knowledge-base/page.tsx`
   - Main entry point for browsing jurisdiction rules

2. **Page layout**:
   - **Header**:
     - Title: "Legal Knowledge Base"
     - Subtitle: "Understand the rules for your jurisdiction"
     - DisclaimerBanner: "This information is educational. Consult a licensed attorney for legal advice."

   - **Jurisdiction filter**:
     - State selector (dropdown): "All states" or specific state
     - City selector (dropdown): Only shows if state selected
     - Default to user's property jurisdictions (if multiple properties with same state, pre-select that state)
     - "Filter" button or auto-filter on change

   - **Search bar**:
     - Full-text search across rule_text and statute_citation
     - Placeholder: "Search rules, statutes, keywords..."
     - Search icon + input field
     - "Clear search" button (visible when search text present)

   - **Topic grid** (main content):
     - Organized by major categories:
       - Notice Requirements
       - Security Deposits & Move-Out
       - Habitability & Maintenance
       - Fair Housing & Discrimination
       - Rent Control & Increases
       - Other Local Rules
     - Each category is an accordion (collapsible section)
     - Each topic in the category is a card:
       - Topic name as title
       - Brief description (first 50 chars of rule_text)
       - Jurisdiction badge (state + city, or statewide)
       - "View details" link/button
     - Cards are clickable → expand to detail view or modal

   - **Empty states**:
     - If no jurisdiction selected: "Select a jurisdiction to view rules"
     - If search returns no results: "No rules found matching '[search term]'. Try different keywords."

3. **Topic detail view** (modal or expanded card):
   - **Modal layout** (preferred):
     - Opens as overlay when clicking topic card
     - Closeable with X button or escape key
     - Content:
       - Topic name as heading
       - Jurisdiction badge (state + city)
       - **Rule text section**:
         - Full rule_text displayed with proper formatting
         - Highlighted key terms or amounts
       - **Statute citation section**:
         - Statute_citation displayed as link (if available, link to official statute site)
         - "Copy citation" button
       - **Details section** (JSONB details displayed):
         - Structured data from jurisdiction_rules.details:
           - Amount limits (e.g., "2 months rent")
           - Time periods (e.g., "30 days")
           - Exemptions (e.g., "New construction exempt for 15 years")
           - Special notes (jurisdiction-specific context)
         - Formatted as key-value pairs or list
       - **Last verified date**:
         - "Last verified on [date]"
         - Small note: "Rules change frequently. Always verify with official sources."
       - **Related rules section** (optional):
         - Show up to 3 related topics in same category
         - E.g., if viewing "Security deposit limit", show "Return deadline" and "Deductions"
         - Links to jump to those rules
       - **Action buttons**:
         - "Print/Save" button (optional)
         - "Copy full rule text" button
         - Close button

   - **Accordion layout** (alternative):
     - Topics expand in place instead of modal
     - Same content structure
     - Accordion item shows collapsed title + description
     - Expanded state shows full rule text + citation

4. **Topic organization** (hierarchy):
   ```
   Notice Requirements
   ├── Entry notice period
   ├── Eviction notice period
   ├── Rent increase notice period
   └── Lease termination notice period

   Security Deposits
   ├── Deposit limit
   ├── Return deadline
   ├── Deductible items
   └── Interest accrual

   Habitability
   ├── Landlord duty to maintain
   ├── Tenant repair-and-deduct
   └── Habitability standards

   Fair Housing
   ├── Discrimination protections
   ├── Reasonable accommodations
   └── Service/emotional support animals

   Rent Control
   ├── Rent increase caps
   ├── Just cause requirements
   └── Rent control exemptions

   Other
   └── Jurisdiction-specific rules
   ```

5. **Interactive features**:
   - **Breadcrumb navigation**: "Knowledge Base > Notice Requirements > Entry Notice"
   - **Previous/Next buttons** (in modal): Jump to prev/next rule in category
   - **Favorite/bookmark** (optional): Save rules for quick reference
   - **Share rule** (optional): Copy link to rule

6. **Responsive design**:
   - Grid on desktop (3-4 columns)
   - 2 columns on tablet
   - Single column on mobile
   - Modal full-screen on mobile, drawer on tablet, centered modal on desktop

7. **Design patterns**:
   - Use DisclaimerBanner at top
   - Use existing card, button, badge components
   - Use modal/dialog component for detail view
   - Use accordion component for topic categories
   - Use sheet component for side drawer (mobile detail view, optional)
   - Color coding: Different color per major category (notice, deposit, habitability, etc.)

8. **Loading and error states**:
   - Show skeleton loaders while fetching rules
   - Error message if search fails: "Could not load rules. Try again."
   - Error message if jurisdiction not found

9. **Filtering logic**:
   - State filter: Show all rules for that state (both statewide + city rules for cities in that state)
   - City filter: Show statewide rules + city-specific rules
   - Search: Full-text match on rule_text and statute_citation
   - Combine all filters (state AND city AND search)

10. **Update endpoints.md**
    - Document new page: /compliance/knowledge-base

## Acceptance Criteria
1. [ ] Knowledge base page created at /app/(landlord)/compliance/knowledge-base
2. [ ] Topic grid organized by major categories (accordion)
3. [ ] State and city filters work correctly
4. [ ] Full-text search across rule_text and statute_citation
5. [ ] Topic detail modal shows full rule text, statute citation, details
6. [ ] Details section displays JSONB details as key-value pairs
7. [ ] Related rules section shows related topics
8. [ ] Copy buttons work for citation and rule text
9. [ ] DisclaimerBanner displayed at top
10. [ ] Empty states handled (no jurisdiction, no search results)
11. [ ] Responsive design for mobile, tablet, desktop
12. [ ] Modal/expanded card view with close button
13. [ ] Previous/Next navigation in detail view
14. [ ] Color-coded by category (optional but nice)
15. [ ] endpoints.md updated

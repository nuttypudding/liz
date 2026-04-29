# BrightStep.AI — Feature Planner

> **Usage**: `/plan-feature <feature-name>`
> Example: `/plan-feature payment-integration`
> Creates a detailed feature plan at `features/planned/<feature-name>/README.md`

---

## Instructions for Claude

You are creating a comprehensive feature plan for BrightStep.AI. Follow these steps **exactly** in order.

### Step 0: Read Context

1. Read `plan/README.md` for the strategic plan overview
2. Read `plan/15-mvp-zero-ikigai.md` for current MVP context
3. Read `plan/06-tech-stack.md` for the tech stack
4. Read `plan/DECISION_LOG.md` for recent decisions
5. Scan `features/planned/` for existing planned features (avoid overlap)
6. Scan `features/completed/` for completed features (understand what's built)

### Step 1: Parse Feature Name

The argument `$ARGUMENTS` is the feature name (kebab-case slug).

- If no argument provided, ask the user: "What feature would you like to plan? Give me a short name (e.g., `admin-dashboard`, `payment-integration`, `student-onboarding`)."
- Normalize to kebab-case: `Payment Integration` → `payment-integration`
- Target directory: `features/planned/<feature-name>/`

### Step 1.5: Create Ticket & Branch

1. **Create a ticket**: Read `.claude/tickets.md`, find the highest ticket number (`T-(\d{3})`), and append a new row to the Open Tickets table:
   ```
   | T-NNN | <YYYY-MM-DD> | new-feature | Plan feature: <feature-name> | — | open | — | — |
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/T-NNN-<feature-name>
   ```

3. **Update the ticket** Branch column with `feature/T-NNN-<feature-name>` and set status to `in-progress`.

### Step 2: Check for Existing Plan

```bash
ls features/planned/<feature-name>/ 2>/dev/null
```

- If a `README.md` already exists, ask the user: "A plan already exists at `features/planned/<feature-name>/README.md`. Do you want to (a) revise the existing plan, or (b) start fresh?"
- If revising, read the existing plan first and work from it.

### Step 3: Gather Requirements

Use `AskUserQuestion` to ask the user up to 4 key questions about the feature. Tailor the questions to the feature, but common ones include:

- What problem does this feature solve? Who is the primary user?
- What's the scope — MVP version vs full version?
- Are there any specific technologies or libraries you want to use (or avoid)?
- Should this integrate with any existing agents, services, or infrastructure?

If the feature name is self-explanatory and the user provided context in their initial message, you may skip some questions — use judgment.

### Step 4: Research

Before writing the plan, do targeted research:

1. **Codebase**: Search the existing codebase for related code, models, agents, or tools that the feature would interact with.
2. **Web**: If the feature involves external services, APIs, or libraries, search the web for current best practices, documentation, and pricing.
3. **Architecture fit**: Check how the feature maps to the DDD bounded contexts (`plan/03-ddd-architecture.md`) and the agent architecture (`plan/14-agent-architecture.md`).

### Step 5: Write the Feature Plan

Create `features/planned/<feature-name>/README.md` following this template structure. Adapt sections as needed — not every feature needs every section. The goal is a document comprehensive enough that any developer (or Claude) can implement from it.

```markdown
# <Feature Title> — BrightStep.AI

**Status**: PLANNED — Awaiting Review
**Created**: <today's date>
**Scope**: <one-line description>
**Decision**: <why this feature exists and any key strategic choice>

---

## TL;DR

<2-3 sentence summary of what this feature does, what tech it uses, and why it matters. Written for someone skimming.>

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| ... | ... | ... |

<Only include if the feature introduces new technologies. Skip if it only uses existing stack.>

---

## Architecture

<ASCII diagram or description of how components connect. Show data flow, service boundaries, and integration points with existing systems.>

---

## What It Does

<Detailed breakdown of the feature's functionality. Use sub-sections for distinct panels, pages, workflows, or capabilities. Include:>
- What the user sees / experiences
- What data flows where
- What queries / APIs are involved

---

## Integration Points

<How this feature connects to existing BrightStep systems:>
- Which existing agents, tools, or services does it interact with?
- What database tables does it read/write?
- What API endpoints does it expose or consume?

---

## Data Flow

<Step-by-step description of how data moves through the system for key user actions. Include any real-time / streaming considerations.>

---

## File Structure

<Proposed directory layout for new files this feature creates.>

---

## Implementation Tasks

| # | Task | Effort | Depends On |
|---|------|--------|------------|
| 1 | ... | ... | — |

**Total estimated effort**: ~X hours.

<Break down into concrete, independently-testable tasks. Each task should be completable in 15-60 minutes. Include effort estimates. Show dependencies between tasks.>

---

## Open Questions

<Numbered list of unresolved decisions. These should be answerable before or during implementation, not blockers.>
```

### Step 6: Validate the Plan

After writing, verify:

- [ ] Feature name directory exists: `features/planned/<feature-name>/README.md`
- [ ] No overlap with existing planned or completed features
- [ ] Tech choices are consistent with `plan/06-tech-stack.md`
- [ ] Architecture fits within DDD bounded contexts
- [ ] Implementation tasks are ordered by dependency
- [ ] Effort estimates are included
- [ ] Open questions are listed (it's OK to have none)

### Step 7: Update Tracking

**All four updates below are MANDATORY. Do not skip any.**

1. **Add a row to `plan/DECISION_LOG.md`**:
   ```
   | <date> | Plan feature: <feature-name> | <brief rationale>. Plan at `features/planned/<feature-name>/`. Ticket T-NNN. | PLANNED |
   ```

2. **Update `plan/README.md`** if needed — add the feature to any relevant roadmap or "planned features" section.

3. **MANDATORY — Update `features/roadmap.md`**: Read the file, find the appropriate phase table, and add a new row for this feature with status `[ ]`, the next feature `#`, a link to the plan, today's date, a one-line summary, and any dependency feature numbers. This is the single source of truth for feature tracking — a feature that isn't in the roadmap doesn't exist.

4. **Update ticket status** in `.claude/tickets.md` to `in-progress`.

### Step 8: Present to User

Show the user:
- **Ticket**: T-NNN (`new-feature`)
- **Branch**: `feature/T-NNN-<feature-name>`
- A summary of the plan (TL;DR + task count + estimated effort)
- The file path: `features/planned/<feature-name>/README.md`
- Any open questions that need their input
- Ask: "Does this plan look good? Want me to adjust anything before we move forward?"

---

## Quality Standards

- **Comprehensive but concise**: The plan should be complete enough to implement from, but avoid padding. Every section should earn its place.
- **Implementation-ready tasks**: Each task should be a clear unit of work with implicit acceptance criteria. Someone reading the task should know exactly what "done" looks like.
- **Honest effort estimates**: Don't undercount. Include time for testing, edge cases, and integration.
- **Existing patterns first**: Prefer patterns already established in the codebase over introducing new ones.
- **Reference existing features**: Link to `features/planned/admin-dashboard/README.md` or `features/planned/observability/README.md` as examples when the feature has similar structure.

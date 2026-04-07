---
name: log-bug
description: Log a new bug to the ticket tracker (.claude/tickets.md). Creates a trackable ticket with category and next steps.
---

# /log-bug — Create Bug Ticket

Bug description: `$ARGUMENTS`

If no description provided, ask the user.

## Steps

### 1. Determine Category

Ask the user:
- **bug-fix-dev** — Bug only affects local development
- **bug-fix-prod** — Bug is in production

### 2. Find Next Ticket Number

Read `.claude/tickets.md`. Find the highest existing ticket number (T-NNN) and increment by 1.

### 3. Create Ticket

Append a row to the **Open Tickets** table in `.claude/tickets.md`:

| Ticket | Date | Category | Description | Branch | Status | PR | Notes |
|--------|------|----------|-------------|--------|--------|----|-------|
| T-NNN | YYYY-MM-DD | bug-fix-dev/prod | description | — | open | — | — |

### 4. Confirm

Report:
- Ticket number created
- Category
- Next step: `/fix-bug --ticket T-NNN`

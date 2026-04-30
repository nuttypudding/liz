---
name: log-bug
description: Log a new bug to the ticket tracker (.claude/tickets.md). Creates a trackable ticket with category and next steps.
argument-hint: "[description of the bug]"
---

# Log Bug

Create a new bug ticket in `.claude/tickets.md`.

## Step 1: Get the Description

Read `$ARGUMENTS` for the bug description. If no arguments provided, ask the user to describe the bug.

## Step 2: Determine Category

Ask the user (or infer from context if obvious):

- **bug-fix-dev**: Bug found during local development (no production impact)
- **bug-fix-prod**: Bug found in production or reported by users

If the description mentions production URLs (`student-theta-teal.vercel.app`, `brightstep-ikigai-production.up.railway.app`), user reports, or live site issues, default to `bug-fix-prod`. Otherwise default to `bug-fix-dev`.

## Step 3: Find Next Ticket Number

Read `.claude/tickets.md` and find the highest existing ticket number by scanning both Open and Closed tables for `T-(\d{3})` patterns. The new ticket will be `T-(max+1)`, zero-padded to 3 digits.

## Step 4: Append to Open Tickets Table

Add a new row to the **Open Tickets** table in `.claude/tickets.md`:

```
| T-NNN | <YYYY-MM-DD> | <category> | <Short description> | — | open | — | — |
```

Use today's date. Derive a short description (5-15 words) from the full bug description.

## Step 5: Confirm

Tell the user:

> Logged ticket **T-NNN** (`<category>`): <short description>.
> Run `/fix-bug --ticket T-NNN` to work on it.

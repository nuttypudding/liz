---
name: wiki-qa-refresh
description: Regenerate wiki/qa-queue.md — Liz's plain-language testing checklist from tickets + features
user_invocable: true
---

# /wiki-qa-refresh — Regenerate qa-queue.md for Liz

Plain-language output. No jargon — avoid acronyms, ticket IDs without context, file paths, technical terms. **Target reader: Liz (product owner).**

## Live sources read

1. `.claude/tickets.md` — rows with status `testing` or `deployed`
2. `features/inprogress/**/done/` — recently completed tasks
3. `features/completed/**` — recently closed features
4. `wiki/project/testing-guides/**` — link each ticket to its relevant manual guide when one exists
5. `wiki/project/endpoints.md` — deployment URLs (QA, prod)

## Output structure

```markdown
# QA Queue

<intro: one line, "what's ready to test"> 

## Ready for you to test
<rows for tickets with status=testing>

## Live in production — sanity-check when you can
<rows for tickets with status=deployed, last 30 days>

## Recently closed
<last 5 closed tickets>

## Still in development
<features currently in features/inprogress/**>

---
_Generated YYYY-MM-DD by /wiki-qa-refresh_
```

## Per-entry format (plain language)

```markdown
### <Human-readable feature name> — READY FOR QA
**What it does**: <one sentence, plain language>
**Try it at**: <URL>
**Testing guide**: [[project/testing-guides/...]] (if one exists)
**What to watch for**: 
- <bullet in plain language>
- <bullet in plain language>
**Ticket**: T-NNN (for your reference)
```

## Plain-language rules

- Rewrite feature names if they contain technical terms. "RLS policies" → "access control". "middleware role fallback" → "role lookup for new users".
- Never use file paths in body text. Link via wikilinks instead.
- Never mention API routes, database tables, or code modules.
- Ticket IDs stay, but always after the explanation — never as the primary identifier.
- URLs are fine because the user clicks them.

## Log entry

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] qa-refresh | N ready, M deployed, K closed
- Ready for QA: <list of ticket IDs>
- Deployed (last 30d): <count>
- Triggered by: <skill or manual>
```

## Acceptance

- Every ticket in `testing` status appears under "Ready for you to test".
- Every ticket in `deployed` status (last 30 days) appears under "Live in production".
- Links to testing guides resolve when a guide exists.
- Zero technical jargon in body text (spot-check: no "API", "middleware", "RLS", "Clerk", "Supabase" in prose).
- Footer timestamp present.

## Implementation notes

- Parse `.claude/tickets.md` markdown tables; filter by Status column.
- For each ticket, look up the branch in the Branch column and the corresponding feature plan under `features/**/P*/README.md` for plain-language description.
- If the feature plan's description is technical, rewrite for Liz using the entity + concept pages under `wiki/entities/` and `wiki/concepts/` as style reference.

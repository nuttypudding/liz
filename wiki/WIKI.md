# WIKI.md — Wiki Schema & Conventions

This file is the canonical reference Claude consults when reading or editing anything under `wiki/`. It defines page types, frontmatter schemas, linking conventions, workflows, and quality rules. Treat it like `CLAUDE.md` but scoped to the wiki.

---

## 1. Audiences

This wiki serves three audiences. Write accordingly:

| Audience | Reads | Language |
|----------|-------|----------|
| **Claude Code** (writer + reader) | All pages | Technical, precise, machine-parseable frontmatter |
| **Developer** (browser) | All pages | Technical but scannable — headers, tables, short paragraphs |
| **Liz** (product owner, via chat or direct) | `for-liz.md`, `qa-queue.md`, chat app | Plain language, no jargon, action-oriented |

**Rules**:
- Technical pages (`entities/`, `concepts/`, `sources/`, `project/`, `decisions/`, `synthesis/`) use developer-level language.
- `for-liz.md` and `qa-queue.md` are the **only** plain-language pages. They must be understandable without any programming knowledge.
- `status.md` is developer-facing but should include a one-line plain summary at the top for Liz.

---

## 2. Page Types

| Type | Directory | Purpose | When to Create |
|------|-----------|---------|----------------|
| `entity` | `entities/` | A named thing: person, product, competitor, vendor, tenant persona | When a proper noun appears in ≥2 sources or is central to a decision |
| `concept` | `concepts/` | A domain idea: urgency triage, RLS policies, Clerk roles, maintenance categories | When a term needs definition, has nuance, or is referenced across pages |
| `source` | `sources/` | Summary of one ingested raw source (article, transcript, PDF, code review) | On every `/ingest` — one source page per raw input |
| `project` | `project/` | Operational reference migrated from `docs/`: endpoints, tech stack, testing guides | When documenting infrastructure, process, or configuration |
| `decision` | `decisions/` | A recorded architectural or product decision with rationale and status | When a non-trivial choice is made that future work depends on |
| `synthesis` | `synthesis/` | Cross-source analysis, comparison, thesis, or pattern recognition | When connecting insights from ≥2 sources or resolving a question that spans pages |

---

## 3. Frontmatter Schema

Every wiki page **must** have YAML frontmatter. The base schema:

```yaml
---
type: entity | concept | source | project | decision | synthesis
tags: [tag1, tag2]
created: 2026-04-12
updated: 2026-04-12
source_ids: [source-slug-1, source-slug-2]
confidence: low | medium | high
---
```

### Field definitions

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | One of the six page types above |
| `tags` | Yes | Lowercase kebab-case. Use for cross-cutting concerns (`auth`, `maintenance`, `billing`, `ux`) |
| `created` | Yes | ISO date when the page was first created |
| `updated` | Yes | ISO date of last substantive edit (not formatting) |
| `source_ids` | No | Array of source page slugs that support claims on this page. Source pages themselves use `source_ids: []` — they are the terminus of the citation chain. Omit on other pages if self-evident |
| `confidence` | No | How well-supported the page content is. Refers to epistemic strength, not real-world verification. Default `medium`. Use `low` for speculative or single-source claims, `high` for multi-source or directly verified |

### Source pages — additional fields

Source pages carry extra fields linking back to the raw input:

```yaml
---
type: source
tags: [maintenance, ai]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
raw_path: raw/reddit-hvac-emergency-2024.pdf
raw_type: pdf | article | transcript | code | image | other
ingested_by: /ingest
---
```

| Field | Required (source only) | Description |
|-------|------------------------|-------------|
| `raw_path` | Yes | Relative path from `wiki/` to the file in `raw/` |
| `raw_type` | Yes | Type of the original source material |
| `ingested_by` | Yes | The skill or process that created this source page (e.g., `/ingest`, `manual`, `migration`) |

### Decision pages — additional fields

```yaml
---
type: decision
tags: [auth, architecture]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
status: accepted | superseded | deprecated
superseded_by: decisions/new-decision-slug
---
```

| Field | Required (decision only) | Description |
|-------|--------------------------|-------------|
| `status` | Yes | Current status of the decision |
| `superseded_by` | No | Link to the decision that replaced this one |

---

## 4. Linking Convention

Use **Obsidian-style wikilinks** for all internal references:

```markdown
See [[concepts/urgency-triage]] for the classification model.
This was decided in [[decisions/clerk-over-supabase-auth]].
Based on findings from [[sources/reddit-hvac-emergency-2024]].
```

**Rules**:
- Links are relative paths from `wiki/` root, without the `.md` extension.
- Every non-obvious claim must cite at least one `[[sources/...]]` page.
- Entity and concept pages should cross-link to related pages in a `## Related` section at the bottom.
- Never link to files outside `wiki/` using wikilinks. For repo files, use standard markdown links: `[CLAUDE.md](/CLAUDE.md)`.
- **Forward references**: Source pages may list extracted entities/concepts as wikilinks even before those pages exist. These are intentional forward references, not broken links. `/wiki-lint` distinguishes forward references (listed in a source's `## Extracted` sections) from true orphans.

### Slug naming convention

Page filenames (and therefore wikilink targets) use **lowercase kebab-case** derived from the page title. For dated sources, append the year: `reddit-hvac-emergency-2024`. For undated pages, omit the year: `urgency-triage`. Slugs must be unique across the wiki.

---

## 5. Log Format

`log.md` is an **append-only** chronological record. Every wiki-modifying operation appends an entry.

### Format

```markdown
## [2026-04-12] ingest | Ingested Reddit HVAC emergency thread

- Source: [[sources/reddit-hvac-emergency-2024]]
- Updated: [[concepts/urgency-triage]], [[entities/hvac-vendor-abc]]
- Files: 3 created, 2 updated

## [2026-04-12] query | Developer asked about Clerk role mapping

- Answer filed to: [[synthesis/clerk-role-mapping-analysis]]
- Cited: [[concepts/clerk-roles]], [[project/tech-stack]]

## [2026-04-12] lint | Weekly health check

- Orphans found: 2
- Stale pages: 1 (> 30 days without update)
- Contradictions: 0

## [2026-04-12] feature | P2-003 auto-scheduling-vendors completed

- PR: #42
- Status page refreshed

## [2026-04-12] bug | T-025 fixed: rent reminder timezone issue

- Ticket: T-025
- Concept updated: [[concepts/rent-reminder-scheduling]]
```

### Entry structure

```
## [YYYY-MM-DD] <category> | <title>
```

Categories: `ingest`, `query`, `lint`, `feature`, `bug`, `status`, `qa`.

The body is a short bulleted list of what changed. Keep entries to 2–5 lines. The log is for grep and quick scanning, not narrative.

---

## 6. Workflows

### 6.1 Ingest workflow (`/ingest`)

```
1. READ the raw source material
2. DISCUSS — identify key entities, concepts, and claims
3. FILE — create sources/<slug>.md with frontmatter + summary
4. PROPAGATE — update or create entity/concept pages that reference the source
5. INDEX — add the new page(s) to index.md
6. LOG — append an ingest entry to log.md
```

**Propagation rules**:
- If an entity/concept page exists, add the new source to its `source_ids` and update relevant sections.
- If an entity/concept page doesn't exist but the source mentions the topic in ≥2 substantive paragraphs, create it.
- If the topic is mentioned but doesn't warrant a full page yet, list it as a forward-reference wikilink in the source's `## Extracted` sections and note it in the log as "noted for future creation." It will be created when a second source covers it.
- Always prefer extending existing pages over creating new ones (see §7).

### 6.2 Query workflow (`/wiki-query`)

```
1. READ index.md to locate relevant pages
2. DRILL into the most relevant pages
3. SYNTHESIZE an answer grounded in wiki content
4. CITE every claim with [[page]] links
5. OFFER to file the answer as a synthesis/ page if it's reusable
```

**Citation rule**: Every factual claim in a query answer must link to the wiki page that supports it. If no page supports a claim, say so explicitly and offer to investigate.

### 6.3 Lint workflow (`/wiki-lint`)

```
1. SCAN all pages for:
   - Orphans: pages not linked from any other page or index.md
   - Stale: pages with updated date > 30 days ago
   - Contradictions: conflicting claims across pages
   - Missing frontmatter: pages without required fields
   - Broken links: wikilinks pointing to non-existent pages
2. REPORT findings in the log
3. REFRESH status.md with current state
```

### 6.4 Status refresh (`/wiki-status`)

```
1. READ features/inprogress/*, features/roadmap.md, .claude/tickets.md
2. REGENERATE status.md with:
   - One-line plain summary for Liz
   - Current feature in progress + task count
   - Open tickets by category
   - Recent deployments
   - Wiki health (page count, orphans, stale)
```

### 6.5 QA refresh (`/wiki-qa-refresh`)

```
1. READ .claude/tickets.md for tickets in testing/deployed status
2. READ features/ for recently completed features
3. REGENERATE qa-queue.md with:
   - Items ready for Liz to test (plain language)
   - Links to testing guides where available
   - Status of each item (needs testing / tested / issues found)
```

---

## 7. When to Create vs. Extend a Page

**Extend** an existing page when:
- The new information is about the same entity/concept.
- Adding a section or updating existing content is sufficient.
- The page is under 300 lines.

**Create** a new page when:
- No existing page covers this entity/concept.
- The existing page would exceed 300 lines with the addition.
- The new content represents a distinct facet that deserves its own page (split and cross-link).

**Anti-duplication rules**:
- Before creating any page, search `index.md` for similar titles.
- Before creating a concept page, check if the concept is already covered as a section in another page.
- If two pages cover overlapping ground, merge them and redirect (update all wikilinks).
- Never create a page that restates what another page already says — link to it instead.

---

## 8. Auto-Refresh Contract

These root-level pages are **auto-generated** by skills. Do not manually edit them — they will be overwritten.

| Page | Refreshed By | When |
|------|-------------|------|
| `status.md` | `/wiki-status` | On feature completion, `/nextstep` (feature boundary), `/ship` |
| `qa-queue.md` | `/wiki-qa-refresh` | On `/ship` (ticket→testing), `/deploy-prod`, `/fix-bug` |
| `for-liz.md` | `/wiki-status` | Same triggers as `status.md` — regenerated alongside it |
| `index.md` | `/ingest`, `/wiki-lint` | On any page creation, deletion, or rename |
| `log.md` | All wiki skills | Append-only on every wiki-modifying operation |

**Manual-edit pages**: All pages under `entities/`, `concepts/`, `sources/`, `project/`, `decisions/`, `synthesis/` are manually curated (by Claude or developer). They are never auto-overwritten.

---

## 9. Plain-Language Surface Rule

`for-liz.md` and `qa-queue.md` exist so Liz can self-serve project state without asking.

**Rules for plain-language pages**:
- No code snippets, technical terms, or file paths.
- Use "the app" not "the Next.js application". Use "login system" not "Clerk auth".
- Action-oriented: tell Liz what she can do, what needs her attention, what's changed.
- Keep each item to 1–2 sentences.
- Link to testing guides where applicable (use plain markdown links, not wikilinks).

**All other pages stay technical.** Don't dumb down entity, concept, or project pages for a non-technical audience — that's what the plain-language pages are for.

---

## 10. qmd Integration

[qmd](https://github.com/tobi/qmd) provides hybrid BM25/vector search with LLM reranking across the wiki.

### CLI usage

```bash
# Index the wiki (run after bulk changes)
qmd index wiki/

# Search from the command line
qmd search "how does urgency triage work"

# Search with type filter
qmd search "Clerk roles" --filter "type:concept"
```

### MCP server usage

When qmd is configured as an MCP server in Claude Code's settings, use the MCP tools directly for search within conversations. This is the preferred method for `/wiki-query`.

### When to re-index

- After `/ingest` (new pages added)
- After migration tasks (bulk page moves)
- After `/wiki-lint` fixes (page renames or merges)
- Not needed for content-only edits to existing pages (qmd watches file changes)

---

## Example Pages

### Example: Entity page

```markdown
---
type: entity
tags: [vendor, hvac]
created: 2026-04-12
updated: 2026-04-12
source_ids: [reddit-hvac-emergency-2024]
confidence: medium
---

# CoolAir HVAC Services

CoolAir is a licensed HVAC vendor operating in the San Francisco Bay Area. They handle emergency and routine maintenance for residential properties.

## Service Details

- **Response time**: 2–4 hours for emergencies, next-day for routine
- **Coverage**: SF, Oakland, San Jose metro areas
- **License**: CA HVAC License #12345

## Pricing

Based on [[sources/reddit-hvac-emergency-2024]], typical emergency call-out is $150–$250 plus parts.

## Related

- [[concepts/urgency-triage]] — how Liz classifies HVAC issues
- [[concepts/vendor-scheduling]] — auto-scheduling integration plans
- [[entities/tenant-persona-urban-renter]] — primary tenant demographic using HVAC services
```

### Example: Concept page

```markdown
---
type: concept
tags: [maintenance, ai, classification]
created: 2026-04-12
updated: 2026-04-12
source_ids: [intake-sample-analysis-2026, claude-api-docs-2026]
confidence: high
---

# Urgency Triage

Urgency triage is Liz's system for classifying tenant-submitted maintenance requests into three urgency levels: **low**, **medium**, and **emergency**.

## Classification Rules

| Level | Criteria | Response Target |
|-------|----------|----------------|
| Emergency | Safety hazard, flooding, no heat in winter, gas leak | Immediate (< 2 hours) |
| Medium | Broken appliance, persistent leak, HVAC malfunction | 24–48 hours |
| Low | Cosmetic damage, minor inconvenience, routine maintenance | 1–2 weeks |

## AI Implementation

The Claude API (Sonnet) classifies incoming messages using the category and urgency fields defined in the [[concepts/intake-json-schema]]. Confidence scores below 0.7 trigger landlord review before any action.

## Edge Cases

- Mold reports start as medium but escalate to emergency if tenant reports health symptoms.
- "No hot water" is emergency in winter, medium in summer.

## Related

- [[concepts/intake-json-schema]] — the data structure carrying triage results
- [[concepts/maintenance-categories]] — the seven category labels (plumbing, electrical, etc.)
- [[entities/claude-api]] — the AI model performing classification
```

### Example: Source page

```markdown
---
type: source
tags: [maintenance, hvac, reddit]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
raw_path: raw/reddit-hvac-emergency-2024.pdf
raw_type: article
ingested_by: /ingest
---

# Reddit HVAC Emergency Thread (2024)

## Summary

A Reddit thread from r/Landlord discussing emergency HVAC response times and vendor pricing in California. Key insights on tenant expectations and legal obligations for habitability.

## Key Findings

1. **Response time expectations**: Tenants expect 2–4 hour response for no-heat emergencies. Legal minimum varies by jurisdiction but California requires "reasonable" response.
2. **Vendor pricing**: Emergency call-out rates range $150–$250 in the Bay Area, with after-hours premium of 1.5×.
3. **Tenant communication**: Tenants who receive status updates within 30 minutes report higher satisfaction even when repair takes longer.

## Extracted Entities

- [[entities/coolair-hvac-services]] — vendor mentioned by multiple commenters

## Extracted Concepts

- [[concepts/urgency-triage]] — updated with emergency classification criteria
- [[concepts/vendor-scheduling]] — pricing data added
```

### Example: Project page

```markdown
---
type: project
tags: [api, infrastructure]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# API Endpoints

All environment URLs, API routes, and app pages for the Liz platform.

## Environments

| Environment | URL |
|-------------|-----|
| Local dev | http://localhost:3000 |
| Vercel preview | (per-branch) |
| Production | https://liz.vercel.app |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/intake` | POST | Submit maintenance request for AI classification |
| `/api/intake/[id]` | GET | Retrieve classification result |
| `/api/webhook/clerk` | POST | Clerk webhook for user sync |

## Related

- [[project/tech-stack]] — framework and hosting details
- [[concepts/intake-json-schema]] — request/response format for `/api/intake`
```

### Example: Decision page

```markdown
---
type: decision
tags: [auth, architecture]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
status: accepted
---

# Clerk Over Supabase Auth

## Decision

Use Clerk for authentication instead of Supabase Auth.

## Context

Liz needs auth with role-based access (landlord, tenant, vendor), subscription billing integration, and minimal configuration overhead. Both Clerk and Supabase Auth were evaluated.

## Rationale

- Clerk provides built-in role management, billing integration via Stripe, and pre-built UI components.
- Supabase Auth would require custom role management and separate billing integration.
- Clerk's Next.js middleware simplifies route protection.

## Consequences

- Supabase is a pure data layer — no auth tables or RLS tied to Supabase Auth.
- All session validation goes through Clerk's middleware, not Supabase JWT verification.
- Vendor: lock-in to Clerk's pricing model.

## Related

- [[concepts/clerk-roles]] — role definitions and permissions
- [[project/tech-stack]] — overall technology choices
```

### Example: Synthesis page

```markdown
---
type: synthesis
tags: [maintenance, ai, accuracy]
created: 2026-04-12
updated: 2026-04-12
source_ids: [intake-sample-analysis-2026, reddit-hvac-emergency-2024]
confidence: medium
---

# Urgency Classification Accuracy Analysis

## Question

How accurate is Liz's AI urgency classification compared to landlord manual assessment?

## Findings

Based on [[sources/intake-sample-analysis-2026]] (10 labeled samples) and cross-referenced with real-world expectations from [[sources/reddit-hvac-emergency-2024]]:

1. **Emergency detection**: 100% recall on the sample set — all true emergencies were flagged. However, the sample set is small (n=2 emergencies).
2. **Over-classification**: 1 of 10 samples was classified medium when landlord labeled it low. The request mentioned "leak" which triggered a cautious classification.
3. **Confidence calibration**: Mean confidence score of 0.85 across samples. The one misclassification had confidence 0.72, suggesting the threshold of 0.7 for landlord review is well-calibrated.

## Recommendation

The current classification model is suitable for MVP. Monitor real-world accuracy post-launch and lower the landlord-review threshold to 0.75 if over-classification becomes a user complaint.

## Related

- [[concepts/urgency-triage]] — the classification system being evaluated
- [[concepts/intake-json-schema]] — where confidence scores live in the data model
```

---

## Index Format

`index.md` is a flat catalog of every wiki page. One line per page, alphabetically within each type section:

```markdown
# Wiki Index

## Entities
- [[entities/coolair-hvac-services]] — Licensed HVAC vendor, Bay Area
- [[entities/tenant-persona-urban-renter]] — Primary tenant demographic

## Concepts
- [[concepts/clerk-roles]] — Role definitions: landlord, tenant, vendor
- [[concepts/urgency-triage]] — Emergency/medium/low classification system

## Sources
- [[sources/reddit-hvac-emergency-2024]] — Reddit r/Landlord HVAC thread

## Decisions
- [[decisions/clerk-over-supabase-auth]] — Clerk chosen over Supabase Auth

## Synthesis
- [[synthesis/urgency-classification-accuracy]] — AI vs. manual triage comparison

## Project
- [[project/endpoints]] — API routes and environment URLs
- [[project/tech-stack]] — Framework, hosting, and service choices
```

**Rules**: Entries are sorted alphabetically within each type section. Descriptions stay under 60 characters. Update on every page creation, deletion, or rename.

---
id: 252
title: Manifest review checkpoint
tier: Haiku
depends_on: [251]
feature: llm-wiki
---

# 252 — Manifest review checkpoint

## Objective
Pause for user review of the migration manifest before any files are moved or deleted.

## Context
This is an explicit human-in-the-loop gate. Phase C (migrate) destroys `docs/` and `plan/`; getting the manifest right first is cheaper than fixing after.

## Implementation
1. Surface the manifest (`wiki/raw/_migration_manifest.md`) to the user with:
   - Total file count and per-class counts
   - Any rows flagged in "Open questions"
   - 3–5 representative rows per class
2. Ask the user to confirm or edit. Apply their edits directly to the manifest file.
3. Once approved, append a "Frozen on YYYY-MM-DD by user" note to the top of the manifest.

## Acceptance Criteria
1. [ ] Verify correct model tier (Haiku)
2. [ ] User has explicitly approved the manifest (captured in conversation)
3. [ ] Manifest has "Frozen on YYYY-MM-DD" note
4. [ ] No files moved or deleted in this task

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Liz** is an AI Property Manager platform (pre-code / design phase). The goal is to automate landlord tasks: maintenance triage, vendor coordination, tenant communication, and rent reminders. The MVP focuses on **AI Maintenance Intake** — classifying tenant-submitted issues by category and urgency, then recommending actions.

## Repository Structure

- `intake/readme.md` — Product vision, MVP features, tech stack options, roadmap (Phase 1–3), and go-to-market strategy.
- `intake/samples/` — 10 labeled sample maintenance requests, each in its own directory containing:
  - `intake.json` — Structured intake data (tenant message, photo references, AI classification output, source attribution)
  - `photo_XX.jpg` — Associated tenant-submitted photos

## Intake JSON Schema

Every `intake.json` follows this structure:

```
ai_maintenance_intake
├── input
│   ├── tenant_message (string)
│   └── photo_upload[] (file_url, file_type, uploaded_at)
├── ai_output
│   ├── category: plumbing | electrical | hvac | structural | pest | appliance | general
│   ├── urgency: low | medium | emergency
│   ├── recommended_action (string)
│   └── confidence_score (0–1)
└── source
    ├── origin, subreddit, post_url, post_title
```

## Sample Naming Convention

Sample directories follow: `sample_XX_<category>_<short_description>` (e.g., `sample_01_plumbing_sewer`, `sample_06_pest_cockroaches`).

## Tech Stack (Planned)

No code has been written yet. The readme outlines two options:
- **Option A (No-Code):** Bubble + OpenAI API + Zapier + Twilio + Airtable
- **Option B (Custom Build):** Node.js or Python backend, React frontend, PostgreSQL, OpenAI/Claude for AI

## Key Product Constraints

- MVP targets small landlords (1–20 units). Keep features minimal.
- Landlord approval is always required before actions are sent — AI assists, never acts autonomously.
- Not included in MVP: payment processing, tenant screening, legal compliance engine.

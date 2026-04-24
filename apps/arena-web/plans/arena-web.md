# UX Plan: LLM Arena Web App

## Overview

Standalone Next.js app at `apps/arena-web/` (port 3200, no auth). Replicates the Streamlit Arena as a Vercel-deployable web app using shadcn/ui. Shares `@liz/triage` package and design language with `apps/test-lab/`.

## Component Hierarchy

```
app/page.tsx (server component — loads samples + model catalog)
└── ArenaContent (client component — all interactive state)
    ├── PageHeader (shared — title + description + Run Arena button)
    ├── ModelComparisonTable (collapsible sortable table)
    ├── ModelSelectorRow (3 model dropdowns + "Samples" label)
    │   └── ModelSelector x3 (Select + cost caption)
    ├── SampleControls (Select All checkbox + Run button + eval count)
    ├── ProgressBar (shown during arena run)
    ├── SampleRowList
    │   └── SampleRow x10 (checkbox + photos + message | result x3)
    │       ├── SampleInfo (checkbox, photos, tenant message)
    │       └── ResultCard x3 (category, urgency, action, confidence)
    ├── AggregateScores (per-model accuracy metrics)
    └── FeatureAssignment (collapsed — coming soon)
```

## Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  PageHeader: "LLM Arena" + description + [Run Arena] button    │
├─────────────────────────────────────────────────────────────────┤
│  ▼ Model Comparison (Collapsible)                              │
│  ┌─────────┬──────────┬────────────┬──────────┬──────────┬───┐ │
│  │ Model   │ Provider │ Vision Tier│ In $/1M  │ Out $/1M │...│ │
│  ├─────────┼──────────┼────────────┼──────────┼──────────┼───┤ │
│  │ gpt-4o  │ OpenAI   │ 🥇 Best    │ $2.50    │ $10.00   │   │ │
│  └─────────┴──────────┴────────────┴──────────┴──────────┴───┘ │
├─────────────────────────────────────────────────────────────────┤
│  Samples        │ [Model 1 ▼]     │ [Model 2 ▼]   │ [Model 3]│
│                 │ $2.50/$10 · ... │ $3/$15 · ...   │ ...      │
├─────────────────────────────────────────────────────────────────┤
│  [✓] Select All    [▶ Run Arena]  3x3 = 9 evals   [progress] │
├─────────────────────────────────────────────────────────────────┤
│  [✓] #01 plumbing  │ Cat: plumb ✅ │ Cat: plumb ✅ │ Cat: hvac❌│
│  📷4  sewer        │ Urg: emrg  ✅ │ Urg: emrg  ✅ │ Urg: med ❌│
│  "It's been..."   │ Action: ...   │ Action: ...   │ Action:.. │
│                    │ Conf: 95%     │ Conf: 92%     │ Conf: 78%│
│  ─────────────────────────────────────────────────────────────  │
│  [✓] #02 general   │ ...           │ ...           │ ...      │
│  ─────────────────────────────────────────────────────────────  │
├─────────────────────────────────────────────────────────────────┤
│  Aggregate Scores                                               │
│  ┌─────────────┬─────────────┬──────────────┐                  │
│  │ gpt-4o      │ claude-son  │ gemini-flash │                  │
│  │ Cat: 90%    │ Cat: 85%    │ Cat: 70%     │                  │
│  │ Urg: 95%    │ Urg: 90%    │ Urg: 80%     │                  │
│  │ n=10        │ n=10        │ n=10         │                  │
│  └─────────────┴─────────────┴──────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│  ▶ Feature Assignment (coming soon) — collapsed                │
└─────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### ArenaContent
- **State**: `selectedModels: string[3]`, `selectedSamples: Set<string>`, `results: ArenaResults`, `isRunning: boolean`, `progress: {current, total}`
- **Props**: `samples: SampleData[]`, `models: ModelConfig[]`

### ModelComparisonTable
- **Props**: `models: ModelConfig[]`
- **UI**: Collapsible > Table (sortable columns)
- **shadcn**: Collapsible, Table

### ModelSelector
- **Props**: `models: ModelConfig[]`, `value: string`, `onChange: (id) => void`
- **UI**: Select dropdown with tier badge formatting, cost caption below
- **shadcn**: Select

### SampleRow
- **Props**: `sample: SampleData`, `selected: boolean`, `onToggle`, `results: ResultCard[3]`
- **UI**: 4-column grid. Left: Checkbox + photo thumbs + message. Right 3: ResultCards
- **shadcn**: Checkbox, Badge

### ResultCard
- **Props**: `result?: AIOutput`, `truth: AIOutput`
- **UI**: Category + match icon, Urgency + match icon, Action (truncated), Confidence
- **shadcn**: Badge

### AggregateScores
- **Props**: `results: ArenaResults`, `models: string[]`, `groundTruth: Record<string, Expected>`
- **UI**: 3 Card columns with metric values
- **shadcn**: Card

## Data Flow

1. **page.tsx** (server): loads samples via `loadCuratedSamples()`, reads `models.yaml` → passes to ArenaContent
2. **ArenaContent** manages all client state
3. **Run Arena** button: iterates selected samples x unique models, calls `POST /api/arena/run` for each
4. **API route** `/api/arena/run`: receives `{model_id, provider, message, photos[]}`, calls the appropriate LLM API, returns `{category, urgency, recommended_action, confidence_score}`
5. Results accumulate in state, UI updates reactively

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/arena/run` | Run single model on single sample, return classification |

Request: `{ model_id, provider, tenant_message, photo_urls[] }`
Response: `{ category, urgency, recommended_action, confidence_score }`

## Responsive Behavior

- **Desktop (≥1024px)**: 4-column grid (sample | model1 | model2 | model3)
- **Tablet (768-1023px)**: 2-column (sample | stacked models)
- **Mobile (<768px)**: Single column, models stack vertically

## Accessibility

- All checkboxes have labels
- Select dropdowns use proper ARIA
- Result match indicators use both color AND icon (not color alone)
- Keyboard: Tab through controls, Enter to run
- Progress bar has aria-valuenow

## shadcn/ui Components Needed

Already in test-lab (copy): table, badge, button, card, progress, collapsible, skeleton
Need to install: select, checkbox, separator

## File Structure

```
apps/arena-web/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/arena/run/route.ts
├── components/
│   ├── shared/page-header.tsx
│   ├── ui/  (shadcn primitives)
│   └── arena/
│       ├── arena-content.tsx
│       ├── model-comparison-table.tsx
│       ├── model-selector.tsx
│       ├── sample-controls.tsx
│       ├── sample-row.tsx
│       ├── result-card.tsx
│       ├── aggregate-scores.tsx
│       └── feature-assignment.tsx
├── lib/
│   └── models.ts  (load models.yaml, types)
├── public/samples/  (symlink or copy from test-lab)
└── plans/arena-web.md  (this file)
```

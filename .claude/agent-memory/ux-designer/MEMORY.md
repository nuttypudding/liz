# UX Designer Agent Memory — Liz Project

## Project Structure
- Web app lives at `apps/web/` (greenfield — not yet created as of 2026-04-02)
- Existing app at `apps/arena/` is a separate Python arena tool — do not conflate
- Feature plan lives at `features/planned/P1-001-ai-maintenance-intake-mvp/README.md`
- Roadmap at `features/roadmap.md`

## shadcn/ui Registry
- Only `@shadcn` registry is configured
- Key blocks: `dashboard-01` (sidebar + charts + data table), `sidebar-07` (collapses to icons)
- Card API: `Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter`
- Badge: supports custom className for color overrides (no built-in "warning" variant — use `className="bg-yellow-500 text-white"`)
- Empty state: `empty` component with `EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent`
- Chart: `chart` component wraps Recharts. Use `ChartContainer, ChartTooltip, ChartTooltipContent`
- Sonner: use for toast notifications on approve/dispatch actions
- Drawer: bottom sheet pattern — preferred over Dialog for mobile action sheets

## Navigation Pattern Decision
- Two distinct experiences: tenant (mobile bottom nav) vs landlord (sidebar-07 collapsing sidebar on desktop, bottom nav on mobile)
- sidebar-07 collapses to icons — good fit for landlord desktop

## Auth
- Clerk manages all auth. No Supabase Auth. Role stored in Clerk user metadata.
- Sign-in/sign-up pages wrap Clerk components — minimal custom UI needed

## Urgency Color System (confirmed)
- Emergency: red (`destructive` variant or `bg-red-500`)
- Medium: yellow (`bg-yellow-500 text-white`)
- Low: green (`bg-green-500 text-white` or `secondary`)

## See Also
- `patterns.md` — detailed component patterns per page

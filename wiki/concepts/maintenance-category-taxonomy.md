---
type: concept
tags: [maintenance, ai, classification, taxonomy]
created: 2026-04-12
updated: 2026-04-12
source_ids: []
confidence: high
---

# Maintenance Category Taxonomy

Liz classifies every tenant-submitted maintenance request into one of seven mutually exclusive categories. The category drives vendor routing — a plumbing ticket goes to a plumber, an electrical ticket to a licensed electrician, and so on. The AI assigns exactly one category per ticket.

Category assignment is the responsibility of the [[concepts/the-core-four]] Gatekeeper feature. It is stored in the `ai_output.category` field of the [[concepts/intake-json-schema]].

---

## The Seven Categories

| Category | Covers | Common urgency range |
|----------|--------|---------------------|
| `plumbing` | Pipes, drains, sewers, water heaters, faucets, toilets | Low–emergency |
| `electrical` | Outlets, wiring, breakers, panels, fixtures, surge damage | Low–emergency |
| `hvac` | Heating, cooling, ventilation, thermostats, furnaces, ductwork | Low–emergency |
| `structural` | Foundation, ceilings, walls, floors, doors, roofs, balconies | Medium–emergency |
| `pest` | Insects (cockroaches, bedbugs, ants), rodents, wildlife | Medium–emergency |
| `appliance` | Fridge, dishwasher, washer/dryer, stove, garbage disposal | Low–medium |
| `general` | Anything that doesn't fit the above: locks, lighting, paint, parking | Low–medium |

---

## Category Definitions and Edge Cases

### plumbing
Anything involving water supply or waste lines. Includes main sewer line failures, burst pipes, no-hot-water complaints (when the water heater is the cause), and slow drains. Sewage smell at the unit level is plumbing, not `general` — see [[sources/intake-sample-01-plumbing-sewer]] for an example of a main sewer-line failure classified at `emergency`.

### electrical
All electrical infrastructure: outlets, breakers, wiring, panels, and fixtures. Extension cord setups powering major appliances are `electrical`, not `appliance` — the hazard is the wiring, not the appliance itself. See [[sources/intake-sample-07-electrical-unsafe-adapter]] for a fire-hazard scenario classified at `emergency`.

### hvac
Heating, ventilation, and air conditioning as a system. Includes carbon monoxide from a malfunctioning furnace (emergency), black mold growing inside an AC unit (emergency — health hazard), and thermostat failures. Mold discovered *inside* an HVAC unit is `hvac`; mold on walls or ceilings is `structural`.

### structural
Physical building envelope and load-bearing elements. Roof leaks, sagging or collapsed ceilings, foundation cracks, deteriorating window frames, and balcony railing failures all fall here. Structural issues escalate to emergency quickly — a sagging ceiling that becomes a collapse is the canonical example of delayed action becoming an emergency (see [[sources/intake-sample-10-structural-ceiling-caved]]).

### pest
Any infestation of insects, rodents, or wildlife. Cockroaches, bedbugs, rats, mice, termites, and squirrels. A single ant or fly is `general`; a recurring or building-wide infestation is `pest`. Pest issues adjacent to a vacant unit are higher urgency because the source cannot be easily sealed.

### appliance
Landlord-owned appliances within the unit: refrigerators, dishwashers, washers, dryers, stoves, garbage disposals, range hoods, microwaves. Tenant-owned appliances are out of scope. If the appliance failure is caused by an electrical issue (e.g., tripped GFCI), prefer `electrical`.

### general
Catch-all for issues that don't fit the six specific categories: deadbolts, smoke detectors, hallway lighting, broken door hinges, mailboxes, intercom systems, carpet stains, and parking lot potholes. `general` tickets tend to be low–medium urgency. A smoke detector issue may be general but the recommended action should always flag the safety implication.

---

## Classification Edge Cases

- **Mold**: If inside HVAC → `hvac`. If on structural surfaces (walls, ceiling) → `structural`. If tenant reports health symptoms → escalate urgency to emergency regardless of category.
- **Water heater**: No-hot-water from a water heater → `plumbing`. Water heater electrical failure → `electrical`.
- **Appliance + electrical**: Sparking microwave → `appliance`. Panel issue causing appliance failure → `electrical`.
- **"I don't know" tenant messages**: Low-detail messages where category is ambiguous → assign `general` with lower [[concepts/confidence-scoring]] and route to landlord review.

---

## Related

- [[concepts/urgency-triage]] — urgency level assigned alongside category
- [[concepts/intake-json-schema]] — where category is stored in the data model
- [[concepts/the-core-four]] — the Gatekeeper feature that performs classification
- [[decisions/2026-04-01-mvp-scope-core-four]] — why these seven categories were chosen for MVP

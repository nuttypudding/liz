Here’s how I’m thinking we can actually build this in a simple way:
	0.	Onboarding (Landlord Preferences)
Before anything else, we capture how the landlord wants the AI to behave:

	•	risk appetite (cost-first, speed-first, balanced)
	•	delegation mode (manual / assist / auto)
	•	max auto-approve amount (e.g. $150)
	•	vendor preferences (preferred vendors or open)

We store this as a simple “decision profile” per user.
This is what makes the AI behave differently for each landlord.

⸻

	1.	Input Layer (Tenant Request)

	•	Tenant sends message (text, maybe photo later)
	•	We pass it to an LLM to extract:
	•	issue type (plumbing, electrical, etc.)
	•	urgency (low / medium / high)
	•	key details (location, severity)

⸻

	2.	Landlord Profile (used in every decision)
From onboarding, we load:

	•	max auto-approve amount
	•	delegation mode
	•	preferred vendors
	•	risk appetite (this affects decisions like speed vs cost)

⸻

	3.	Decision Engine (can start VERY simple)
This can literally be rules at first + light AI support:

IF urgency = high → prioritize speed (especially for risk-averse users)
IF cost < threshold → auto-approve (depending on delegation mode)
IF cost-sensitive user → choose cheapest vendor
IF speed-priority user → choose fastest vendor
IF uncertain → ask follow-up question

So risk appetite directly affects how decisions are made.

⸻

	4.	Action Layer
Based on decision:

	•	create job
	•	assign vendor
	•	notify landlord
	•	or ask tenant follow-up questions

⸻

	5.	Escalation Layer (important)
Certain cases ALWAYS go to human:

	•	legal risk (mold, no heat, flooding)
	•	high cost
	•	repeated issue
	•	low confidence from AI

⸻

	6.	Memory (basic at first)
Store:

	•	past issues per unit
	•	tenant history
	•	previous decisions

So future decisions get smarter.

⸻

MVP version:
We don’t need full autonomy.

We can start with:
	•	AI classifies + suggests decision
	•	we (or landlord) approve

Even fake the decision layer manually at first if needed.

⸻

So technically, this isn’t one “smart AI.”

It’s:
LLM (for understanding)
	•	rules (for safety)
	•	user preferences (for personalization)
	•	simple workflow (for actions)

⸻

The key idea:
We’re not building one generic agent —
we’re building an agent that adapts to each landlord’s risk tolerance and decision style.

That’s the differentiator.
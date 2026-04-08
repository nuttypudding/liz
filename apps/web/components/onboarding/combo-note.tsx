type RiskAppetite = "cost_first" | "balanced" | "speed_first";
type DelegationMode = "manual" | "assist" | "auto";

const COMBO_NOTES: Record<string, string> = {
  manual_cost_first:
    "You've chosen to approve everything manually while minimizing costs. Your agent will suggest the most affordable options for you to review.",
  manual_speed_first:
    "You've chosen to approve everything manually while prioritizing speed. Your agent will recommend fast vendors but wait for your approval.",
  assist_cost_first:
    "Your agent will auto-approve small jobs under your threshold and prioritize the most affordable vendors.",
  assist_speed_first:
    "Your agent will auto-approve small jobs under your threshold and prioritize fast vendors.",
};

interface ComboNoteProps {
  riskAppetite: RiskAppetite;
  delegationMode: DelegationMode;
}

export function ComboNote({ riskAppetite, delegationMode }: ComboNoteProps) {
  const key = `${delegationMode}_${riskAppetite}`;
  const note = COMBO_NOTES[key];

  if (!note) return null;

  return <p className="text-sm text-muted-foreground">{note}</p>;
}

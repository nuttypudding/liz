import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  submitted: { label: "Submitted", variant: "default" },
  triaged: { label: "Triaged", variant: "secondary" },
  approved: { label: "Approved", variant: "secondary" },
  dispatched: { label: "Dispatched", variant: "outline" },
  resolved: { label: "Resolved", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

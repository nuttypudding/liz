"use client";

import { useState } from "react";
import {
  Droplets,
  Zap,
  Thermometer,
  Landmark,
  Bug,
  Refrigerator,
  Wrench,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Send,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceIndicator } from "./confidence-indicator";
import { OverrideDialog } from "./override-dialog";
import type { AutonomousDecision } from "@/lib/types/autonomy";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Thermometer,
  structural: Landmark,
  pest: Bug,
  appliance: Refrigerator,
  general: Wrench,
};

interface DecisionCardProps {
  decision: AutonomousDecision;
  onUpdate: (updated: AutonomousDecision) => void;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "pending_review":
      return "outline" as const;
    case "confirmed":
      return "default" as const;
    case "overridden":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "pending_review":
      return "Pending Review";
    case "confirmed":
      return "Confirmed";
    case "overridden":
      return "Overridden";
    default:
      return status;
  }
}

function decisionLabel(type: string) {
  switch (type) {
    case "dispatch":
      return "Auto-dispatched";
    case "escalate":
      return "Escalated for review";
    case "hold":
      return "On hold";
    default:
      return type;
  }
}

function decisionColor(type: string) {
  switch (type) {
    case "dispatch":
      return "text-green-600 dark:text-green-400";
    case "escalate":
      return "text-amber-600 dark:text-amber-400";
    case "hold":
      return "text-muted-foreground";
    default:
      return "";
  }
}

export function DecisionCard({ decision, onUpdate }: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overriding, setOverriding] = useState(false);

  // Parse reasoning into bullets
  const reasoningBullets = decision.reasoning
    ? decision.reasoning
        .split(/\n|(?:^|\. )(?=[A-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 3)
    : [];

  const actions = decision.actions_taken as Record<string, unknown> | null;
  const vendorDispatched = actions?.vendor_dispatched as
    | Record<string, unknown>
    | undefined;
  const vendorName =
    typeof vendorDispatched?.vendor_name === "string"
      ? vendorDispatched.vendor_name
      : null;
  const estimatedCost =
    typeof actions?.estimated_cost === "number"
      ? actions.estimated_cost
      : null;

  // Determine category/urgency from the reasoning or actions
  const category =
    typeof actions?.category === "string" ? actions.category : "general";
  const urgency =
    typeof actions?.urgency === "string" ? actions.urgency : null;
  const Icon = categoryIcons[category] ?? Wrench;

  const borderColor =
    decision.decision_type === "dispatch"
      ? "border-l-green-500"
      : decision.decision_type === "escalate"
        ? "border-l-amber-500"
        : "border-l-muted-foreground";

  const date = new Date(decision.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/autonomy/decisions/${decision.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_action: "confirmed" }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      const { decision: updated } = await res.json();
      onUpdate(updated);
      toast.success("Decision confirmed");
    } catch {
      toast.error("Failed to confirm decision");
    } finally {
      setConfirming(false);
    }
  }

  async function handleOverride(reason: string) {
    setOverriding(true);
    try {
      const res = await fetch(`/api/autonomy/decisions/${decision.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_action: "overridden",
          review_notes: reason,
        }),
      });
      if (!res.ok) throw new Error("Failed to override");
      const { decision: updated } = await res.json();
      onUpdate(updated);
      setOverrideOpen(false);
      toast.success("Decision overridden");
    } catch {
      toast.error("Failed to override decision");
    } finally {
      setOverriding(false);
    }
  }

  return (
    <>
      <Card className={`border-l-4 ${borderColor}`}>
        <CardContent className="p-4">
          {/* Header: Icon + Summary + Confidence */}
          <div className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${decisionColor(decision.decision_type)}`}
                    >
                      {decision.decision_type === "dispatch" ? (
                        <Send className="mr-1 inline size-3.5" />
                      ) : (
                        <AlertTriangle className="mr-1 inline size-3.5" />
                      )}
                      {decisionLabel(decision.decision_type)}
                    </span>
                    <Badge variant={statusBadgeVariant(decision.status)}>
                      {statusLabel(decision.status)}
                    </Badge>
                  </div>
                  {urgency && (
                    <span className="text-xs capitalize text-muted-foreground">
                      {category} &middot; {urgency}
                    </span>
                  )}
                </div>
                <ConfidenceIndicator score={decision.confidence_score} />
              </div>

              {/* Reasoning bullets */}
              {reasoningBullets.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                  {reasoningBullets.map((bullet, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {/* Actions taken summary */}
              {(vendorName !== null || estimatedCost !== null) && (
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {vendorName !== null && (
                    <span className="text-muted-foreground">
                      Vendor: <span className="font-medium text-foreground">{vendorName}</span>
                    </span>
                  )}
                  {estimatedCost !== null && (
                    <span className="text-muted-foreground">
                      Est. cost:{" "}
                      <span className="font-medium text-foreground">
                        ${estimatedCost.toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Footer: Date + Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{date}</span>
                <span className="flex-1" />

                {decision.status === "pending_review" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleConfirm}
                      disabled={confirming}
                    >
                      <Check className="mr-1 size-3.5" />
                      {confirming ? "Confirming..." : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setOverrideOpen(true)}
                    >
                      <RotateCcw className="mr-1 size-3.5" />
                      Override
                    </Button>
                  </>
                )}

                {decision.review_notes && (
                  <span className="text-xs italic text-muted-foreground">
                    &ldquo;{decision.review_notes}&rdquo;
                  </span>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                  <span className="sr-only">
                    {expanded ? "Collapse" : "Expand"} details
                  </span>
                </Button>
              </div>

              {/* Expanded: Safety checks */}
              {expanded && decision.safety_checks && (
                <div className="mt-3 rounded-md border bg-muted/30 p-3">
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    Safety Checks
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(
                      decision.safety_checks as unknown as Record<string, boolean>
                    ).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full ${val ? "bg-green-500" : "bg-red-500"}`}
                        />
                        <span className="text-muted-foreground">
                          {key.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Confidence factors */}
                  {decision.factors && (
                    <>
                      <h4 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Confidence Factors
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(
                          decision.factors as unknown as Record<string, number>
                        ).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <div className="h-1.5 flex-1 rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${val * 100}%` }}
                              />
                            </div>
                            <span className="w-20 text-xs text-muted-foreground">
                              {key.replace(/_weight/, "").replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <OverrideDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        onSubmit={handleOverride}
        submitting={overriding}
      />
    </>
  );
}

export function DecisionCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 size-5 animate-pulse rounded bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="size-12 animate-pulse rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

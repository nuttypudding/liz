"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Send,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  AutonomousDecision,
  DecisionStatus,
  DecisionType,
} from "@/lib/types/autonomy";

interface AIReasoningCardProps {
  decision: AutonomousDecision;
  onConfirm: () => Promise<void>;
  onOverride: (reason: string) => Promise<void>;
  loading?: boolean;
}

function getConfidenceColor(score: number): string {
  if (score < 0.7) return "text-red-500";
  if (score < 0.85) return "text-yellow-500";
  return "text-green-500";
}

function getConfidenceStrokeColor(score: number): string {
  if (score < 0.7) return "stroke-red-500";
  if (score < 0.85) return "stroke-yellow-500";
  return "stroke-green-500";
}

function getDecisionLabel(type: DecisionType): string {
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

function getDecisionBadgeVariant(
  type: DecisionType
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "dispatch":
      return "default";
    case "escalate":
      return "destructive";
    case "hold":
      return "secondary";
    default:
      return "outline";
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function extractReasoningBullets(reasoning: string): string[] {
  const sentences = reasoning
    .split(/[.!]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  if (sentences.length <= 1) return [reasoning];
  return sentences.slice(0, 3);
}

function ConfidenceRing({
  score,
  size = 80,
}: {
  score: number;
  size?: number;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);
  const pct = Math.round(score * 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={getConfidenceStrokeColor(score)}
        />
      </svg>
      <span
        className={`absolute text-lg font-bold tabular-nums ${getConfidenceColor(score)}`}
      >
        {pct}%
      </span>
    </div>
  );
}

const SAFETY_CHECK_LABELS: Record<string, string> = {
  spending_cap_ok: "Spending cap ok",
  category_excluded: "Category not excluded",
  vendor_available: "Vendor available",
  emergency_eligible: "Emergency eligible",
};

const FACTOR_LABELS: Record<string, { label: string; weight: number }> = {
  historical_weight: { label: "Historical", weight: 0.35 },
  rules_weight: { label: "Rules", weight: 0.25 },
  cost_weight: { label: "Cost", weight: 0.2 },
  vendor_weight: { label: "Vendor", weight: 0.1 },
  category_weight: { label: "Category", weight: 0.1 },
};

export function AIReasoningCard({
  decision,
  onConfirm,
  onOverride,
  loading = false,
}: AIReasoningCardProps) {
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [factorsOpen, setFactorsOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [overriding, setOverriding] = useState(false);

  const isDisabled = loading || confirming || overriding;
  const isPendingReview = decision.status === ("pending_review" as DecisionStatus);
  const bullets = extractReasoningBullets(decision.reasoning);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
    } catch {
      toast.error("Failed to confirm decision");
    } finally {
      setConfirming(false);
    }
  }

  async function handleOverride() {
    setOverriding(true);
    try {
      await onOverride(overrideReason);
      setOverrideOpen(false);
      setOverrideReason("");
    } catch {
      toast.error("Failed to override decision");
    } finally {
      setOverriding(false);
    }
  }

  // Build safety checks entries, filtering emergency_eligible if not applicable
  const safetyEntries = Object.entries(decision.safety_checks).filter(
    ([key]) => key in SAFETY_CHECK_LABELS
  );

  // Compute weighted factor scores
  const factorRows = Object.entries(decision.factors)
    .filter(([key]) => key in FACTOR_LABELS)
    .map(([key, value]) => {
      const meta = FACTOR_LABELS[key];
      const weighted = meta.weight * (value as number);
      return { label: meta.label, weight: meta.weight, score: value as number, weighted };
    });
  const totalWeighted = factorRows.reduce((sum, r) => sum + r.weighted, 0);

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold">AI Reasoning</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Header: confidence ring + decision label + timestamp */}
        <div className="flex items-center gap-4">
          <ConfidenceRing score={decision.confidence_score} />
          <div className="space-y-1">
            <Badge variant={getDecisionBadgeVariant(decision.decision_type as DecisionType)}>
              {getDecisionLabel(decision.decision_type as DecisionType)}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(decision.created_at)}
            </p>
          </div>
        </div>

        {/* Summary / Reasoning bullets */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Reasoning</p>
          <ul className="space-y-1 text-sm list-disc pl-4">
            {bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </div>

        {/* Safety Checks (collapsible) */}
        <Collapsible open={safetyOpen} onOpenChange={setSafetyOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground w-full">
            {safetyOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            Safety Checks
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1.5">
            {safetyEntries.map(([key, passed]) => {
              // For category_excluded, the field means "is excluded" so pass = false is good
              const isPass = key === "category_excluded" ? !(passed as boolean) : (passed as boolean);
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {isPass ? (
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-red-500 shrink-0" />
                  )}
                  <span>{SAFETY_CHECK_LABELS[key]}</span>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Actions Taken */}
        {decision.decision_type === "dispatch" && decision.actions_taken && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Actions Taken
            </p>
            <div className="space-y-1 text-sm">
              {decision.actions_taken.vendor_dispatched && (
                <div className="flex items-center gap-2">
                  <Send className="size-3.5 text-muted-foreground shrink-0" />
                  <span>
                    Vendor notified:{" "}
                    {decision.actions_taken.vendor_dispatched.vendor_name}
                  </span>
                </div>
              )}
              {decision.actions_taken.maintenance_request_status_changed && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-muted-foreground shrink-0" />
                  <span>
                    Status:{" "}
                    {decision.actions_taken.maintenance_request_status_changed}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confidence Factors (collapsible) */}
        <Collapsible open={factorsOpen} onOpenChange={setFactorsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground w-full">
            {factorsOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            Confidence Factors
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="text-xs space-y-1">
              {factorRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between tabular-nums"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span>
                    {Math.round(row.weight * 100)}% x {row.score.toFixed(2)} ={" "}
                    {row.weighted.toFixed(3)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between font-medium border-t pt-1 mt-1">
                <span>Total</span>
                <span>{totalWeighted.toFixed(3)}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Landlord Actions */}
        {isPendingReview ? (
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              disabled={isDisabled}
              onClick={handleConfirm}
            >
              {confirming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
            <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" className="flex-1" disabled={isDisabled} />
                }
              >
                {overriding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Override"
                )}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Override autonomous decision</DialogTitle>
                  <DialogDescription>
                    Explain why you are overriding this decision. This helps
                    improve future recommendations.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Why are you overriding this decision?"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setOverrideOpen(false)}
                    disabled={overriding}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleOverride}
                    disabled={!overrideReason.trim() || overriding}
                  >
                    {overriding ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-sm">
              {decision.status === ("confirmed" as DecisionStatus) ? (
                <>
                  <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  <span className="font-medium">Confirmed by landlord</span>
                </>
              ) : decision.status === ("overridden" as DecisionStatus) ? (
                <>
                  <AlertTriangle className="size-4 text-yellow-500 shrink-0" />
                  <span className="font-medium">Overridden by landlord</span>
                </>
              ) : null}
            </div>
            {decision.review_notes && (
              <p className="text-xs text-muted-foreground pl-6">
                {decision.review_notes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

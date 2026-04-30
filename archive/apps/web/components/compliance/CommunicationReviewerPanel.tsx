"use client";

import { useState, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogMedia,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// ── Types ──────────────────────────────────────────────────────────────

export interface ComplianceFinding {
  severity: "warning" | "error";
  type: "fair_housing" | "notice_language" | "disclosure" | "other";
  flagged_text: string;
  reason: string;
  suggestion: string;
}

export interface ReviewResult {
  property_id: string;
  jurisdiction: { state_code: string; city: string | null } | null;
  findings: ComplianceFinding[];
  overall_risk_level: "low" | "medium" | "high";
  safe_to_send: boolean;
  disclaimer: string;
  reviewed_at: string;
}

export interface CommunicationReviewerPanelProps {
  messageText: string;
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewComplete?: (findings: ComplianceFinding[], safe: boolean) => void;
  onSendAnyway?: () => void;
  onSendMessage?: () => void;
  onEditMessage?: () => void;
}

// ── Severity helpers ───────────────────────────────────────────────────

const severityConfig = {
  error: {
    label: "ERROR",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/40",
    badgeVariant: "destructive" as const,
    icon: AlertCircle,
  },
  warning: {
    label: "WARNING",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/40",
    badgeVariant: "outline" as const,
    icon: AlertTriangle,
  },
};

const riskLevelConfig = {
  low: {
    label: "Low Risk",
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-100 dark:bg-green-950/40",
  },
  medium: {
    label: "Medium Risk",
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-100 dark:bg-orange-950/40",
  },
  high: {
    label: "High Risk",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-100 dark:bg-red-950/40",
  },
};

const typeLabels: Record<ComplianceFinding["type"], string> = {
  fair_housing: "Fair Housing",
  notice_language: "Notice Language",
  disclosure: "Disclosure",
  other: "Other",
};

// ── Finding Item ───────────────────────────────────────────────────────

function FindingItem({ finding }: { finding: ComplianceFinding }) {
  const config = severityConfig[finding.severity];
  const Icon = config.icon;

  const handleCopySuggestion = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finding.suggestion);
      toast.success("Suggestion copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [finding.suggestion]);

  return (
    <div className={cn("rounded-lg border p-4 space-y-3", config.bg)}>
      {/* Header with severity + type */}
      <div className="flex items-center gap-2 flex-wrap">
        <Icon className={cn("size-4 shrink-0", config.color)} />
        <Badge variant={config.badgeVariant} className="text-xs">
          {config.label}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {typeLabels[finding.type]}
        </Badge>
      </div>

      {/* Flagged text */}
      <div className="rounded-md bg-gray-100 px-3 py-2 dark:bg-gray-800">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Flagged: </span>
          <span className="underline decoration-red-400 decoration-wavy underline-offset-4">
            {finding.flagged_text}
          </span>
        </p>
      </div>

      {/* Reason */}
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Reason: </span>
        {finding.reason}
      </p>

      {/* Suggestion */}
      <div className="flex items-start gap-2">
        <div className="flex-1 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/40 dark:bg-green-950/30">
          <p className="text-sm">
            <span className="font-medium text-green-700 dark:text-green-300">
              Suggestion:{" "}
            </span>
            {finding.suggestion}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopySuggestion}
          className="shrink-0 gap-1.5"
        >
          <ClipboardCopy className="size-3.5" />
          Copy
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export function CommunicationReviewerPanel({
  messageText,
  propertyId,
  isOpen,
  onClose,
  onReviewComplete,
  onSendAnyway,
  onSendMessage,
  onEditMessage,
}: CommunicationReviewerPanelProps) {
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const fetchReview = useCallback(async () => {
    if (!messageText.trim()) {
      setError("Please enter a message to review.");
      return;
    }

    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const res = await fetch("/api/compliance/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_text: messageText,
          property_id: propertyId,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          res.status === 401
            ? "Not authenticated"
            : res.status === 404
              ? "Property not found"
              : res.status === 503
                ? "AI review service unavailable — try again"
                : (errBody as { error?: string }).error ?? "Review failed";
        setError(msg);
        return;
      }

      const data: ReviewResult = await res.json();
      setReviewResult(data);
      onReviewComplete?.(data.findings, data.safe_to_send);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [messageText, propertyId, onReviewComplete]);

  // Auto-fetch on open if no result yet
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !reviewResult && !loading) {
        fetchReview();
      }
      if (!open) {
        onClose();
      }
    },
    [reviewResult, loading, fetchReview, onClose]
  );

  const handleSendAnyway = useCallback(async () => {
    if (!acknowledged) return;

    // Log the acknowledgment to audit log
    try {
      await fetch(`/api/compliance/${propertyId}/audit-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "send_anyway_acknowledged",
          details: {
            findings_count: reviewResult?.findings.length ?? 0,
            overall_risk_level: reviewResult?.overall_risk_level ?? "unknown",
          },
        }),
      });
    } catch {
      // Non-critical — continue sending
    }

    setConfirmDialogOpen(false);
    setAcknowledged(false);
    onSendAnyway?.();
    onClose();
  }, [acknowledged, propertyId, reviewResult, onSendAnyway, onClose]);

  const handleSendSafe = useCallback(() => {
    onSendMessage?.();
    onClose();
  }, [onSendMessage, onClose]);

  const handleEditMessage = useCallback(() => {
    onEditMessage?.();
    onClose();
  }, [onEditMessage, onClose]);

  const hasFindings = (reviewResult?.findings.length ?? 0) > 0;
  const safeSend = reviewResult?.safe_to_send ?? false;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5" />
              Message Review
            </SheetTitle>
            <SheetDescription>
              AI-powered compliance review of your message before sending.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 pb-4">
            <DisclaimerBanner
              type="warning"
              text={COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE}
              dismissable
            />

            {/* Loading state */}
            {loading && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Reviewing your message for compliance...
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Error state */}
            {error && !loading && (
              <Card className="border-red-200 dark:border-red-900/30">
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <AlertCircle className="size-8 text-red-500" />
                  <p className="text-sm text-center text-muted-foreground">
                    {error}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchReview}
                    className="gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Review results */}
            {reviewResult && !loading && (
              <>
                {/* Overall status */}
                <Card>
                  <CardContent className="flex items-center gap-4 pt-6">
                    {safeSend ? (
                      <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
                        <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                        <X className="size-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {safeSend
                          ? "Safe to send"
                          : "Review findings before sending"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Risk level:
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            riskLevelConfig[reviewResult.overall_risk_level].bg,
                            riskLevelConfig[reviewResult.overall_risk_level]
                              .color
                          )}
                        >
                          {
                            riskLevelConfig[reviewResult.overall_risk_level]
                              .label
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                {/* Findings list */}
                {!hasFindings ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <CheckCircle2 className="size-8 text-green-500" />
                    <p className="text-sm font-medium">No issues found</p>
                    <p className="text-xs text-muted-foreground">
                      Your message appears compliant.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {reviewResult.findings.length} issue
                      {reviewResult.findings.length !== 1 ? "s" : ""} found
                    </p>
                    {reviewResult.findings.map((finding, idx) => (
                      <FindingItem key={idx} finding={finding} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          {reviewResult && !loading && (
            <SheetFooter className="border-t">
              {hasFindings && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setAcknowledged(false);
                    setConfirmDialogOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <AlertTriangle className="size-4" />
                  Send Anyway
                </Button>
              )}
              <Button variant="outline" onClick={handleEditMessage}>
                Edit Message
              </Button>
              {safeSend && (
                <Button onClick={handleSendSafe} className="gap-1.5">
                  <Send className="size-4" />
                  Send Message
                </Button>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Send Anyway confirmation dialog */}
      <AlertDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-100 dark:bg-red-950/40">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
            </AlertDialogMedia>
            <AlertDialogTitle>Send despite compliance issues?</AlertDialogTitle>
            <AlertDialogDescription>
              This message has {reviewResult?.findings.length ?? 0} compliance
              issue{(reviewResult?.findings.length ?? 0) !== 1 ? "s" : ""} that
              may violate fair housing laws or other regulations.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/30 dark:bg-amber-950/40">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(checked) =>
                setAcknowledged(checked === true)
              }
              className="mt-0.5"
            />
            <label className="text-sm text-amber-900 dark:text-amber-200">
              I understand the risks. I take full responsibility for sending
              this message despite the flagged issues.
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!acknowledged}
              onClick={handleSendAnyway}
              className="gap-1.5"
            >
              <Send className="size-4" />
              Send Anyway
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

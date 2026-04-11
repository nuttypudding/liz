"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  Shield,
  User,
  Briefcase,
  DollarSign,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApplicationDetail } from "@/lib/screening/hooks/useApplicationDetail";
import { useScreeningOrchestrator } from "@/lib/screening/hooks/useScreeningOrchestrator";
import {
  ApplicationStatus,
  type Application,
  type ScreeningReport,
  type ScreeningFactor,
} from "@/lib/screening/types";

/* ── Status helpers ── */

const STATUS_LABELS: Record<string, string> = {
  [ApplicationStatus.SUBMITTED]: "Submitted",
  [ApplicationStatus.SCREENING]: "Screening",
  [ApplicationStatus.SCREENED]: "Screened",
  [ApplicationStatus.APPROVED]: "Approved",
  [ApplicationStatus.DENIED]: "Denied",
  [ApplicationStatus.WITHDRAWN]: "Withdrawn",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [ApplicationStatus.SUBMITTED]: "outline",
  [ApplicationStatus.SCREENING]: "secondary",
  [ApplicationStatus.SCREENED]: "default",
  [ApplicationStatus.APPROVED]: "default",
  [ApplicationStatus.DENIED]: "destructive",
  [ApplicationStatus.WITHDRAWN]: "outline",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/* ── Risk helpers ── */

function getRiskLabel(score?: number) {
  if (score == null) return "Not Screened";
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  return "High";
}

function getRiskVariant(
  score?: number
): "default" | "secondary" | "destructive" | "outline" {
  if (score == null) return "outline";
  if (score <= 30) return "default";
  if (score <= 60) return "secondary";
  return "destructive";
}

function RiskBadge({ score }: { score?: number }) {
  return (
    <Badge variant={getRiskVariant(score)}>
      {getRiskLabel(score)}
      {score != null && ` (${score})`}
    </Badge>
  );
}

/* ── Signal helpers ── */

function getSignalVariant(
  signal: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (signal) {
    case "positive":
      return "default";
    case "concerning":
      return "destructive";
    default:
      return "secondary";
  }
}

/* ── Recommendation helpers ── */

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_approve: "Strong Approve",
  approve: "Approve",
  conditional: "Conditional",
  deny: "Deny",
};

function getRecommendationVariant(
  rec: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (rec) {
    case "strong_approve":
    case "approve":
      return "default";
    case "conditional":
      return "secondary";
    case "deny":
      return "destructive";
    default:
      return "outline";
  }
}

/* ── Loading skeleton ── */

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="mt-6 lg:mt-0 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Screening Report Panel ── */

function ScreeningReportPanel({ report }: { report: ScreeningReport }) {
  const [expandedFactor, setExpandedFactor] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Risk Score */}
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Risk Score</p>
          <div className="text-3xl font-bold mb-2">
            <RiskBadge score={report.risk_score} />
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      {report.recommendation && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">
              AI Recommendation
            </p>
            <Badge variant={getRecommendationVariant(report.recommendation)}>
              {RECOMMENDATION_LABELS[report.recommendation] ??
                report.recommendation}
            </Badge>
            {report.ai_analysis?.confidence_score != null && (
              <p className="text-xs text-muted-foreground mt-2">
                Confidence:{" "}
                {Math.round(report.ai_analysis.confidence_score * 100)}%
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {report.ai_analysis?.risk_factors &&
        report.ai_analysis.risk_factors.length > 0 && (
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold">Risk Factors</p>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {report.ai_analysis.risk_factors.map(
                (factor: ScreeningFactor, idx: number) => (
                  <button
                    key={idx}
                    onClick={() =>
                      setExpandedFactor(expandedFactor === idx ? null : idx)
                    }
                    className="w-full text-left p-3 rounded-md border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{factor.name}</p>
                        <Badge
                          variant={getSignalVariant(factor.signal)}
                          className="mt-1 text-xs"
                        >
                          {factor.signal}
                        </Badge>
                      </div>
                      <ChevronDown
                        className={`size-4 text-muted-foreground shrink-0 mt-1 transition-transform ${
                          expandedFactor === idx ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {expandedFactor === idx && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {factor.details}
                      </p>
                    )}
                  </button>
                )
              )}
            </CardContent>
          </Card>
        )}

      {/* AI Summary */}
      {report.ai_analysis?.summary && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">AI Summary</p>
            <p className="text-sm text-muted-foreground">
              {report.ai_analysis.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Additional Analysis Metrics */}
      {report.ai_analysis && (
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold">Analysis Details</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {report.ai_analysis.employment_stability_score != null && (
                <div>
                  <p className="text-muted-foreground">Employment Stability</p>
                  <p className="font-medium">
                    {report.ai_analysis.employment_stability_score}/100
                  </p>
                </div>
              )}
              {report.ai_analysis.credit_indicator && (
                <div>
                  <p className="text-muted-foreground">Credit Indicator</p>
                  <p className="font-medium capitalize">
                    {report.ai_analysis.credit_indicator.replace("_", " ")}
                  </p>
                </div>
              )}
              {report.ai_analysis.rental_history_signal && (
                <div>
                  <p className="text-muted-foreground">Rental History</p>
                  <Badge
                    variant={getSignalVariant(
                      report.ai_analysis.rental_history_signal
                    )}
                    className="text-xs"
                  >
                    {report.ai_analysis.rental_history_signal}
                  </Badge>
                </div>
              )}
              {report.credit_score_range && (
                <div>
                  <p className="text-muted-foreground">Credit Score Range</p>
                  <p className="font-medium">{report.credit_score_range}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Decision Dialog (placeholder for task 197) ── */

function DecisionDialog({
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Decision dialog will be implemented in task 197.
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main page ── */

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const {
    data,
    loading,
    error: detailError,
    refetch,
  } = useApplicationDetail(id);
  const {
    initiateScreening,
    startPolling,
    loading: screeningLoading,
    polling: screeningPolling,
    error: screeningError,
  } = useScreeningOrchestrator();

  const [showDecisionDialog, setShowDecisionDialog] = useState(false);

  const handleRunScreening = async () => {
    const success = await initiateScreening(id);
    if (success) {
      const interval = startPolling(id, 5000);
      // Auto-refetch once polling detects completion
      const checkInterval = setInterval(async () => {
        const res = await fetch(`/api/applications/${id}/screen/status`);
        if (res.ok) {
          const status = await res.json();
          if (status.screening_status === "completed") {
            clearInterval(checkInterval);
            clearInterval(interval);
            refetch();
          }
        }
      }, 5000);
      // Safety cleanup after 2 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        clearInterval(interval);
        refetch();
      }, 120_000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <Link
            href="/applications"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "-ml-2",
            })}
          >
            <ChevronLeft className="size-4" />
            Back to Applications
          </Link>
        </div>
        <DetailSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div>
          <Link
            href="/applications"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "-ml-2",
            })}
          >
            <ChevronLeft className="size-4" />
            Back to Applications
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {detailError || "Application not found."}
        </p>
      </div>
    );
  }

  const app = data.application;
  const report = data.screening_report;
  const metrics = data.computed_metrics;
  const isScreened = [
    ApplicationStatus.SCREENED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.DENIED,
  ].includes(app.status as ApplicationStatus);
  const hasDecision =
    app.status === ApplicationStatus.APPROVED ||
    app.status === ApplicationStatus.DENIED;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <div>
        <Link
          href="/applications"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2",
          })}
        >
          <ChevronLeft className="size-4" />
          Back to Applications
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {app.first_name} {app.last_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{app.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Applied{" "}
            {new Date(app.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={app.status} />
          <RiskBadge score={app.risk_score} />
        </div>
      </div>

      {/* Errors */}
      {detailError && (
        <Alert variant="destructive">
          <AlertDescription>{detailError}</AlertDescription>
        </Alert>
      )}
      {screeningError && (
        <Alert variant="destructive">
          <AlertDescription>{screeningError}</AlertDescription>
        </Alert>
      )}

      {/* Two-column layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Left column — Application details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Personal Information</p>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{app.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{app.date_of_birth || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tracking ID</p>
                  <p className="font-medium font-mono text-xs">
                    {app.tracking_id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Employment</p>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">
                    {app.employment_status.replace("-", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {app.employment_duration_months != null
                      ? `${app.employment_duration_months} months`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employer</p>
                  <p className="font-medium">{app.employer_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job Title</p>
                  <p className="font-medium">{app.job_title || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Financial</p>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Annual Income</p>
                  <p className="font-medium">
                    {app.annual_income != null
                      ? `$${app.annual_income.toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium">
                    ${app.monthly_rent_applying_for.toLocaleString()}
                  </p>
                </div>
                {metrics.income_to_rent_ratio != null && (
                  <div>
                    <p className="text-muted-foreground">
                      Income-to-Rent Ratio
                    </p>
                    <p
                      className={`font-medium ${
                        metrics.meets_min_ratio
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {metrics.income_to_rent_ratio.toFixed(2)}x
                      {metrics.meets_min_ratio === false && (
                        <span className="text-xs ml-1">(below minimum)</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* References */}
          {app.references && app.references.length > 0 && (
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">References</p>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {app.references.map((ref, idx) => (
                  <div key={idx} className="p-3 rounded-md bg-muted/50">
                    <p className="text-sm font-medium">{ref.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ref.relationship}
                      {ref.phone && ` \u2022 ${ref.phone}`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Eviction History */}
          {app.has_eviction_history && (
            <Card className="border-destructive/50">
              <CardHeader className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">
                    Eviction History
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">
                  {app.eviction_details || "Applicant reported eviction history."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons (mobile) */}
          <div className="lg:hidden space-y-2">
            {!isScreened &&
              app.status !== ApplicationStatus.SCREENING && (
                <Button
                  onClick={handleRunScreening}
                  disabled={screeningLoading || screeningPolling}
                  className="w-full"
                >
                  {screeningLoading || screeningPolling ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      {screeningPolling ? "Screening..." : "Starting..."}
                    </>
                  ) : (
                    <>
                      <Shield className="size-4 mr-2" />
                      Run Screening
                    </>
                  )}
                </Button>
              )}
            {isScreened && !hasDecision && (
              <Button
                onClick={() => setShowDecisionDialog(true)}
                className="w-full"
              >
                Make Decision
              </Button>
            )}
          </div>
        </div>

        {/* Right column — Screening Report */}
        <div className="mt-6 lg:mt-0 lg:col-span-1 lg:sticky lg:top-20 space-y-4 h-fit">
          {isScreened && report ? (
            <ScreeningReportPanel report={report} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="size-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-2">
                  {app.status === ApplicationStatus.SCREENING
                    ? "Screening in Progress"
                    : "Ready to Screen"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {app.status === ApplicationStatus.SCREENING
                    ? "The screening is running. Results will appear here when complete."
                    : "Run a background check to analyze this application."}
                </p>
                {app.status !== ApplicationStatus.SCREENING && (
                  <Button
                    onClick={handleRunScreening}
                    disabled={screeningLoading || screeningPolling}
                    className="w-full"
                  >
                    {screeningLoading || screeningPolling ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        {screeningPolling ? "Screening..." : "Starting..."}
                      </>
                    ) : (
                      "Run Screening"
                    )}
                  </Button>
                )}
                {(screeningLoading || screeningPolling) && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Processing...
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Decision button (desktop) */}
          {isScreened && !hasDecision && (
            <div className="hidden lg:block">
              <Button
                onClick={() => setShowDecisionDialog(true)}
                className="w-full"
              >
                Make Decision
              </Button>
            </div>
          )}

          {/* Back button (desktop) */}
          <div className="hidden lg:block">
            <Button
              variant="outline"
              onClick={() => router.push("/applications")}
              className="w-full"
            >
              Back to List
            </Button>
          </div>
        </div>
      </div>

      {/* Decision Dialog */}
      {showDecisionDialog && (
        <DecisionDialog
          applicationId={id}
          onClose={() => setShowDecisionDialog(false)}
          onSuccess={() => {
            setShowDecisionDialog(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

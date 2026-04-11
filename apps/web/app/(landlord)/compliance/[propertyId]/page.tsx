"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Property } from "@/lib/types";

interface ComplianceScore {
  property_id: string;
  score: number;
  completed_count: number;
  total_required_count: number;
  missing_items: { topic: string; description: string }[];
  calculated_at: string;
}

interface ChecklistItem {
  id: string;
  topic: string;
  description: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Alert {
  id: string;
  severity: "error" | "warning";
  type: string;
  title: string;
  description: string;
  affected_item: string;
  suggested_action: string;
  jurisdiction_reference: {
    rule_topic: string;
    statute_citation: string;
    required_days: number | null;
  } | null;
  created_at: string;
}

interface AlertsResponse {
  property_id: string;
  jurisdiction: { state_code: string; city: string | null } | null;
  alert_count: number;
  alerts: Alert[];
}

interface AuditLogEntry {
  id: string;
  action_type: string;
  details: Record<string, unknown>;
  timestamp: string;
  actor_id: string;
}

function scoreColor(score: number): string {
  if (score <= 40) return "text-red-600 dark:text-red-400";
  if (score <= 70) return "text-orange-600 dark:text-orange-400";
  if (score <= 85) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function scoreProgressColor(score: number): string {
  if (score <= 40) return "[&>div]:bg-red-500";
  if (score <= 70) return "[&>div]:bg-orange-500";
  if (score <= 85) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-green-500";
}

function scoreBgColor(score: number): string {
  if (score <= 40) return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  if (score <= 70) return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
  if (score <= 85) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
}

function formatActionType(actionType: string): string {
  return actionType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CompliancePropertyDetailPage() {
  const params = useParams<{ propertyId: string }>();
  const router = useRouter();
  const propertyId = params.propertyId;

  const [property, setProperty] = useState<Property | null>(null);
  const [score, setScore] = useState<ComplianceScore | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [alertsData, setAlertsData] = useState<AlertsResponse | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch property info first
      const propRes = await fetch(`/api/properties/${propertyId}`);
      if (!propRes.ok) {
        setError(propRes.status === 404 ? "Property not found" : "Failed to load property");
        return;
      }
      const { property: prop } = await propRes.json();
      setProperty(prop);

      // Fetch compliance data in parallel
      const [scoreRes, checklistRes, alertsRes, auditRes] = await Promise.all([
        fetch(`/api/compliance/${propertyId}/score`).catch(() => null),
        fetch(`/api/compliance/${propertyId}/checklist`).catch(() => null),
        fetch(`/api/compliance/alerts/${propertyId}`).catch(() => null),
        fetch(`/api/compliance/${propertyId}/audit-log?limit=10`).catch(() => null),
      ]);

      if (scoreRes?.ok) {
        setScore(await scoreRes.json());
      }

      if (checklistRes?.ok) {
        const data = await checklistRes.json();
        setChecklist(data.items ?? []);
      }

      if (alertsRes?.ok) {
        setAlertsData(await alertsRes.json());
      }

      if (auditRes?.ok) {
        const data = await auditRes.json();
        setAuditLog(data.entries ?? []);
      }
    } catch {
      setError("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleChecklistItem = useCallback(
    async (itemId: string, currentCompleted: boolean) => {
      setUpdatingItems((prev) => new Set(prev).add(itemId));
      try {
        const res = await fetch(
          `/api/compliance/${propertyId}/checklist/${itemId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: !currentCompleted }),
          }
        );

        if (res.ok) {
          const updated: ChecklistItem = await res.json();
          setChecklist((prev) =>
            prev.map((item) => (item.id === itemId ? updated : item))
          );
          // Refresh score
          const scoreRes = await fetch(`/api/compliance/${propertyId}/score`);
          if (scoreRes.ok) {
            setScore(await scoreRes.json());
          }
          toast.success(
            !currentCompleted ? "Item marked as complete" : "Item marked as incomplete"
          );
        } else {
          toast.error("Failed to update checklist item");
        }
      } catch {
        toast.error("Failed to update checklist item");
      } finally {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [propertyId]
  );

  // Group checklist items by topic
  const checklistByTopic = useMemo(() => {
    const groups = new Map<string, ChecklistItem[]>();
    for (const item of checklist) {
      const group = groups.get(item.topic) ?? [];
      group.push(item);
      groups.set(item.topic, group);
    }
    return groups;
  }, [checklist]);

  const jurisdiction = alertsData?.jurisdiction;
  const alerts = alertsData?.alerts ?? [];
  const complianceScore = score?.score ?? 0;
  const jurisdictionConfigured = jurisdiction !== null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32 md:col-span-2" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/compliance")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Compliance
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-4 size-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {error ?? "Property not found"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The property may have been removed or you may not have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/compliance")}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Compliance
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
          <p className="text-sm text-muted-foreground">
            {property.address_line1}, {property.city}, {property.state}
          </p>
          <div className="flex items-center gap-3 pt-1">
            {jurisdictionConfigured ? (
              <Badge variant="outline" className="gap-1">
                <MapPin className="size-3" />
                {jurisdiction?.state_code}
                {jurisdiction?.city ? ` / ${jurisdiction.city}` : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <MapPin className="size-3" />
                Not configured
              </Badge>
            )}
            {score && (
              <span className="text-xs text-muted-foreground">
                Updated {formatRelativeTime(score.calculated_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      <DisclaimerBanner
        type="warning"
        text={COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE}
        dismissable
      />

      {!jurisdictionConfigured && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertTriangle className="size-8 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-medium">Jurisdiction not configured</p>
              <p className="text-sm text-muted-foreground">
                Configure a jurisdiction to enable compliance scoring, checklists, and alerts.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/properties">Configure</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Score breakdown + sidebar */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Score circle card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div
              className={`flex size-24 items-center justify-center rounded-full text-3xl font-bold ${scoreBgColor(complianceScore)}`}
            >
              {jurisdictionConfigured ? complianceScore : "—"}
            </div>
            {jurisdictionConfigured && score && (
              <>
                <Progress
                  value={complianceScore}
                  className={`h-2 w-full ${scoreProgressColor(complianceScore)}`}
                />
                <p className="text-xs text-muted-foreground">
                  {score.completed_count} of {score.total_required_count} items completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick actions sidebar */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {!jurisdictionConfigured && (
              <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
                <Link href="/properties">
                  <MapPin className="size-4" />
                  Configure Jurisdiction
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
              <Link href="/compliance">
                <BookOpen className="size-4" />
                Knowledge Base
              </Link>
            </Button>
            {jurisdictionConfigured && (
              <>
                <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
                  <Link href="/compliance">
                    <FileText className="size-4" />
                    Generate Notice
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
                  <Link href="/compliance">
                    <MessageSquare className="size-4" />
                    Review Message
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklist section */}
      {jurisdictionConfigured && checklist.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-5" />
                Compliance Checklist
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {checklist.filter((i) => i.completed).length} / {checklist.length} completed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={Array.from(checklistByTopic.keys())}>
              {Array.from(checklistByTopic.entries()).map(([topic, items]) => {
                const completedInTopic = items.filter((i) => i.completed).length;
                const topicLabel = topic.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <AccordionItem key={topic} value={topic}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <span>{topicLabel}</span>
                        <Badge
                          variant={completedInTopic === items.length ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {completedInTopic}/{items.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <Checkbox
                              checked={item.completed}
                              disabled={updatingItems.has(item.id)}
                              onCheckedChange={() =>
                                handleToggleChecklistItem(item.id, item.completed)
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${
                                  item.completed
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }`}
                              >
                                {item.description}
                              </p>
                              {item.completed_at && (
                                <p className="text-xs text-muted-foreground">
                                  Completed {formatRelativeTime(item.completed_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Alerts section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-5" />
              Active Alerts
              <Badge variant="destructive" className="ml-1">
                {alerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${
                  alert.severity === "error"
                    ? "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20"
                    : "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {alert.severity === "error" ? (
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                    <p className="text-xs font-medium">
                      Suggested: {alert.suggested_action}
                    </p>
                    {alert.jurisdiction_reference && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {alert.jurisdiction_reference.statute_citation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Audit log section */}
      {auditLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-5" />
              Compliance Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLog.map((entry, index) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-6 items-center justify-center rounded-full bg-muted">
                      <Check className="size-3 text-muted-foreground" />
                    </div>
                    {index < auditLog.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium">
                      {formatActionType(entry.action_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

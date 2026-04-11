"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  LayoutGrid,
  List,
  MapPin,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Property } from "@/lib/types";

interface ComplianceScore {
  property_id: string;
  score: number;
  completed_count: number;
  total_required_count: number;
}

interface AlertSummary {
  property_id: string;
  alert_count: number;
  jurisdiction: { state_code: string; city: string | null } | null;
}

interface PropertyCompliance {
  property: Property;
  score: ComplianceScore | null;
  alerts: AlertSummary | null;
  jurisdictionConfigured: boolean;
}

type SortKey = "score-asc" | "score-desc" | "name" | "updated";

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

function scoreBadgeVariant(score: number): "destructive" | "outline" | "secondary" | "default" {
  if (score <= 40) return "destructive";
  if (score <= 70) return "outline";
  if (score <= 85) return "secondary";
  return "default";
}

export default function ComplianceDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [complianceData, setComplianceData] = useState<Map<string, PropertyCompliance>>(new Map());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score-asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const propertiesRes = await fetch("/api/properties");
      if (!propertiesRes.ok) return;
      const { properties: props } = (await propertiesRes.json()) as { properties: Property[] };
      setProperties(props ?? []);

      if (!props || props.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch compliance data for each property in parallel
      const results = await Promise.all(
        props.map(async (property) => {
          const [scoreRes, alertsRes] = await Promise.all([
            fetch(`/api/compliance/${property.id}/score`).catch(() => null),
            fetch(`/api/compliance/alerts/${property.id}`).catch(() => null),
          ]);

          let score: ComplianceScore | null = null;
          let alerts: AlertSummary | null = null;
          let jurisdictionConfigured = true;

          if (scoreRes?.ok) {
            score = await scoreRes.json();
          } else if (scoreRes?.status === 400) {
            // Jurisdiction not configured
            jurisdictionConfigured = false;
          }

          if (alertsRes?.ok) {
            const alertData = await alertsRes.json();
            alerts = {
              property_id: property.id,
              alert_count: alertData.alert_count,
              jurisdiction: alertData.jurisdiction,
            };
            if (!alertData.jurisdiction) {
              jurisdictionConfigured = false;
            }
          }

          return {
            property,
            score,
            alerts,
            jurisdictionConfigured,
          } satisfies PropertyCompliance;
        })
      );

      const map = new Map<string, PropertyCompliance>();
      for (const result of results) {
        map.set(result.property.id, result);
      }
      setComplianceData(map);
    } catch {
      // Properties will show as empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Collect unique states for filter dropdown
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    for (const pc of complianceData.values()) {
      if (pc.alerts?.jurisdiction?.state_code) {
        states.add(pc.alerts.jurisdiction.state_code);
      }
    }
    return Array.from(states).sort();
  }, [complianceData]);

  // Filter and sort
  const filteredProperties = useMemo(() => {
    let items = Array.from(complianceData.values());

    if (stateFilter !== "all") {
      items = items.filter(
        (pc) => pc.alerts?.jurisdiction?.state_code === stateFilter
      );
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "score-asc":
          return (a.score?.score ?? -1) - (b.score?.score ?? -1);
        case "score-desc":
          return (b.score?.score ?? -1) - (a.score?.score ?? -1);
        case "name":
          return a.property.name.localeCompare(b.property.name);
        case "updated":
          return (
            new Date(b.property.created_at).getTime() -
            new Date(a.property.created_at).getTime()
          );
        default:
          return 0;
      }
    });

    return items;
  }, [complianceData, stateFilter, sortBy]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const items = Array.from(complianceData.values());
    const scoredItems = items.filter((pc) => pc.score !== null);
    const avgScore =
      scoredItems.length > 0
        ? Math.round(
            scoredItems.reduce((sum, pc) => sum + (pc.score?.score ?? 0), 0) /
              scoredItems.length
          )
        : 0;
    const needsAttention = scoredItems.filter(
      (pc) => (pc.score?.score ?? 0) < 80
    ).length;
    const errorAlerts = items.reduce(
      (sum, pc) => sum + (pc.alerts?.alert_count ?? 0),
      0
    );
    const unconfigured = items.filter((pc) => !pc.jurisdictionConfigured).length;

    return { avgScore, needsAttention, errorAlerts, unconfigured };
  }, [complianceData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Legal Compliance"
          description="Monitor jurisdiction compliance for all properties"
        />
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Legal Compliance"
          description="Monitor jurisdiction compliance for all properties"
        />
        <DisclaimerBanner
          type="warning"
          text={COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE}
          dismissable
        />
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Create a property to get started with compliance monitoring."
          action={{ label: "Go to Properties", href: "/properties" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal Compliance"
        description="Monitor jurisdiction compliance for all properties"
      />

      <DisclaimerBanner
        type="warning"
        text={COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE}
        dismissable
      />

      {/* Summary stats */}
      {properties.length > 1 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Avg Score</div>
              <div className={`text-2xl font-bold ${scoreColor(summaryStats.avgScore)}`}>
                {summaryStats.avgScore}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Needs Attention</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {summaryStats.needsAttention}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Open Alerts</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summaryStats.errorAlerts}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Not Configured</div>
              <div className="text-2xl font-bold text-muted-foreground">
                {summaryStats.unconfigured}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {availableStates.length > 0 && (
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[160px]">
                <MapPin className="mr-2 size-4" />
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {availableStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="mr-2 size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score-asc">Score (low first)</SelectItem>
              <SelectItem value="score-desc">Score (high first)</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="updated">Recently added</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as "grid" | "list")}
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Property cards */}
      {filteredProperties.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No properties match the selected filter.
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredProperties.map((pc) => (
            <PropertyComplianceCard key={pc.property.id} data={pc} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyComplianceCard({ data }: { data: PropertyCompliance }) {
  const { property, score, alerts, jurisdictionConfigured } = data;
  const complianceScore = score?.score ?? 0;
  const completedCount = score?.completed_count ?? 0;
  const totalCount = score?.total_required_count ?? 0;
  const alertCount = alerts?.alert_count ?? 0;
  const jurisdiction = alerts?.jurisdiction;

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base truncate">{property.name}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">
              {property.address_line1}, {property.city}, {property.state}
            </p>
          </div>
          {jurisdictionConfigured ? (
            <Badge variant={scoreBadgeVariant(complianceScore)} className="shrink-0 ml-2">
              {complianceScore}%
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 ml-2 text-muted-foreground">
              N/A
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {jurisdictionConfigured ? (
          <>
            {/* Jurisdiction badge */}
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {jurisdiction?.state_code}
                {jurisdiction?.city ? ` / ${jurisdiction.city}` : ""}
              </span>
            </div>

            {/* Score progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Compliance</span>
                <span className={scoreColor(complianceScore)}>{complianceScore}%</span>
              </div>
              <Progress
                value={complianceScore}
                className={`h-2 ${scoreProgressColor(complianceScore)}`}
              />
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                {completedCount} of {totalCount} items
              </span>
              {alertCount > 0 && (
                <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="size-3.5" />
                  {alertCount} alert{alertCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/compliance/${property.id}`}>View Details</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Settings className="size-3.5" />
              Jurisdiction not configured
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/compliance/settings`}>Configure</Link>
              </Button>
              <Button variant="ghost" size="sm" className="flex-1" asChild>
                <Link href={`/compliance/${property.id}`}>View</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

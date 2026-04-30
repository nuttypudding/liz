"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCards } from "@/components/dashboard/section-cards";
import { EmergencyAlertBanner } from "@/components/dashboard/emergency-alert-banner";
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { SpendChart } from "@/components/dashboard/spend-chart";
import { PropertySelectorBar } from "@/components/dashboard/property-selector-bar";
import { PropertyDrillDown, PropertyDrillDownSkeleton } from "@/components/dashboard/property-drilldown";
import { RequestCard } from "@/components/requests/request-card";
import { Skeleton } from "@/components/ui/skeleton";
import { OverdueRentBanner } from "@/components/dashboard/overdue-rent-banner";
import { DashboardRentSummaryCard } from "@/components/dashboard/dashboard-rent-summary-card";
import { RulesSummaryCard } from "@/components/dashboard/rules-summary-card";
import { ScreeningStatsCards } from "@/components/screening/ScreeningStatsCards";
import { ComplianceAlertsBanner } from "@/components/compliance/ComplianceAlertsBanner";
import { ComplianceSummaryCard } from "@/components/compliance/ComplianceSummaryCard";
import type { ComplianceAlert } from "@/lib/compliance/types";
import type { Property, DashboardStats, SpendChartItem, MaintenanceRequest, DashboardRentSummary } from "@/lib/types";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPropertyId = searchParams.get("property");

  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<SpendChartItem[]>([]);
  const [recentRequests, setRecentRequests] = useState<MaintenanceRequest[]>([]);
  const [rentSummary, setRentSummary] = useState<DashboardRentSummary | null>(null);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, chartRes, requestsRes, profileRes, propertiesRes, rentSummaryRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/spend-chart"),
        fetch("/api/requests"),
        fetch("/api/settings/profile"),
        fetch("/api/properties"),
        fetch("/api/dashboard/rent-summary"),
      ]);

      // Check profile — redirect if no profile, show banner if incomplete
      if (profileRes.status === 404) {
        router.replace("/onboarding");
        return;
      }
      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        if (!profile?.onboarding_completed) {
          setShowOnboardingBanner(true);
        }
      }

      let props: Property[] = [];
      if (propertiesRes.ok) {
        const json = await propertiesRes.json();
        props = json.properties ?? [];
        setProperties(props);
      }

      // Fetch compliance alerts across all properties
      if (props.length > 0) {
        const alertResults = await Promise.all(
          props.map((p) =>
            fetch(`/api/compliance/alerts/${p.id}`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );
        const allAlerts: ComplianceAlert[] = alertResults
          .filter(Boolean)
          .flatMap((r) => r.alerts ?? []);
        setComplianceAlerts(allAlerts);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (chartRes.ok) {
        const { data } = await chartRes.json();
        setChartData(data ?? []);
      }
      if (requestsRes.ok) {
        const { requests } = await requestsRes.json();
        setRecentRequests((requests ?? []).slice(0, 3));
      }
      if (rentSummaryRes.ok) {
        const { data } = await rentSummaryRes.json();
        setRentSummary(data ?? null);
      }
    } catch {
      // Stats will show as 0, chart empty, no recent requests
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Validate selectedPropertyId — fall back to aggregate view if invalid
  const isValidPropertyId =
    selectedPropertyId === null ||
    properties.some((p) => p.id === selectedPropertyId);

  const effectivePropertyId = isValidPropertyId ? selectedPropertyId : null;
  const selectedProperty = effectivePropertyId
    ? properties.find((p) => p.id === effectivePropertyId) ?? null
    : null;

  function handlePropertySelect(id: string | null) {
    if (id === null) {
      router.push("/dashboard", { scroll: false });
    } else {
      router.push(`/dashboard?property=${id}`, { scroll: false });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <PropertySelectorBar
          properties={[]}
          selectedPropertyId={null}
          onSelect={() => {}}
          loading
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <PropertySelectorBar
        properties={properties}
        selectedPropertyId={effectivePropertyId}
        onSelect={handlePropertySelect}
      />
      {effectivePropertyId === null ? (
        <>
          {showOnboardingBanner && <OnboardingBanner />}
          <EmergencyAlertBanner count={stats?.emergency_count ?? 0} />
          <OverdueRentBanner overdueCount={rentSummary?.overdue_count ?? 0} />
          {complianceAlerts.length > 0 && (
            <ComplianceAlertsBanner
              alerts={complianceAlerts}
              maxVisible={3}
              compact
              complianceDashboardHref="/compliance"
            />
          )}
          <SectionCards
            emergencyCount={stats?.emergency_count ?? 0}
            openCount={stats?.open_count ?? 0}
            avgResolutionDays={stats?.avg_resolution_days ?? 0}
            monthlySpend={stats?.monthly_spend ?? 0}
          />
          <DashboardRentSummaryCard data={rentSummary} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RulesSummaryCard />
            <ComplianceSummaryCard />
          </div>
          <section>
            <h2 className="text-base font-semibold mb-3">Application Metrics</h2>
            <ScreeningStatsCards />
          </section>
          <SpendChart data={chartData} />
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Recent Requests</h2>
            <div className="space-y-2">
              {recentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent requests.</p>
              ) : (
                recentRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={{
                      ...request,
                      property_name: request.properties?.name ?? null,
                    }}
                    href={`/requests/${request.id}`}
                  />
                ))
              )}
            </div>
          </div>
        </>
      ) : selectedProperty ? (
        <PropertyDrillDown propertyId={effectivePropertyId} property={selectedProperty} onRefresh={fetchData} />
      ) : (
        <PropertyDrillDownSkeleton />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="Dashboard" />
          <Skeleton className="h-[76px] w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

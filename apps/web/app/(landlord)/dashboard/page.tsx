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
import type { Property, DashboardStats, SpendChartItem, MaintenanceRequest } from "@/lib/types";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPropertyId = searchParams.get("property");

  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<SpendChartItem[]>([]);
  const [recentRequests, setRecentRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, chartRes, requestsRes, profileRes, propertiesRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/spend-chart"),
        fetch("/api/requests"),
        fetch("/api/settings/profile"),
        fetch("/api/properties"),
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

      if (propertiesRes.ok) {
        const { properties: props } = await propertiesRes.json();
        setProperties(props ?? []);
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
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
          <SectionCards
            emergencyCount={stats?.emergency_count ?? 0}
            openCount={stats?.open_count ?? 0}
            avgResolutionDays={stats?.avg_resolution_days ?? 0}
            monthlySpend={stats?.monthly_spend ?? 0}
          />
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
        <PropertyDrillDown propertyId={effectivePropertyId} property={selectedProperty} />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

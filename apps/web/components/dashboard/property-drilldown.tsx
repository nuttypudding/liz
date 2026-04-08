"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  ImageIcon,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { SectionCards } from "@/components/dashboard/section-cards";
import { SpendChart } from "@/components/dashboard/spend-chart";
import { RentSummaryCard } from "@/components/dashboard/rent-summary-card";
import { LatePaymentBanner } from "@/components/dashboard/late-payment-banner";
import { WorkOrderHistory } from "@/components/dashboard/work-order-history";
import { DrilldownTenantList } from "@/components/dashboard/drilldown-tenant-list";
import { RequestCard } from "@/components/requests/request-card";
import type {
  Property,
  DashboardStats,
  SpendChartItem,
  RentStatus,
} from "@/lib/types";

type DrillDownTab = "overview" | "work-orders" | "tenants" | "documents" | "photos";

interface PropertyDrillDownProps {
  propertyId: string;
  property: Property;
  onRefresh?: () => void;
}

interface RecentOrder {
  id: string;
  tenant_message: string;
  ai_category?: string | null;
  ai_urgency?: string | null;
  status: string;
  created_at: string;
  property_name?: string | null;
}

export function PropertyDrillDown({ propertyId, property, onRefresh }: PropertyDrillDownProps) {
  const [activeTab, setActiveTab] = useState<DrillDownTab>("overview");

  const [rentStatus, setRentStatus] = useState<RentStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<SpendChartItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(false);

  const tenantCount = property.tenants?.length ?? 0;

  const fetchOverviewData = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(false);
    try {
      const [rentRes, statsRes, chartRes, ordersRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/rent-status`),
        fetch(`/api/dashboard/stats?propertyId=${propertyId}`),
        fetch(`/api/dashboard/spend-chart?propertyId=${propertyId}`),
        fetch(`/api/requests?propertyId=${propertyId}&limit=3&offset=0`),
      ]);

      if (rentRes.ok) setRentStatus(await rentRes.json());
      else setRentStatus(null);

      if (statsRes.ok) setStats(await statsRes.json());
      else setStats(null);

      if (chartRes.ok) {
        const { data } = await chartRes.json();
        setChartData(data ?? []);
      } else {
        setChartData([]);
      }

      if (ordersRes.ok) {
        const { requests } = await ordersRes.json();
        setRecentOrders(
          (requests ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            tenant_message: r.tenant_message as string,
            ai_category: r.ai_category as string | null,
            ai_urgency: r.ai_urgency as string | null,
            status: r.status as string,
            created_at: r.created_at as string,
            property_name: (r.properties as { name: string } | null)?.name ?? null,
          }))
        );
      } else {
        setRecentOrders([]);
      }
    } catch {
      setOverviewError(true);
    } finally {
      setOverviewLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  function handlePaymentRecorded() {
    fetchOverviewData();
    onRefresh?.();
  }

  return (
    <div className="space-y-4">
      <PropertyHeader property={property} tenantCount={tenantCount} />

      {rentStatus && <LatePaymentBanner rentStatus={rentStatus} />}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as DrillDownTab)}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList variant="line" className="w-full justify-start gap-0">
            <TabsTrigger value="overview" className="gap-1.5 px-3 text-xs sm:text-sm">
              <Building2 className="size-4 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="work-orders" className="gap-1.5 px-3 text-xs sm:text-sm">
              <ClipboardList className="size-4 hidden sm:block" />
              Work Orders
            </TabsTrigger>
            <TabsTrigger value="tenants" className="gap-1.5 px-3 text-xs sm:text-sm">
              <Users className="size-4 hidden sm:block" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 px-3 text-xs sm:text-sm">
              <FileText className="size-4 hidden sm:block" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5 px-3 text-xs sm:text-sm">
              <ImageIcon className="size-4 hidden sm:block" />
              Photos
            </TabsTrigger>
          </TabsList>
        </div>

        <Separator />

        <TabsContent value="overview" className="mt-4">
          {overviewLoading ? (
            <OverviewSkeleton />
          ) : overviewError ? (
            <ErrorCard onRetry={fetchOverviewData} />
          ) : (
            <OverviewTab
              propertyId={propertyId}
              rentStatus={rentStatus}
              stats={stats}
              chartData={chartData}
              recentOrders={recentOrders}
              onPaymentRecorded={handlePaymentRecorded}
              onViewAllOrders={() => setActiveTab("work-orders")}
            />
          )}
        </TabsContent>

        <TabsContent value="work-orders" className="mt-4">
          <WorkOrderHistory propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="tenants" className="mt-4">
          <DrilldownTenantList
            propertyId={propertyId}
            tenants={property.tenants ?? []}
            onRefresh={onRefresh ?? (() => {})}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsPlaceholder />
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <PhotosPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({
  propertyId,
  rentStatus,
  stats,
  chartData,
  recentOrders,
  onPaymentRecorded,
  onViewAllOrders,
}: {
  propertyId: string;
  rentStatus: RentStatus | null;
  stats: DashboardStats | null;
  chartData: SpendChartItem[];
  recentOrders: RecentOrder[];
  onPaymentRecorded: () => void;
  onViewAllOrders: () => void;
}) {
  return (
    <div className="space-y-4">
      {rentStatus && (
        <RentSummaryCard
          propertyId={propertyId}
          rentStatus={rentStatus}
          onPaymentRecorded={onPaymentRecorded}
        />
      )}

      <SectionCards
        emergencyCount={stats?.emergency_count ?? 0}
        openCount={stats?.open_count ?? 0}
        avgResolutionDays={stats?.avg_resolution_days ?? 0}
        monthlySpend={stats?.monthly_spend ?? 0}
      />

      <SpendChart data={chartData} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Work Orders</h3>
          {recentOrders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={onViewAllOrders}
            >
              View all
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
          )}
        </div>
        {recentOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <ClipboardList className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No work orders for this property yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <RequestCard
                key={order.id}
                request={order}
                href={`/requests/${order.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyHeader({
  property,
  tenantCount,
}: {
  property: Property;
  tenantCount: number;
}) {
  const unitLabel =
    property.unit_count && property.unit_count > 1
      ? `${property.unit_count} units`
      : property.apt_or_unit_no
        ? `Unit ${property.apt_or_unit_no}`
        : "1 unit";

  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold">{property.name}</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" />
          {property.address}
          {property.apt_or_unit_no && `, ${property.apt_or_unit_no}`}
        </span>
        <span className="hidden sm:inline text-border">|</span>
        <span>{unitLabel}</span>
        <span className="hidden sm:inline text-border">|</span>
        <span>
          {tenantCount} {tenantCount === 1 ? "tenant" : "tenants"}
        </span>
      </div>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="size-10 text-destructive/60 mb-3" />
        <p className="text-base font-medium">Failed to load data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong while loading property data.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="mr-2 size-3.5" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[140px] w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[280px] w-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function DocumentsPlaceholder() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="size-10 text-muted-foreground/50 mb-3" />
        <p className="text-base font-medium">Lease & Document Management</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          This section will include lease agreements & end dates,
          month-to-month status tracking, work order receipts, and inspection reports.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Coming in P1-006: Lease & Document Management
        </p>
      </CardContent>
    </Card>
  );
}

function PhotosPlaceholder() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <ImageIcon className="size-10 text-muted-foreground/50 mb-3" />
        <p className="text-base font-medium">Property Photos</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          This section will include property exterior & interior photos,
          move-in / move-out inspection photos, and before & after maintenance photos.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Coming in P1-006: Lease & Document Management
        </p>
      </CardContent>
    </Card>
  );
}

export function PropertyDrillDownSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0" />
        ))}
      </div>

      <Separator />

      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

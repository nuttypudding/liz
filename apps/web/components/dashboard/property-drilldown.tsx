"use client";

import { useState } from "react";
import {
  Building2,
  ClipboardList,
  FileText,
  ImageIcon,
  MapPin,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { WorkOrderHistory } from "@/components/dashboard/work-order-history";
import type { Property } from "@/lib/types";

type DrillDownTab = "overview" | "work-orders" | "tenants" | "documents" | "photos";

interface PropertyDrillDownProps {
  propertyId: string;
  property: Property;
}

export function PropertyDrillDown({ propertyId, property }: PropertyDrillDownProps) {
  const [activeTab, setActiveTab] = useState<DrillDownTab>("overview");

  const tenantCount = property.tenants?.length ?? 0;

  return (
    <div className="space-y-4">
      <PropertyHeader
        property={property}
        tenantCount={tenantCount}
      />

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
          <OverviewPlaceholder />
        </TabsContent>

        <TabsContent value="work-orders" className="mt-4">
          <WorkOrderHistory propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="tenants" className="mt-4">
          <TenantsPlaceholder />
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

function OverviewPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["Rent Summary", "Emergencies", "Open Requests", "Monthly Spend"].map(
          (label) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Skeleton className="mt-2 h-8 w-20" />
              </CardContent>
            </Card>
          )
        )}
      </div>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Spend Chart</p>
          <Skeleton className="mt-2 h-48 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Recent Work Orders</p>
          <div className="mt-2 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function TenantsPlaceholder() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0" />
        ))}
      </div>

      <Separator />

      {/* Tab content skeleton (overview layout) */}
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

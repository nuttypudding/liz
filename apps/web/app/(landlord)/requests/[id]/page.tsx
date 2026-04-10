"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgencyBadge } from "@/components/requests/urgency-badge";
import { StatusBadge } from "@/components/requests/status-badge";
import { AiClassificationCard } from "@/components/requests/ai-classification-card";
import { CostEstimateCard } from "@/components/requests/cost-estimate-card";
import { VendorSelector } from "@/components/requests/vendor-selector";
import { ApproveButton } from "@/components/requests/approve-button";
import { WorkOrderDraft } from "@/components/requests/work-order-draft";
import { SchedulingModal } from "@/components/scheduling/SchedulingModal";
import { fullName } from "@/lib/format";
import type { MaintenanceRequest, Vendor } from "@/lib/types";

interface RequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const workOrderRef = useRef<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, vendorRes] = await Promise.all([
        fetch(`/api/requests/${id}`),
        fetch("/api/vendors"),
      ]);

      if (reqRes.status === 404) {
        setNotFound(true);
        return;
      }

      if (reqRes.ok) {
        const { request: data } = await reqRes.json();
        setRequest(data);

        // Set default vendor by matching specialty
        if (vendorRes.ok) {
          const { vendors: vendorData } = await vendorRes.json();
          setVendors(vendorData ?? []);

          // Auto-select vendor matching category or already assigned
          if (data.vendor_id) {
            setSelectedVendorId(data.vendor_id);
          } else {
            const match = (vendorData ?? []).find(
              (v: Vendor) => v.specialty === data.ai_category
            );
            if (match) setSelectedVendorId(match.id);
          }
        }
      }
    } catch {
      toast.error("Failed to load request");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (notFound) {
    return (
      <div className="space-y-4">
        <div>
          <Link href="/requests" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
            <ChevronLeft className="size-4" />
            Back to Requests
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Request not found.</p>
      </div>
    );
  }

  if (loading || !request) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="mt-6 lg:mt-0 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const urgency = (request.ai_urgency ?? "low") as "low" | "medium" | "emergency";
  const propertyName = request.properties?.name ?? "Unknown Property";
  const tenantName = request.tenants ? fullName(request.tenants) : "Unknown Tenant";
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  const workOrderDefault = `Work Order — ${propertyName}
Tenant: ${tenantName}
Category: ${request.ai_category ?? "general"}
Urgency: ${urgency}

Issue Description:
${request.tenant_message}

Recommended Action:
${request.ai_recommended_action ?? "N/A"}

Please contact the tenant to schedule access. Estimated cost: $${request.ai_cost_estimate_low ?? 0}–$${request.ai_cost_estimate_high ?? 0}.`;

  // Initialize work order ref with existing text or default
  if (!workOrderRef.current) {
    workOrderRef.current = request.work_order_text ?? workOrderDefault;
  }

  const isAlreadyDispatched =
    request.status === "dispatched" || request.status === "resolved";

  async function handleDispatch() {
    const res = await fetch(`/api/requests/${id}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor_id: selectedVendorId,
        work_order_text: workOrderRef.current,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Dispatch failed");
    }

    // Refresh data to show updated status
    router.refresh();
    await fetchData();
  }

  const approveButton = (
    <ApproveButton
      vendorName={selectedVendor?.name}
      disabled={isAlreadyDispatched}
      className="w-full min-h-11"
      onConfirm={handleDispatch}
    />
  );

  const showScheduleButton =
    request.status === "dispatched" && !!request.vendor_id;

  const scheduleButton = (
    <Button
      onClick={() => setSchedulingOpen(true)}
      className="w-full min-h-11"
    >
      <CalendarClock className="size-4 mr-2" />
      Schedule Now
    </Button>
  );

  const actionButton = showScheduleButton ? scheduleButton : approveButton;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <div>
        <Link href="/requests" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
          <ChevronLeft className="size-4" />
          Back to Requests
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Request header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {propertyName}
              </span>
              <UrgencyBadge urgency={urgency} />
              <StatusBadge status={request.status} />
            </div>
            <h1 className="text-xl font-semibold leading-snug">
              {request.ai_category
                ? request.ai_category.charAt(0).toUpperCase() +
                  request.ai_category.slice(1)
                : "Request"}{" "}
              Issue
            </h1>
            <p className="text-sm text-muted-foreground">
              {tenantName} &middot;{" "}
              {new Date(request.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Tenant message */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold">Tenant Message</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm leading-relaxed">{request.tenant_message}</p>
            </CardContent>
          </Card>

          {/* Photo gallery */}
          <div>
            <p className="text-sm font-semibold mb-2">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {request.request_photos.length > 0
                ? request.request_photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden"
                    >
                      <span className="text-xs text-muted-foreground">
                        {photo.file_type}
                      </span>
                    </div>
                  ))
                : [0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg bg-muted flex items-center justify-center"
                    >
                      <span className="text-xs text-muted-foreground">
                        No photo
                      </span>
                    </div>
                  ))}
            </div>
          </div>

          {/* Work order draft */}
          <WorkOrderDraft
            requestId={request.id}
            defaultText={request.work_order_text ?? workOrderDefault}
            onTextChange={(text) => {
              workOrderRef.current = text;
            }}
          />

          {/* Mobile action button area (visible on mobile only) */}
          <div className="lg:hidden">
            {actionButton}
          </div>
        </div>

        {/* Right column */}
        <div className="mt-6 lg:mt-0 lg:col-span-1 lg:sticky lg:top-20 space-y-4 h-fit">
          <AiClassificationCard
            category={request.ai_category ?? "general"}
            urgency={urgency}
            confidenceScore={request.ai_confidence_score ?? 0}
            recommendedAction={request.ai_recommended_action ?? "N/A"}
          />
          <CostEstimateCard
            low={request.ai_cost_estimate_low ?? 0}
            high={request.ai_cost_estimate_high ?? 0}
          />
          <VendorSelector
            category={request.ai_category ?? "general"}
            vendors={vendors}
            selectedVendorId={selectedVendorId}
            onVendorChange={setSelectedVendorId}
          />

          {/* Desktop action button */}
          <div className="hidden lg:block">
            {actionButton}
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 border-t bg-background p-3 z-20">
        {actionButton}
      </div>

      {/* Scheduling Modal */}
      {showScheduleButton && (
        <SchedulingModal
          requestId={request.id}
          vendorId={request.vendor_id!}
          tenantId={request.tenant_id}
          vendorName={request.vendors?.name}
          open={schedulingOpen}
          onOpenChange={setSchedulingOpen}
          onConfirmed={fetchData}
        />
      )}
    </div>
  );
}

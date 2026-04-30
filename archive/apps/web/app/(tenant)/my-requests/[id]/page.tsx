"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Droplets,
  Zap,
  Thermometer,
  Landmark,
  Bug,
  Refrigerator,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UrgencyBadge } from "@/components/requests/urgency-badge";
import { StatusBadge } from "@/components/requests/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleConfirmationCard } from "@/components/scheduling/ScheduleConfirmationCard";

const categoryIcons: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Thermometer,
  structural: Landmark,
  pest: Bug,
  appliance: Refrigerator,
  general: Wrench,
};

const categoryLabels: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  structural: "Structural",
  pest: "Pest",
  appliance: "Appliance",
  general: "General",
};

interface RequestDetail {
  id: string;
  tenant_message: string;
  ai_category?: string | null;
  ai_urgency?: string | null;
  status: string;
  created_at: string;
  ai_recommended_action?: string | null;
  ai_cost_estimate_low?: number | null;
  ai_cost_estimate_high?: number | null;
  properties?: {
    name: string;
    address_line1?: string;
    city?: string;
    state?: string;
  } | null;
  vendors?: {
    name: string;
    phone?: string | null;
  } | null;
}

function LoadingSkeleton() {
  return (
    <div className="px-4 py-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [schedulingTask, setSchedulingTask] = useState<{ id: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch(`/api/requests/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch request");
        const data = await res.json();
        if (!cancelled) setRequest(data.request);

        try {
          const schedRes = await fetch(`/api/scheduling/tasks?requestId=${data.request.id}`);
          if (schedRes.ok && !cancelled) {
            const schedData = await schedRes.json();
            setSchedulingTask(schedData.task ?? null);
          }
        } catch {
          // Non-fatal — scheduling section simply won't render
        }
      } catch {
        if (!cancelled) toast.error("Failed to load request details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingSkeleton />;

  if (notFound || !request) {
    return (
      <div className="px-4 py-6">
        <PageHeader title="Request Detail" />
        <p className="mt-4 text-sm text-muted-foreground">
          Request not found.
        </p>
      </div>
    );
  }

  const Icon =
    categoryIcons[request.ai_category ?? "general"] ?? Wrench;
  const categoryLabel =
    categoryLabels[request.ai_category ?? "general"] ?? "General";
  const urgency = (request.ai_urgency ?? "low") as
    | "low"
    | "medium"
    | "emergency";

  const date = new Date(request.created_at).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="px-4 py-6 space-y-4">
      <PageHeader title="Request Detail" />

      {/* Tenant message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Your message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{request.tenant_message}</p>
        </CardContent>
      </Card>

      {/* AI classification */}
      {(request.ai_category || request.ai_urgency) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{categoryLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UrgencyBadge urgency={urgency} />
              <StatusBadge status={request.status} />
            </div>
            {request.ai_recommended_action && (
              <p className="text-sm text-muted-foreground">
                {request.ai_recommended_action}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scheduling status (awaiting states) */}
      {schedulingTask &&
        (schedulingTask.status === "awaiting_tenant" ||
          schedulingTask.status === "awaiting_vendor") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scheduling Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {schedulingTask.status === "awaiting_tenant" ? (
                <>
                  <p className="text-sm">
                    Please confirm your availability for this repair.
                  </p>
                  <Link
                    href={`/scheduling/availability-prompt/${schedulingTask.id}`}
                    className={buttonVariants({ className: "w-full" })}
                  >
                    Submit Availability
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Waiting for vendor to confirm their availability.
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Schedule confirmation card */}
      <ScheduleConfirmationCard
        requestId={request.id}
        role="tenant"
        vendorName={request.vendors?.name}
        vendorPhone={request.vendors?.phone ?? undefined}
        propertyAddress={
          request.properties?.address_line1
            ? `${request.properties.address_line1}, ${request.properties.city ?? ""}, ${request.properties.state ?? ""}`
            : undefined
        }
        category={request.ai_category ?? undefined}
        description={request.tenant_message}
      />

      {/* Metadata */}
      <Card>
        <CardContent className="pt-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Submitted</dt>
              <dd>{date}</dd>
            </div>
            {request.properties?.name && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Property</dt>
                <dd>{request.properties.name}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Request ID</dt>
              <dd className="font-mono text-xs">{request.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

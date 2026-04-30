"use client";

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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/requests/urgency-badge";
import { StatusBadge } from "@/components/requests/status-badge";

// Categories that involve habitability requirements
const HABITABILITY_CATEGORIES = new Set([
  "plumbing",
  "electrical",
  "hvac",
  "structural",
]);

const categoryIcons: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Thermometer,
  structural: Landmark,
  pest: Bug,
  appliance: Refrigerator,
  general: Wrench,
};

interface RequestCardProps {
  request: {
    id: string;
    tenant_message: string;
    ai_category?: string | null;
    ai_urgency?: string | null;
    status: string;
    created_at: string;
    property_name?: string | null;
  };
  href?: string;
}

export function RequestCard({ request, href }: RequestCardProps) {
  const Icon = categoryIcons[request.ai_category ?? "general"] ?? Wrench;
  const urgency = (request.ai_urgency ?? "low") as "low" | "medium" | "emergency";
  const borderColor =
    urgency === "emergency"
      ? "border-l-red-500"
      : urgency === "medium"
        ? "border-l-amber-500"
        : "border-l-green-500";

  const date = new Date(request.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const content = (
    <Card className={`border-l-4 ${borderColor} transition-colors hover:bg-muted/50`}>
      <CardContent className="flex items-start gap-3 p-4">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm">{request.tenant_message}</p>
          {request.property_name && (
            <p className="mt-1 text-xs text-muted-foreground">{request.property_name}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <UrgencyBadge urgency={urgency} />
            <StatusBadge status={request.status} />
            {HABITABILITY_CATEGORIES.has(request.ai_category ?? "") && (
              <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                Habitability
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{date}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

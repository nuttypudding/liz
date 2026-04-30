"use client";

import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RequestCard } from "@/components/requests/request-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface Request {
  id: string;
  tenant_message: string;
  ai_category?: string | null;
  ai_urgency?: string | null;
  status: string;
  created_at: string;
  properties?: { name: string } | null;
}

const RESOLVED_STATUSES = new Set(["resolved", "closed"]);

function RequestList({
  requests,
  emptyTitle,
  emptyDescription,
}: {
  requests: Request[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title={emptyTitle}
        description={emptyDescription}
        action={{ label: "Submit a Request", href: "/submit" }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={{
            ...request,
            property_name: request.properties?.name ?? null,
          }}
          href={`/my-requests/${request.id}`}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/requests")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch requests");
        return res.json();
      })
      .then(({ requests }) => {
        setRequests(requests);
      })
      .catch(() => {
        toast.error("Failed to load your requests.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const activeRequests = requests.filter(
    (r) => !RESOLVED_STATUSES.has(r.status)
  );
  const resolvedRequests = requests.filter((r) =>
    RESOLVED_STATUSES.has(r.status)
  );

  return (
    <div className="px-4 py-6 space-y-4">
      <PageHeader title="My Requests" />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <RequestList
              requests={requests}
              emptyTitle="No requests yet"
              emptyDescription="Submit your first maintenance request and we'll get it sorted."
            />
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <RequestList
              requests={activeRequests}
              emptyTitle="No active requests"
              emptyDescription="All your requests have been resolved."
            />
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <RequestList
              requests={resolvedRequests}
              emptyTitle="No resolved requests"
              emptyDescription="Resolved requests will appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

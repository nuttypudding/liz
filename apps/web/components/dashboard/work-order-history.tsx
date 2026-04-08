"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequestCard } from "@/components/requests/request-card";
import { UrgencyBadge } from "@/components/requests/urgency-badge";
import { StatusBadge } from "@/components/requests/status-badge";

const PAGE_SIZE = 10;

interface WorkOrder {
  id: string;
  tenant_message: string;
  ai_category?: string | null;
  ai_urgency?: string | null;
  status: string;
  created_at: string;
  property_name?: string | null;
}

interface WorkOrderHistoryProps {
  propertyId: string;
}

export function WorkOrderHistory({ propertyId }: WorkOrderHistoryProps) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchOrders = useCallback(
    async (offset: number) => {
      const res = await fetch(
        `/api/requests?propertyId=${propertyId}&limit=${PAGE_SIZE}&offset=${offset}`
      );
      const json = await res.json();
      const requests: WorkOrder[] = json.requests ?? [];
      return requests;
    },
    [propertyId]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOrders([]);
    setHasMore(true);

    fetchOrders(0).then((data) => {
      if (cancelled) return;
      setOrders(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchOrders]);

  const loadMore = async () => {
    setLoadingMore(true);
    const data = await fetchOrders(orders.length);
    setOrders((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  if (loading) {
    return <WorkOrderHistorySkeleton />;
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <ClipboardList className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-base font-medium">No work orders yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Work orders for this property will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(order.created_at)}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {order.tenant_message}
                </TableCell>
                <TableCell className="capitalize">
                  {order.ai_category ?? "general"}
                </TableCell>
                <TableCell>
                  <UrgencyBadge
                    urgency={
                      (order.ai_urgency ?? "low") as
                        | "low"
                        | "medium"
                        | "emergency"
                    }
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 lg:hidden">
        {orders.map((order) => (
          <RequestCard
            key={order.id}
            request={order}
            href={`/requests/${order.id}`}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore && <Loader2 className="mr-2 size-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function WorkOrderHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

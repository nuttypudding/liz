"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { RequestCard } from "@/components/requests/request-card";
import { UrgencyBadge } from "@/components/requests/urgency-badge";
import { StatusBadge } from "@/components/requests/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wrench } from "lucide-react";
import { fullName } from "@/lib/format";
import type { MaintenanceRequest, Property } from "@/lib/types";

type TabValue = "all" | "emergency" | "in-progress" | "resolved";

const IN_PROGRESS_STATUSES = new Set(["submitted", "triaged", "approved", "dispatched"]);

function matchesTab(status: string, urgency: string | null, tab: TabValue): boolean {
  if (tab === "all") return true;
  if (tab === "emergency") return urgency === "emergency";
  if (tab === "in-progress") return IN_PROGRESS_STATUSES.has(status);
  if (tab === "resolved") return status === "resolved" || status === "closed";
  return true;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, propRes] = await Promise.all([
        fetch("/api/requests"),
        fetch("/api/properties"),
      ]);

      if (reqRes.ok) {
        const { requests: data } = await reqRes.json();
        setRequests(data ?? []);
      }
      if (propRes.ok) {
        const { properties: data } = await propRes.json();
        setProperties(data ?? []);
      }
    } catch {
      // Keep empty arrays
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (!matchesTab(r.status, r.ai_urgency, tab)) return false;
      if (propertyFilter !== "all" && r.property_id !== propertyFilter)
        return false;
      if (urgencyFilter !== "all" && r.ai_urgency !== urgencyFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const message = r.tenant_message.toLowerCase();
        const tenantName = (r.tenants ? fullName(r.tenants) : "").toLowerCase();
        if (!message.includes(q) && !tenantName.includes(q)) return false;
      }
      return true;
    });
  }, [requests, tab, propertyFilter, urgencyFilter, search]);

  const filterBar = (
    <div className="flex flex-wrap gap-2">
      <Select value={propertyFilter} onValueChange={(v) => setPropertyFilter(v ?? "all")}>
        <SelectTrigger className="w-44 h-9">
          <SelectValue placeholder="All Properties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Properties</SelectItem>
          {properties.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v ?? "all")}>
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="All Urgencies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Urgencies</SelectItem>
          <SelectItem value="emergency">Emergency</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Search requests..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-52 h-9"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Maintenance Requests" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Maintenance Requests" />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        {(["all", "emergency", "in-progress", "resolved"] as TabValue[]).map(
          (t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <div className="space-y-4">
                {filterBar}

                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title="No requests found"
                    description="No maintenance requests match your current filters."
                  />
                ) : (
                  <>
                    {/* Mobile: card list */}
                    <div className="space-y-2 lg:hidden">
                      {filtered.map((r) => (
                        <RequestCard
                          key={r.id}
                          request={{
                            ...r,
                            property_name: r.properties?.name ?? null,
                          }}
                          href={`/requests/${r.id}`}
                        />
                      ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden lg:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Urgency</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((r) => (
                            <TableRow
                              key={r.id}
                              className="cursor-pointer"
                            >
                              <TableCell>
                                <Link
                                  href={`/requests/${r.id}`}
                                  className="flex items-center"
                                >
                                  <UrgencyBadge
                                    urgency={
                                      (r.ai_urgency ?? "low") as
                                        | "low"
                                        | "medium"
                                        | "emergency"
                                    }
                                  />
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/requests/${r.id}`}
                                  className="capitalize text-sm"
                                >
                                  {r.ai_category ?? "general"}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/requests/${r.id}`}
                                  className="text-sm"
                                >
                                  {r.properties?.name ?? "Unknown"}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/requests/${r.id}`}
                                  className="text-sm"
                                >
                                  {r.tenants ? fullName(r.tenants) : "Unknown"}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/requests/${r.id}`}
                                  className="block max-w-xs truncate text-sm"
                                >
                                  {r.tenant_message}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/requests/${r.id}`}
                                  className="text-sm text-muted-foreground"
                                >
                                  {new Date(r.created_at).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric" }
                                  )}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/requests/${r.id}`}
                                  className="flex items-center"
                                >
                                  <StatusBadge status={r.status} />
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}

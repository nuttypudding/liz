"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApplications } from "@/lib/screening/hooks/useApplications";
import { ApplicationStatus } from "@/lib/screening/types";
import type { Application } from "@/lib/screening/types";

/* ── Status helpers ── */

const STATUS_LABELS: Record<string, string> = {
  [ApplicationStatus.SUBMITTED]: "Submitted",
  [ApplicationStatus.SCREENING]: "Screening",
  [ApplicationStatus.SCREENED]: "Screened",
  [ApplicationStatus.APPROVED]: "Approved",
  [ApplicationStatus.DENIED]: "Denied",
  [ApplicationStatus.WITHDRAWN]: "Withdrawn",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  [ApplicationStatus.SUBMITTED]: "outline",
  [ApplicationStatus.SCREENING]: "secondary",
  [ApplicationStatus.SCREENED]: "default",
  [ApplicationStatus.APPROVED]: "default",
  [ApplicationStatus.DENIED]: "destructive",
  [ApplicationStatus.WITHDRAWN]: "outline",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/* ── Risk helpers ── */

function getRiskLabel(score?: number) {
  if (score == null) return "Not Screened";
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  return "High";
}

function getRiskVariant(score?: number): "default" | "secondary" | "destructive" | "outline" {
  if (score == null) return "outline";
  if (score <= 30) return "default";
  if (score <= 60) return "secondary";
  return "destructive";
}

function RiskBadge({ score }: { score?: number }) {
  return (
    <Badge variant={getRiskVariant(score)}>
      {getRiskLabel(score)}
      {score != null && ` (${score})`}
    </Badge>
  );
}

/* ── Loading skeleton ── */

function ApplicationsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

/* ── Main page ── */

export default function ApplicationsPage() {
  const { applications, loading, error, pagination, fetchApplications } =
    useApplications();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "risk_score">("created_at");
  const [currentPage, setCurrentPage] = useState(1);

  const fetch_ = useCallback(() => {
    fetchApplications({
      status: statusFilter === "all" ? undefined : statusFilter,
      sort: sortBy,
      order: "desc",
      page: currentPage,
      limit: 20,
    });
  }, [statusFilter, sortBy, currentPage, fetchApplications]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const resetFilters = () => {
    setStatusFilter("all");
    setSortBy("created_at");
    setCurrentPage(1);
  };

  const hasFilters = statusFilter !== "all" || sortBy !== "created_at";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Manage and review tenant applications for your properties"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setCurrentPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value={ApplicationStatus.SUBMITTED}>Submitted</SelectItem>
              <SelectItem value={ApplicationStatus.SCREENING}>Screening</SelectItem>
              <SelectItem value={ApplicationStatus.SCREENED}>Screened</SelectItem>
              <SelectItem value={ApplicationStatus.APPROVED}>Approved</SelectItem>
              <SelectItem value={ApplicationStatus.DENIED}>Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "created_at" | "risk_score")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date (Newest)</SelectItem>
              <SelectItem value="risk_score">Risk Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="self-center">
            Reset
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && <ApplicationsTableSkeleton />}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && applications.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="Once tenants apply to your properties, they will appear here."
        />
      )}

      {/* Desktop table */}
      {!loading && applications.length > 0 && (
        <>
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {app.first_name} {app.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {app.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell>
                      <RiskBadge score={app.risk_score} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/applications/${app.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="block rounded-lg border bg-card p-4 space-y-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {app.first_name} {app.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{app.email}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <RiskBadge score={app.risk_score} />
                  <span className="text-muted-foreground">
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))
                }
                disabled={currentPage === pagination.total_pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

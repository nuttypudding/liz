"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { DollarSign, CreditCard, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StripeConnectBanner } from "@/components/payments/stripe-connect-banner";
import { LogVendorPaymentDialog } from "@/components/payments/log-vendor-payment-dialog";
import { VendorPaymentTable } from "@/components/payments/vendor-payment-table";
import { FinancialSummarySection } from "@/components/payments/financial-summary-section";

interface PaymentRecord {
  id: string;
  tenant_id: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  paid_at: string | null;
  created_at: string;
  payment_periods?: {
    month: number;
    year: number;
  };
}

interface RentCollectionSummary {
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;
  pending_count: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2024, i, 1).toLocaleDateString("en-US", { month: "long" }),
}));

function getPaymentStatusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: "bg-green-600 text-white hover:bg-green-600",
    pending: "bg-yellow-600 text-white hover:bg-yellow-600",
    failed: "bg-red-600 text-white hover:bg-red-600",
  };

  return (
    <Badge className={styles[status] ?? ""}>{status}</Badge>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

function PaymentsDashboardContent() {
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [vendorRefreshKey, setVendorRefreshKey] = useState(0);
  const [rentSummary, setRentSummary] = useState<RentCollectionSummary | null>(
    null
  );
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState(
    String(new Date().getMonth() + 1)
  );

  const currentMonth = parseInt(filterMonth);
  const currentYear = new Date().getFullYear();

  // Check Stripe connection status
  useEffect(() => {
    async function checkStripe() {
      try {
        const res = await fetch("/api/payments/connect/status");
        if (res.ok) {
          const data = await res.json();
          setStripeConnected(data.connected && data.charges_enabled);
        }
      } catch {
        console.error("Failed to check Stripe status");
      }
    }
    checkStripe();
  }, []);

  // Fetch rent payments + calculate summary
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);

      let query = "/api/payments?limit=500";
      if (filterStatus !== "all") {
        query += `&status=${filterStatus}`;
      }

      const res = await fetch(query);
      if (!res.ok) throw new Error("Failed to fetch payments");
      const { payments: list } = await res.json();
      setPayments(list);

      // Calculate summary for the selected month
      const monthPayments = (list as PaymentRecord[]).filter(
        (p) => p.payment_periods?.month === currentMonth
      );
      const expected = monthPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const collected = monthPayments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const pending = monthPayments.filter(
        (p) => p.status === "pending"
      ).length;

      setRentSummary({
        rent_expected: expected,
        rent_collected: collected,
        collection_rate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
        pending_count: pending,
      });
    } catch {
      toast.error("Failed to load payment data.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, currentMonth]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Filter payments to the selected month for the table
  const filteredPayments = payments.filter(
    (p) => p.payment_periods?.month === currentMonth
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stripe Connect Banner */}
      {stripeConnected === false && <StripeConnectBanner />}

      <Tabs defaultValue="rent" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rent">Rent Collection</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Payments</TabsTrigger>
          <TabsTrigger value="summary">Financial Summary</TabsTrigger>
        </TabsList>

        {/* ── Rent Collection Tab ── */}
        <TabsContent value="rent" className="space-y-6">
          {/* Summary Cards */}
          {rentSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
                  <DollarSign className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Expected Rent
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-3xl font-bold">
                    ${rentSummary.rent_expected.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
                  <CreditCard className="size-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Collected
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-3xl font-bold text-green-600">
                    ${rentSummary.rent_collected.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
                  <TrendingUp className="size-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Collection Rate
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-3xl font-bold text-blue-600">
                    {rentSummary.collection_rate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
                  <Clock className="size-4 text-yellow-600 shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Pending
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-3xl font-bold">
                    {rentSummary.pending_count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${(
                      rentSummary.rent_expected - rentSummary.rent_collected
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    outstanding
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Month</label>
              <Select value={filterMonth} onValueChange={(v) => v && setFilterMonth(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Rent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.tenant_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          ${Number(payment.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {payment.payment_periods
                            ? `${payment.payment_periods.month}/${payment.payment_periods.year}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>
                          {payment.paid_at
                            ? new Date(payment.paid_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No payments found for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vendor Payments Tab ── */}
        <TabsContent value="vendors" className="space-y-6">
          <div className="flex justify-end">
            <LogVendorPaymentDialog
              onSuccess={() => setVendorRefreshKey((k) => k + 1)}
            />
          </div>

          <VendorPaymentTable
            month={currentMonth}
            refreshKey={vendorRefreshKey}
          />
        </TabsContent>

        {/* ── Financial Summary Tab ── */}
        <TabsContent value="summary">
          <FinancialSummarySection month={currentMonth} year={currentYear} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PaymentsDashboard() {
  return (
    <div className="px-4 py-6 space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Payments"
        description="Track rent collection, vendor payments, and financials"
      />
      <Suspense fallback={<LoadingSkeleton />}>
        <PaymentsDashboardContent />
      </Suspense>
    </div>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";

interface PaymentPeriod {
  id: string;
  property_id: string;
  month: number;
  year: number;
  rent_amount: number;
  due_date: string;
  status: "pending" | "paid" | "late";
}

interface PropertyData {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  amount: number;
  status: "completed" | "failed" | "pending";
  paid_at: string | null;
  created_at: string;
}

function getStatusBadge(status: string, dueDate: string) {
  if (status === "paid") {
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-600">Paid</Badge>
    );
  }

  const today = new Date();
  const due = new Date(dueDate);

  if (today > due) {
    return (
      <Badge className="bg-red-600 text-white hover:bg-red-600">Overdue</Badge>
    );
  }

  const daysUntilDue = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilDue <= 5) {
    return (
      <Badge className="bg-yellow-600 text-white hover:bg-yellow-600">
        Due Soon
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">Due in {daysUntilDue}d</Badge>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

function PayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPeriod, setCurrentPeriod] = useState<PaymentPeriod | null>(
    null
  );
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [pastPayments, setPastPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Payment Successful", {
        description: "Your rent payment has been received.",
      });
    } else if (canceled === "true") {
      toast.error("Payment Canceled", {
        description: "You canceled the payment. Please try again.",
      });
    }
  }, [searchParams]);

  // Fetch current payment period and past payments
  useEffect(() => {
    async function fetchPaymentData() {
      try {
        setLoading(true);

        // Generate current payment period if missing + get period data
        const [generateRes, paymentsRes] = await Promise.all([
          fetch("/api/payments/generate", { method: "POST" }),
          fetch("/api/payments?limit=100"),
        ]);

        if (generateRes.ok) {
          const { period, property: prop } = await generateRes.json();
          // Only show as "current" if not already paid
          if (period && period.status !== "paid") {
            setCurrentPeriod(period);
          }
          if (prop) {
            setProperty(prop);
          }
        }

        if (paymentsRes.ok) {
          const { payments } = await paymentsRes.json();
          setPastPayments(
            (payments as Payment[])
              .filter((p) => p.status === "completed")
              .slice(0, 10)
          );
        }
      } catch (error) {
        console.error("Error fetching payment data:", error);
        toast.error("Failed to load payment information.");
      } finally {
        setLoading(false);
      }
    }

    fetchPaymentData();
  }, []);

  async function handlePayRent() {
    if (!currentPeriod) return;

    try {
      setPaying(true);

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_period_id: currentPeriod.id }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to create checkout session");
      }

      const { url } = await res.json();
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start payment. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Current Balance Card */}
      {currentPeriod ? (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5" />
                <span>Current Rent Due</span>
              </div>
              {getStatusBadge(currentPeriod.status, currentPeriod.due_date)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="text-lg font-semibold">{property?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-3xl font-bold text-green-600">
                  ${Number(currentPeriod.rent_amount).toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="text-lg font-semibold">
                {new Date(currentPeriod.due_date + "T00:00:00").toLocaleDateString()}
              </p>
            </div>

            <Button
              onClick={handlePayRent}
              disabled={paying}
              className="w-full py-6 text-lg"
              size="lg"
            >
              {paying ? "Processing..." : "Pay Rent Now"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2">
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <CreditCard className="size-8 text-green-600" />
            <p className="text-lg font-semibold text-green-600">
              All Caught Up
            </p>
            <p className="text-sm text-muted-foreground">
              {property?.name
                ? `No rent due for ${property.name} this month.`
                : "No current rent period found."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            <span>Payment History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString()
                        : new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${Number(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-600 text-white hover:bg-green-600">
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/pay/receipt/${payment.id}`)
                        }
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No payment history yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayPage() {
  return (
    <div className="px-4 py-6 space-y-4">
      <PageHeader
        title="Pay Rent"
        description="View your balance and make payments"
      />
      <Suspense fallback={<LoadingSkeleton />}>
        <PayPageContent />
      </Suspense>
    </div>
  );
}

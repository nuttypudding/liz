"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface VendorPayment {
  id: string;
  vendor_name: string;
  amount: number;
  payment_date: string;
  description: string | null;
  request_id: string | null;
  maintenance_requests?: {
    title: string;
    status: string;
  } | null;
}

interface VendorPaymentTableProps {
  month?: number;
  propertyId?: string;
  refreshKey?: number;
}

export function VendorPaymentTable({
  month = new Date().getMonth() + 1,
  propertyId,
  refreshKey,
}: VendorPaymentTableProps) {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      let query = "/api/payments/vendor?limit=100";
      if (propertyId) query += `&property_id=${propertyId}`;

      const res = await fetch(query);
      if (!res.ok) throw new Error("Failed to fetch vendor payments");

      const { payments: list } = await res.json();

      const filtered = (list as VendorPayment[]).filter((p) => {
        const paymentMonth = new Date(p.payment_date).getMonth() + 1;
        return paymentMonth === month;
      });

      setPayments(filtered);
      setTotal(filtered.reduce((sum, p) => sum + Number(p.amount), 0));
    } catch {
      toast.error("Failed to load vendor payments.");
    } finally {
      setLoading(false);
    }
  }, [month, propertyId, refreshKey]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Vendor Spend Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
          <DollarSign className="size-4 text-orange-600 shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">
            Total Vendor Spend
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-3xl font-bold text-orange-600">
            ${total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {payments.length} payment{payments.length !== 1 ? "s" : ""} this
            month
          </p>
        </CardContent>
      </Card>

      {/* Vendor Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Linked Request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.vendor_name}
                    </TableCell>
                    <TableCell className="font-semibold text-orange-600">
                      ${Number(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {payment.description || "\u2014"}
                    </TableCell>
                    <TableCell>
                      {payment.maintenance_requests ? (
                        <Badge variant="secondary">
                          {payment.maintenance_requests.title}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">\u2014</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No vendor payments recorded this month.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

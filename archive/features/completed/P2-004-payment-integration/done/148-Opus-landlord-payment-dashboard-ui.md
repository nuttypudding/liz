---
id: 148
title: Build landlord payment dashboard UI — tabs, rent table, filters, summary cards
tier: Opus
depends_on: [140, 143, 144, 145, 146]
feature: P2-004-payment-integration
---

# 148 — Build landlord payment dashboard UI — tabs, rent table, filters, summary cards

## Objective
Create the landlord payment dashboard at `apps/web/app/(landlord)/dashboard/payments/page.tsx`.

Display three tabs:
1. **Rent Collection** — Summary cards (expected, collected, collection rate) + filterable payment table
2. **Vendor Payments** — Table + "Log Payment" dialog
3. **Financial Summary** — P&L cards + trend chart + property breakdown (delegated to task 149)

Include StripeConnectBanner if landlord's account is not connected.

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Landlords use this dashboard to:
- Track rent collection status across tenants
- Log vendor payments and link to requests
- View P&L for the month and trends
- Connect Stripe account to enable payments

## Implementation

**File**: `apps/web/app/(landlord)/dashboard/payments/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StripeConnectBanner } from '@/components/payments/stripe-connect-banner';
import { LogVendorPaymentDialog } from '@/components/payments/log-vendor-payment-dialog';
import { FinancialSummarySection } from '@/components/payments/financial-summary-section';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, CreditCard, TrendingUp } from 'lucide-react';

interface RentCollectionSummary {
  rent_expected: number;
  rent_collected: number;
  collection_rate: number;
  pending_count: number;
}

interface PaymentRecord {
  id: string;
  tenant_id: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  paid_at: string;
  payment_periods: {
    month: number;
    year: number;
  };
}

export default function PaymentsDashboard() {
  const { userId } = useAuth();
  const { toast } = useToast();

  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rentSummary, setRentSummary] = useState<RentCollectionSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);

  // Check Stripe connection status
  useEffect(() => {
    if (!userId) return;

    const checkStripeStatus = async () => {
      try {
        const res = await fetch('/api/payments/connect/status');
        if (res.ok) {
          const data = await res.json();
          setStripeConnected(data.connected && data.charges_enabled);
        }
      } catch (error) {
        console.error('Failed to check Stripe status:', error);
      }
    };

    checkStripeStatus();
  }, [userId]);

  // Fetch rent collection data
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch payments
        let query = '/api/payments?limit=500';
        if (filterStatus !== 'all') {
          query += `&status=${filterStatus}`;
        }

        const paymentsRes = await fetch(query);
        if (!paymentsRes.ok) throw new Error('Failed to fetch payments');
        const { payments: paymentsList } = await paymentsRes.json();
        setPayments(paymentsList);

        // Calculate summary
        const expected = paymentsList
          .filter((p: PaymentRecord) => p.payment_periods.month === filterMonth)
          .reduce((sum: number, p: PaymentRecord) => sum + p.amount, 0);

        const collected = paymentsList
          .filter(
            (p: PaymentRecord) =>
              p.payment_periods.month === filterMonth && p.status === 'completed'
          )
          .reduce((sum: number, p: PaymentRecord) => sum + p.amount, 0);

        const pending = paymentsList.filter(
          (p: PaymentRecord) =>
            p.payment_periods.month === filterMonth && p.status === 'pending'
        ).length;

        setRentSummary({
          rent_expected: expected,
          rent_collected: collected,
          collection_rate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
          pending_count: pending,
        });
      } catch (error) {
        console.error('Error fetching payment data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, filterStatus, filterMonth, toast]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Stripe Connect Banner */}
      {!stripeConnected && <StripeConnectBanner />}

      {/* Rent Collection Tab */}
      <Tabs defaultValue="rent" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rent">Rent Collection</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Payments</TabsTrigger>
          <TabsTrigger value="summary">Financial Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="rent" className="space-y-6">
          {/* Summary Cards */}
          {rentSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expected Rent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${rentSummary.rent_expected.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collected</CardTitle>
                  <CreditCard className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${rentSummary.rent_collected.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {rentSummary.collection_rate}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Badge className="bg-yellow-600">{rentSummary.pending_count}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(rentSummary.rent_expected - rentSummary.rent_collected).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-2 mt-1"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="border rounded px-3 py-2 mt-1"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
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
                  {payments.length > 0 ? (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.tenant_id.slice(0, 8)}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {payment.payment_periods.month}/{payment.payment_periods.year}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              payment.status === 'completed'
                                ? 'bg-green-600'
                                : payment.status === 'pending'
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.paid_at
                            ? new Date(payment.paid_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No payments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Payments Tab */}
        <TabsContent value="vendors" className="space-y-6">
          <div className="flex justify-end">
            <LogVendorPaymentDialog
              onSuccess={() => {
                toast({ title: 'Vendor payment logged successfully.' });
              }}
            />
          </div>
          {/* Vendor payments table delegated to task 150 */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-8">Vendor payments table (task 150)</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Summary Tab */}
        <TabsContent value="summary">
          <FinancialSummarySection month={filterMonth} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] Page created at `apps/web/app/(landlord)/dashboard/payments/page.tsx`
2. [ ] Three tabs: Rent Collection, Vendor Payments, Financial Summary
3. [ ] StripeConnectBanner shown if not connected
4. [ ] Rent Collection tab displays:
   - [ ] Summary cards: Expected Rent, Collected, Collection Rate, Pending
   - [ ] Filters: Status dropdown (All, Completed, Pending, Failed), Month selector
   - [ ] Payment table: Tenant, Amount, Period, Status, Paid Date
5. [ ] Payment table is sortable and filterable
6. [ ] Summary cards update when filters change
7. [ ] Vendor Payments tab includes LogVendorPaymentDialog component
8. [ ] Financial Summary tab includes FinancialSummarySection (task 149)
9. [ ] Icons for summary cards (DollarSign, CreditCard, TrendingUp, etc.)
10. [ ] Responsive grid layout (1 col mobile, 4 cols desktop)
11. [ ] Loading state while fetching data
12. [ ] Error toasts on fetch failures
13. [ ] No TypeScript errors
14. [ ] Uses project UI components (Card, Button, Tabs, Table, Badge)

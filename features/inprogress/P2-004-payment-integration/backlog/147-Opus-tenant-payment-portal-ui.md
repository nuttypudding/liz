---
id: 147
title: Build tenant payment portal UI — /pay page with balance card + history
tier: Opus
depends_on: [141, 143, 144]
feature: P2-004-payment-integration
---

# 147 — Build tenant payment portal UI — /pay page with balance card + history

## Objective
Create the tenant-facing payment portal at `apps/web/app/(tenant)/pay/page.tsx`.

Display:
1. **CurrentBalanceCard** — Property name, current rent due, due date, status badge (Due Soon / Overdue / Paid), "Pay Rent" button
2. **PaymentHistorySection** — Table of past payments (date, amount, status, receipt link)
3. **Success/Cancel Toast** — Show on redirect from Stripe checkout
4. **Paid State** — When current month is paid, show "Paid" badge instead of CTA

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Tenants land here to:
- See what rent is due
- Pay current month's rent via Stripe
- View payment history and receipts
- Get confirmation on payment status

## Implementation

**File**: `apps/web/app/(tenant)/pay/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentPeriod {
  id: string;
  property_id: string;
  month: number;
  year: number;
  rent_amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'late';
}

interface Payment {
  id: string;
  amount: number;
  status: 'completed' | 'failed' | 'pending';
  paid_at: string;
  created_at: string;
}

interface PropertyData {
  id: string;
  name: string;
}

export default function PayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [currentPeriod, setCurrentPeriod] = useState<PaymentPeriod | null>(null);
  const [pastPayments, setPastPayments] = useState<Payment[]>([]);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success === 'true') {
      toast({
        title: 'Payment Successful',
        description: 'Your rent payment has been received.',
        variant: 'default',
      });
      // Refresh page to show updated status
      setTimeout(() => router.refresh(), 1000);
    } else if (canceled === 'true') {
      toast({
        title: 'Payment Canceled',
        description: 'You canceled the payment. Please try again.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, router]);

  // Fetch current payment period and past payments
  useEffect(() => {
    if (!userId) return;

    const fetchPaymentData = async () => {
      try {
        setLoading(true);

        // Generate current payment period if missing
        const generateRes = await fetch('/api/payments/generate', {
          method: 'POST',
        });

        if (!generateRes.ok) {
          console.warn('Failed to generate payment period');
        }

        // Fetch payments
        const paymentsRes = await fetch('/api/payments?limit=100');
        if (!paymentsRes.ok) throw new Error('Failed to fetch payments');
        const { payments } = await paymentsRes.json();

        // Fetch current month's payment period
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        // Find current period from payments
        const current = payments.find(
          (p: Payment & { payment_periods: PaymentPeriod }) =>
            p.payment_periods?.month === currentMonth &&
            p.payment_periods?.year === currentYear &&
            p.status !== 'completed'
        );

        if (current) {
          setCurrentPeriod(current.payment_periods);
          setProperty({
            id: current.property_id,
            name: current.properties?.name || 'Your Property',
          });
        }

        // Set past payments (sorted newest first)
        setPastPayments(
          payments
            .filter((p: Payment) => p.status === 'completed')
            .sort(
              (a: Payment, b: Payment) =>
                new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
            )
            .slice(0, 10) // Last 10
        );
      } catch (error) {
        console.error('Error fetching payment data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment information.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [userId, toast]);

  const handlePayRent = async () => {
    if (!currentPeriod) return;

    try {
      setPaying(true);

      // Create checkout session
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_period_id: currentPeriod.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to create checkout session');
      const { sessionId } = await res.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to start payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-600">Paid</Badge>;
    }

    const today = new Date();
    const due = new Date(dueDate);

    if (today > due) {
      return <Badge className="bg-red-600">Overdue</Badge>;
    }

    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 5) {
      return <Badge className="bg-yellow-600">Due Soon</Badge>;
    }

    return <Badge className="bg-gray-400">Due {daysUntilDue}d</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      {/* Current Balance Card */}
      {currentPeriod ? (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Current Rent Due</span>
              {getStatusBadge(currentPeriod.status, currentPeriod.due_date)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Property</p>
                <p className="text-lg font-semibold">{property?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Due</p>
                <p className="text-3xl font-bold text-green-600">
                  ${currentPeriod.rent_amount.toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="text-lg font-semibold">
                {new Date(currentPeriod.due_date).toLocaleDateString()}
              </p>
            </div>

            {currentPeriod.status !== 'paid' && (
              <Button
                onClick={handlePayRent}
                disabled={paying}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
              >
                {paying ? 'Processing...' : 'Pay Rent Now'}
              </Button>
            )}

            {currentPeriod.status === 'paid' && (
              <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                <p className="text-green-700 font-semibold">Rent Paid</p>
                <p className="text-sm text-green-600">
                  Paid on {new Date(currentPeriod.due_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center">No current rent period found.</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {pastPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.paid_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-600">
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/pay/receipt/${payment.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-600 text-center py-8">No payment history yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] Page created at `apps/web/app/(tenant)/pay/page.tsx`
2. [ ] CurrentBalanceCard component displays:
   - [ ] Property name
   - [ ] Current rent amount
   - [ ] Due date
   - [ ] Status badge (Due Soon / Overdue / Paid)
   - [ ] "Pay Rent Now" button
3. [ ] "Pay Rent" button calls /api/payments/checkout
4. [ ] Button redirects to Stripe Checkout on success
5. [ ] PaymentHistorySection displays:
   - [ ] Table of past payments (last 10)
   - [ ] Date, amount, status, receipt link
6. [ ] Receipt links navigate to /pay/receipt/[id]
7. [ ] Success redirect (success=true) shows green toast
8. [ ] Cancel redirect (canceled=true) shows error toast
9. [ ] Page generates payment period on load (via /api/payments/generate if missing)
10. [ ] "Paid" state hides "Pay Rent" button and shows "Paid" badge instead
11. [ ] Loading state while fetching data
12. [ ] Responsive layout (mobile-friendly)
13. [ ] No TypeScript errors
14. [ ] Uses project UI components (Card, Button, Badge, Table)

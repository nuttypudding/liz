---
id: 150
title: Build vendor payment dialog + table UI — log payment form, list view
tier: Opus
depends_on: [145, 148]
feature: P2-004-payment-integration
---

# 150 — Build vendor payment dialog + table UI — log payment form, list view

## Objective
Build two components for the Vendor Payments tab:
1. **LogVendorPaymentDialog** — Modal form to log a new vendor payment
2. **VendorPaymentTable** — Table showing all vendor payments for the month with total spend card

The dialog should include:
- Vendor dropdown or text input
- Amount input
- Payment date picker
- Description textarea
- Optional "Link to Request" selector
- Submit and cancel buttons

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Landlords use the vendor payments section to:
- Log maintenance vendor invoices and payments
- Track cumulative spending by vendor
- Link payments to specific maintenance requests
- View total vendor costs for the month

## Implementation

**File**: `apps/web/components/payments/log-vendor-payment-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface LogVendorPaymentDialogProps {
  onSuccess: () => void;
}

export function LogVendorPaymentDialog({ onSuccess }: LogVendorPaymentDialogProps) {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [requestId, setRequestId] = useState('');
  const [properties, setProperties] = useState<any[]>([]);

  // Fetch user's properties on open
  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && properties.length === 0) {
      try {
        const res = await fetch('/api/properties');
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
          if (data.length > 0) setPropertyId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId || !vendorName || !amount || !paymentDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/payments/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          vendor_name: vendorName,
          amount: parseFloat(amount),
          payment_date: paymentDate,
          description: description || undefined,
          request_id: requestId || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to log payment');

      toast({
        title: 'Success',
        description: `Vendor payment logged: ${vendorName} - $${amount}`,
      });

      // Reset form
      setVendorName('');
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setRequestId('');
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error logging vendor payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to log vendor payment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Log Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Vendor Payment</DialogTitle>
          <DialogDescription>
            Record a payment to a contractor or vendor for maintenance work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Selection */}
          <div>
            <label className="text-sm font-medium">Property</label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Name */}
          <div>
            <label className="text-sm font-medium">Vendor Name</label>
            <Input
              placeholder="e.g., John's Plumbing"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium">Amount ($)</label>
            <Input
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="text-sm font-medium">Payment Date</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea
              placeholder="e.g., Fixed leaky kitchen faucet, replaced pipes under sink"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 h-20"
            />
          </div>

          {/* Link to Request (Optional) */}
          <div>
            <label className="text-sm font-medium">Link to Maintenance Request (Optional)</label>
            <Input
              placeholder="Request ID or name"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank if not linked to a specific request.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Logging...' : 'Log Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**File**: `apps/web/components/payments/vendor-payment-table.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

interface VendorPayment {
  id: string;
  vendor_name: string;
  amount: number;
  payment_date: string;
  description?: string;
  request_id?: string;
  maintenance_requests?: {
    title: string;
    status: string;
  };
}

interface VendorPaymentTableProps {
  month?: number;
  propertyId?: string;
}

export function VendorPaymentTable({
  month = new Date().getMonth() + 1,
  propertyId,
}: VendorPaymentTableProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        let query = '/api/payments/vendor?limit=100';
        if (propertyId) query += `&property_id=${propertyId}`;

        const res = await fetch(query);
        if (!res.ok) throw new Error('Failed to fetch vendor payments');

        const { payments: paymentsList } = await res.json();

        // Filter by month if needed
        const filtered = paymentsList.filter((p: VendorPayment) => {
          const paymentMonth = new Date(p.payment_date).getMonth() + 1;
          return paymentMonth === month;
        });

        setPayments(filtered);
        setTotal(filtered.reduce((sum: number, p: VendorPayment) => sum + p.amount, 0));
      } catch (error) {
        console.error('Error fetching vendor payments:', error);
        toast({
          title: 'Error',
          description: 'Failed to load vendor payments.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [month, propertyId, toast]);

  if (loading) {
    return <div className="text-center py-8">Loading vendor payments...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Total Vendor Spend Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Vendor Spend</CardTitle>
          <DollarSign className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">${total.toFixed(2)}</div>
          <p className="text-xs text-gray-600 mt-1">
            {payments.length} payment{payments.length !== 1 ? 's' : ''} this month
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
                    <TableCell className="font-medium">{payment.vendor_name}</TableCell>
                    <TableCell className="font-semibold text-orange-600">
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-gray-600">
                      {payment.description || '—'}
                    </TableCell>
                    <TableCell>
                      {payment.maintenance_requests ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          {payment.maintenance_requests.title}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-600 text-center py-8">No vendor payments recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] LogVendorPaymentDialog created at `apps/web/components/payments/log-vendor-payment-dialog.tsx`
2. [ ] VendorPaymentTable created at `apps/web/components/payments/vendor-payment-table.tsx`
3. [ ] Dialog includes all required fields:
   - [ ] Property selector (populated from /api/properties)
   - [ ] Vendor name (text input)
   - [ ] Amount (number input, 2 decimals)
   - [ ] Payment date (date picker, defaults to today)
   - [ ] Description (textarea, optional)
   - [ ] Link to Request ID (optional)
4. [ ] Dialog validates required fields before submit
5. [ ] Dialog calls POST /api/payments/vendor on submit
6. [ ] Dialog shows success toast and resets form on success
7. [ ] Dialog shows error toast on failure
8. [ ] LogVendorPaymentDialog accepts onSuccess callback
9. [ ] Table displays vendor payments filtered by month
10. [ ] Table shows total vendor spend card
11. [ ] Table includes all payment details:
    - [ ] Vendor name
    - [ ] Amount (orange/red color)
    - [ ] Payment date
    - [ ] Description
    - [ ] Linked request (if any)
12. [ ] Table fetches from /api/payments/vendor
13. [ ] Table supports propertyId filter prop
14. [ ] Responsive layout (dialog, table)
15. [ ] No TypeScript errors
16. [ ] Uses project UI components (Dialog, Input, Textarea, Table, Badge, Card)

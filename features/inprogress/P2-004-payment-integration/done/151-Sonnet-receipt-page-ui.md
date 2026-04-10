---
id: 151
title: Build receipt page UI — payment detail + PDF download
tier: Sonnet
depends_on: [144]
feature: P2-004-payment-integration
---

# 151 — Build receipt page UI — payment detail + PDF download

## Objective
Create the receipt page at `apps/web/app/(tenant)/pay/receipt/[id]/page.tsx`.

Display:
1. **ReceiptCard** — Professional layout with:
   - Liz logo or header
   - Payment date, amount, property, unit, tenant name
   - Payment method (card brand, last 4 digits, confirmation number)
   - Status badge (Paid)
2. **PDF Download Button** — Print receipt as PDF
3. **Print-Friendly CSS** — Receipt displays well on paper

## Context
Reference: `features/inprogress/P2-004-payment-integration/README.md`

Tenants can view payment receipts after paying rent via the /pay page. The receipt serves as proof of payment.

## Implementation

**File**: `apps/web/app/(tenant)/pay/receipt/[id]/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, Printer, ArrowLeft } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface ReceiptData {
  id: string;
  amount: number;
  paid_at: string;
  property_id: string;
  tenant_id: string;
  stripe_details?: {
    charge_id: string;
    payment_method: string;
    last4: string;
    receipt_url?: string;
  };
  properties: {
    name: string;
  };
  payment_periods: {
    month: number;
    year: number;
  };
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const paymentId = params.id as string;

  // Fetch receipt data
  useEffect(() => {
    if (!userId || !paymentId) return;

    const fetchReceipt = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/payments/${paymentId}`);

        if (!res.ok) {
          if (res.status === 404) {
            toast({
              title: 'Receipt Not Found',
              description: 'This payment receipt could not be found.',
              variant: 'destructive',
            });
            router.push('/pay');
          } else {
            throw new Error('Failed to fetch receipt');
          }
          return;
        }

        const data: ReceiptData = await res.json();
        setReceipt(data);
      } catch (error) {
        console.error('Error fetching receipt:', error);
        toast({
          title: 'Error',
          description: 'Failed to load receipt.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [userId, paymentId, toast, router]);

  const handleDownloadPDF = async () => {
    if (!receipt) return;

    try {
      setDownloading(true);

      const element = document.getElementById('receipt-content');
      if (!element) return;

      const options = {
        margin: 10,
        filename: `receipt-${paymentId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      html2pdf().set(options).from(element).save();

      toast({
        title: 'Downloaded',
        description: 'Receipt PDF downloaded successfully.',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to download receipt.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading receipt...</div>;
  }

  if (!receipt) {
    return null;
  }

  const monthName = new Date(2024, receipt.payment_periods.month - 1).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' }
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex gap-2 no-print">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </div>

        {/* Receipt Card */}
        <div id="receipt-content" className="print:m-0">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">Liz</h1>
                  <p className="text-sm text-blue-100">Property Management Platform</p>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600 text-lg py-1">PAID</Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-8 pb-8 px-8 space-y-8 print:space-y-6">
              {/* Header Section */}
              <div className="grid grid-cols-2 gap-8 border-b pb-8 print:border-gray-300">
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-2">RECEIPT #</p>
                  <p className="text-lg font-mono">{receipt.id.slice(0, 12).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 font-semibold mb-2">DATE PAID</p>
                  <p className="text-lg font-semibold">
                    {new Date(receipt.paid_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Property & Payment Info */}
              <div className="grid grid-cols-2 gap-8 print:gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Property</p>
                  <p className="text-xl font-semibold">{receipt.properties.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Rent Period</p>
                  <p className="text-xl font-semibold">{monthName}</p>
                </div>
              </div>

              {/* Amount Section */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">AMOUNT PAID</p>
                <p className="text-4xl font-bold text-blue-600">
                  ${receipt.amount.toFixed(2)}
                </p>
              </div>

              {/* Payment Method */}
              {receipt.stripe_details && (
                <div className="border-t pt-6 print:border-gray-300">
                  <p className="text-sm text-gray-600 font-semibold mb-4">PAYMENT METHOD</p>
                  <div className="space-y-3 print:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Card Brand</span>
                      <span className="font-semibold capitalize">
                        {receipt.stripe_details.payment_method || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Card Number</span>
                      <span className="font-mono font-semibold">
                        •••• •••• •••• {receipt.stripe_details.last4 || '••••'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Confirmation #</span>
                      <span className="font-mono font-semibold text-sm">
                        {receipt.stripe_details.charge_id.slice(0, 12).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-6 text-center text-xs text-gray-500 print:border-gray-300">
                <p>Thank you for your timely payment.</p>
                <p className="mt-2">
                  For questions, contact your property manager.
                </p>
                <p className="mt-4 text-gray-400">
                  Generated on {new Date().toLocaleDateString()} at{' '}
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
            padding: 0;
            margin: 0;
          }

          .no-print {
            display: none !important;
          }

          #receipt-content {
            box-shadow: none;
            border: none;
          }

          .print\\:m-0 {
            margin: 0;
          }

          .print\\:border-gray-300 {
            border-color: rgb(209, 213, 219);
          }

          .print\\:space-y-6 > * + * {
            margin-top: 1.5rem;
          }

          .print\\:gap-4 {
            gap: 1rem;
          }

          .print\\:space-y-2 > * + * {
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] Page created at `apps/web/app/(tenant)/pay/receipt/[id]/page.tsx`
2. [ ] Fetches payment details from /api/payments/[id]
3. [ ] Requires authentication (uses Clerk)
4. [ ] ReceiptCard displays:
   - [ ] Liz logo/header with blue gradient background
   - [ ] "PAID" badge (green)
   - [ ] Receipt # (first 12 chars of payment ID)
   - [ ] Date paid
   - [ ] Property name
   - [ ] Rent period (month/year)
   - [ ] Amount (large, blue, centered)
5. [ ] Payment method details (if available):
   - [ ] Card brand
   - [ ] Last 4 digits (masked: •••• •••• •••• 1234)
   - [ ] Stripe confirmation number
6. [ ] Stripe receipt URL displayed or linked (if available)
7. [ ] Navigation buttons (Back, Print, Download PDF)
8. [ ] Download PDF button uses html2pdf library
9. [ ] Print button opens browser print dialog
10. [ ] Print styles applied:
    - [ ] No-print elements hidden in print
    - [ ] Professional layout on A4 paper
    - [ ] Proper margins and spacing
11. [ ] Responsive design (mobile-friendly)
12. [ ] Error handling:
    - [ ] 404 redirects back to /pay
    - [ ] Network errors show toast
13. [ ] No TypeScript errors
14. [ ] Uses project UI components (Card, Button, Badge)

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, ArrowLeft } from "lucide-react";

interface ReceiptData {
  id: string;
  amount: number;
  paid_at: string;
  property_id: string;
  tenant_id: string;
  stripe_details?: {
    charge_id: string;
    payment_method: string | null | undefined;
    last4: string | null | undefined;
    receipt_url?: string | null;
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

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  const paymentId = params.id as string;

  useEffect(() => {
    if (!paymentId) return;

    async function fetchReceipt() {
      try {
        setLoading(true);
        const res = await fetch(`/api/payments/${paymentId}`);

        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Receipt Not Found", {
              description: "This payment receipt could not be found.",
            });
            router.push("/pay");
          } else {
            throw new Error("Failed to fetch receipt");
          }
          return;
        }

        const data: ReceiptData = await res.json();
        setReceipt(data);
      } catch (error) {
        console.error("Error fetching receipt:", error);
        toast.error("Error", { description: "Failed to load receipt." });
      } finally {
        setLoading(false);
      }
    }

    fetchReceipt();
  }, [paymentId, router]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading receipt...
      </div>
    );
  }

  if (!receipt) {
    return null;
  }

  const monthName = new Date(
    receipt.payment_periods.year,
    receipt.payment_periods.month - 1
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Receipt Card */}
        <div id="receipt-content" className="print:m-0">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">Liz</h1>
                  <p className="text-sm text-blue-100">
                    Property Management Platform
                  </p>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600 text-lg py-1">
                  PAID
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-8 pb-8 px-8 space-y-8 print:space-y-6">
              {/* Receipt # and Date */}
              <div className="grid grid-cols-2 gap-8 border-b pb-8 print:border-gray-300">
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-2">
                    RECEIPT #
                  </p>
                  <p className="text-lg font-mono">
                    {receipt.id.slice(0, 12).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 font-semibold mb-2">
                    DATE PAID
                  </p>
                  <p className="text-lg font-semibold">
                    {new Date(receipt.paid_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Property & Rent Period */}
              <div className="grid grid-cols-2 gap-8 print:gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">
                    Property
                  </p>
                  <p className="text-xl font-semibold">
                    {receipt.properties.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">
                    Rent Period
                  </p>
                  <p className="text-xl font-semibold">{monthName}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">AMOUNT PAID</p>
                <p className="text-4xl font-bold text-blue-600">
                  ${Number(receipt.amount).toFixed(2)}
                </p>
              </div>

              {/* Payment Method */}
              {receipt.stripe_details && (
                <div className="border-t pt-6 print:border-gray-300">
                  <p className="text-sm text-gray-600 font-semibold mb-4">
                    PAYMENT METHOD
                  </p>
                  <div className="space-y-3 print:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Card Brand</span>
                      <span className="font-semibold capitalize">
                        {receipt.stripe_details.payment_method || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Card Number</span>
                      <span className="font-mono font-semibold">
                        •••• •••• ••••{" "}
                        {receipt.stripe_details.last4 || "••••"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Confirmation #</span>
                      <span className="font-mono font-semibold text-sm">
                        {receipt.stripe_details.charge_id
                          .slice(0, 12)
                          .toUpperCase()}
                      </span>
                    </div>
                    {receipt.stripe_details.receipt_url && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Stripe Receipt</span>
                        <a
                          href={receipt.stripe_details.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          View on Stripe
                        </a>
                      </div>
                    )}
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
                  Generated on {new Date().toLocaleDateString()} at{" "}
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
        }
      `}</style>
    </div>
  );
}

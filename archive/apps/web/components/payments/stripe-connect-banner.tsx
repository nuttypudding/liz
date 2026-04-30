"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function StripeConnectBanner() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    try {
      setLoading(true);
      const res = await fetch("/api/payments/connect/onboard");
      if (!res.ok) throw new Error("Failed to generate account link");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      toast.error("Failed to connect Stripe account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              Stripe Account Required
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              To collect rent payments from tenants, you need to connect your
              Stripe account. This allows payments to be deposited directly into
              your bank account.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            "Connecting..."
          ) : (
            <>
              Connect Stripe Account
              <ExternalLink className="size-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Stripe is a secure payment processor trusted by millions of
          businesses. Your banking information is never shared with Liz.
        </p>
      </CardContent>
    </Card>
  );
}

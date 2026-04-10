"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function StripeConnectBanner() {
  async function handleConnect() {
    try {
      const res = await fetch("/api/payments/connect/onboard");
      if (!res.ok) throw new Error("Failed to start onboarding");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      console.error("Stripe Connect onboarding failed");
    }
  }

  return (
    <Card className="border-yellow-600/50 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="flex items-center gap-4 py-4">
        <AlertTriangle className="size-5 text-yellow-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            Connect your Stripe account to start accepting rent payments.
          </p>
        </div>
        <Button size="sm" onClick={handleConnect}>
          Connect Stripe
        </Button>
      </CardContent>
    </Card>
  );
}

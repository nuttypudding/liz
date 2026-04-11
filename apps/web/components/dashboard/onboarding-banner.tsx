"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Sparkles className="size-5 text-primary" />
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">Complete your setup</p>
        <p className="text-xs text-muted-foreground">
          Personalize your AI assistant to match your management style.
        </p>
      </div>
      <Button size="sm" asChild>
        <Link href="/onboarding">Get Started</Link>
      </Button>
    </div>
  );
}

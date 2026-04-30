"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2, Zap, Pause } from "lucide-react";
import { toast } from "sonner";

interface StatusBannerProps {
  paused: boolean;
  onToggle: (paused: boolean) => void;
}

export function StatusBanner({ paused, onToggle }: StatusBannerProps) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch("/api/autonomy/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      onToggle(!paused);
      toast.success(paused ? "Autonomy activated" : "Autonomy paused");
    } catch {
      toast.error("Failed to update autonomy status");
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card
      className={`border-l-4 ${paused ? "border-l-muted-foreground" : "border-l-green-500"}`}
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-full ${
              paused
                ? "bg-muted text-muted-foreground"
                : "bg-green-500/10 text-green-600 dark:text-green-400"
            }`}
          >
            {paused ? (
              <Pause className="size-5" />
            ) : (
              <Zap className="size-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Autonomy is{" "}
              <span
                className={
                  paused
                    ? "text-muted-foreground"
                    : "text-green-600 dark:text-green-400"
                }
              >
                {paused ? "PAUSED" : "ACTIVE"}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {paused
                ? "AI will not make autonomous decisions"
                : "AI is handling routine maintenance decisions"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={!paused}
              onCheckedChange={() => handleToggle()}
              disabled={toggling}
            />
            <span className="sr-only">
              {paused ? "Activate" : "Pause"} autonomy
            </span>
          </label>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings?tab=autonomy">
              <Settings2 className="mr-1.5 size-4" />
              Configure
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBannerSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="size-10 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import type { TestableComponent } from "@/lib/types/test-lab";
import type { TestRun } from "@/lib/types/test-lab";

interface ComponentsListProps {
  components: TestableComponent[];
  onRunComplete: () => void;
}

export function ComponentsList({ components, onRunComplete }: ComponentsListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {components.map((comp) => (
        <ComponentCard key={comp.name} component={comp} onRunComplete={onRunComplete} />
      ))}
    </div>
  );
}

function ComponentCard({
  component,
  onRunComplete,
}: {
  component: TestableComponent;
  onRunComplete: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<TestRun | null>(null);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch(`/api/test-lab/runs?component=${component.name}&limit=1`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.runs.length > 0) setLatestRun(data.runs[0]);
      } catch {
        // ignore
      }
    }
    fetchLatest();
  }, [component.name]);

  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch(`/api/test-lab/components/${component.name}/run`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Run failed");
      const data = await res.json();
      setLatestRun(data.run);
      toast.success(`Test suite completed: ${data.run.passed_cases}/${data.run.total_cases} passed`);
      onRunComplete();
    } catch {
      toast.error("Failed to run test suite");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{component.label}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {component.sample_count} samples
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{component.description}</p>

        {latestRun && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Last run:</span>
            <Badge
              variant={
                latestRun.status === "completed" ? "default" : "destructive"
              }
              className="text-xs"
            >
              {latestRun.passed_cases}/{latestRun.total_cases} passed
            </Badge>
            <span className="text-muted-foreground">
              {new Date(latestRun.created_at).toLocaleDateString()}
            </span>
          </div>
        )}

        <Button
          onClick={handleRun}
          disabled={running}
          size="sm"
          className="w-full"
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running ({component.sample_count} samples)...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Test Suite
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

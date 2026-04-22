"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ClassifyOutput } from "@liz/triage";

export function ManualTestForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyOutput | null>(null);

  async function handleSubmit() {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/test-lab/components/triage/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) throw new Error("Classification failed");
      const data: ClassifyOutput = await res.json();
      setResult(data);
    } catch {
      toast.error("Failed to classify message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Enter a tenant maintenance message to classify..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Classify
        </Button>
      </div>

      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gatekeeper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Self-resolvable:</span>
                <Badge variant={result.gatekeeper.self_resolvable ? "default" : "secondary"}>
                  {result.gatekeeper.self_resolvable ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-mono">{(result.gatekeeper.confidence * 100).toFixed(0)}%</span>
              </div>
              {result.gatekeeper.troubleshooting_guide && (
                <div>
                  <span className="text-muted-foreground">Guide:</span>
                  <p className="mt-1 rounded bg-muted p-2 text-xs whitespace-pre-wrap">
                    {result.gatekeeper.troubleshooting_guide}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estimator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Category:</span>
                <Badge>{result.classification.category}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Urgency:</span>
                <Badge
                  variant={
                    result.classification.urgency === "emergency"
                      ? "destructive"
                      : result.classification.urgency === "medium"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {result.classification.urgency}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-mono">{(result.classification.confidence_score * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-mono">
                  ${result.classification.cost_estimate_low} – ${result.classification.cost_estimate_high}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Action:</span>
                <p className="mt-1 rounded bg-muted p-2 text-xs">
                  {result.classification.recommended_action}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

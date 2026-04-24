"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { ArenaResult } from "./arena-content";

interface ResultCardProps {
  result?: ArenaResult;
  truth: { category: string; urgency: string };
}

function MatchIcon({ match }: { match: boolean }) {
  return match ? (
    <CheckCircle2 className="inline h-3.5 w-3.5 text-green-600" />
  ) : (
    <XCircle className="inline h-3.5 w-3.5 text-red-600" />
  );
}

export function ResultCard({ result, truth }: ResultCardProps) {
  if (!result) {
    return (
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p>Category: ___</p>
        <p>Urgency: ___</p>
        <p className="text-xs">Action: —</p>
        <p>Confidence: ___</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="space-y-1 text-sm">
        <p className="text-destructive font-medium text-xs">Error</p>
        <p className="text-xs text-destructive">{result.error}</p>
      </div>
    );
  }

  const catMatch = result.category === truth.category;
  const urgMatch = result.urgency === truth.urgency;

  return (
    <div className="space-y-1.5 text-sm">
      <p>
        <span className="text-muted-foreground">Category: </span>
        <code className="text-xs">{result.category}</code>{" "}
        <MatchIcon match={catMatch} />
      </p>
      <p>
        <span className="text-muted-foreground">Urgency: </span>
        <code className="text-xs">{result.urgency}</code>{" "}
        <MatchIcon match={urgMatch} />
      </p>
      <div>
        <span className="text-muted-foreground text-xs">Action: </span>
        <span className="text-xs line-clamp-2">{result.recommended_action}</span>
      </div>
      <p>
        <span className="text-muted-foreground">Confidence: </span>
        <span className="font-mono text-xs">
          {Math.round(result.confidence_score * 100)}%
        </span>
      </p>
    </div>
  );
}

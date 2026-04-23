"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Loader2, Play, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { SampleData } from "@liz/triage";
import type { RowResult } from "./test-lab-content";

interface SampleGridProps {
  samples: SampleData[];
  results: Record<string, RowResult>;
  expandedRows: Set<string>;
  onRun: (sampleId: string) => void;
  onToggleExpand: (sampleId: string) => void;
}

function urgencyBadgeClass(urgency: string) {
  switch (urgency) {
    case "emergency":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "";
  }
}

function StatusIcon({ result }: { result?: RowResult }) {
  if (!result || result.status === "idle") return <span className="text-muted-foreground">-</span>;
  if (result.status === "running") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (result.status === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (result.passed) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  return <XCircle className="h-4 w-4 text-red-600" />;
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export function SampleGrid({
  samples,
  results,
  expandedRows,
  onRun,
  onToggleExpand,
}: SampleGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead className="w-28">ID</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Exp Cat</TableHead>
          <TableHead>Exp Urg</TableHead>
          <TableHead className="w-16" />
          <TableHead>Act Cat</TableHead>
          <TableHead>Act Urg</TableHead>
          <TableHead>Conf</TableHead>
          <TableHead>Time</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {samples.map((sample) => {
          const r = results[sample.sample_id];
          const expanded = expandedRows.has(sample.sample_id);
          const shortId = sample.sample_id.replace("sample_", "s_");

          return (
            <SampleRow
              key={sample.sample_id}
              sample={sample}
              result={r}
              expanded={expanded}
              shortId={shortId}
              onRun={() => onRun(sample.sample_id)}
              onToggleExpand={() => onToggleExpand(sample.sample_id)}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

function SampleRow({
  sample,
  result,
  expanded,
  shortId,
  onRun,
  onToggleExpand,
}: {
  sample: SampleData;
  result?: RowResult;
  expanded: boolean;
  shortId: string;
  onRun: () => void;
  onToggleExpand: () => void;
}) {
  const isRunning = result?.status === "running";
  const isDone = result?.status === "done";
  const categoryMatch = isDone && result.actual_category === sample.expected.category;
  const urgencyMatch = isDone && result.actual_urgency === sample.expected.urgency;

  return (
    <>
      <TableRow className={expanded ? "border-b-0" : undefined}>
        <TableCell>
          <button
            onClick={onToggleExpand}
            className="p-0.5 rounded hover:bg-muted"
            aria-label={expanded ? "Collapse row" : "Expand row"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </TableCell>
        <TableCell className="font-mono text-xs">{shortId}</TableCell>
        <TableCell className="max-w-xs">
          <span className="text-sm">{truncate(sample.tenant_message, 80)}</span>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{sample.expected.category}</Badge>
        </TableCell>
        <TableCell>
          <Badge className={urgencyBadgeClass(sample.expected.urgency)}>
            {sample.expected.urgency}
          </Badge>
        </TableCell>
        <TableCell>
          <Button
            size="sm"
            variant="outline"
            onClick={onRun}
            disabled={isRunning}
            className="h-7 w-14 px-2"
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Play className="h-3 w-3" />
                <span className="text-xs">Run</span>
              </>
            )}
          </Button>
        </TableCell>
        <TableCell>
          {isDone ? (
            <Badge
              variant={categoryMatch ? "default" : "destructive"}
              className={categoryMatch ? "bg-green-100 text-green-800 border-green-300" : undefined}
            >
              {result.actual_category}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          {isDone ? (
            <Badge
              variant={urgencyMatch ? "default" : "destructive"}
              className={urgencyMatch ? "bg-green-100 text-green-800 border-green-300" : undefined}
            >
              {result.actual_urgency}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">
          {isDone && result.confidence != null
            ? `${Math.round(result.confidence * 100)}%`
            : "-"}
        </TableCell>
        <TableCell className="font-mono text-xs">
          {isDone && result.execution_time_ms != null
            ? `${(result.execution_time_ms / 1000).toFixed(1)}s`
            : "-"}
        </TableCell>
        <TableCell>
          <StatusIcon result={result} />
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={11} className="py-3 px-6">
            <ExpandedDetail sample={sample} result={result} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ExpandedDetail({
  sample,
  result,
}: {
  sample: SampleData;
  result?: RowResult;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <span className="font-medium text-muted-foreground">Full message: </span>
        <span>{sample.tenant_message}</span>
      </div>
      {result?.status === "done" && (
        <>
          {result.gatekeeper && (
            <div>
              <span className="font-medium text-muted-foreground">Gatekeeper: </span>
              <span>
                {result.gatekeeper.self_resolvable ? "Self-resolvable" : "Not self-resolvable"}{" "}
                ({Math.round(result.gatekeeper.confidence * 100)}%)
              </span>
              {result.gatekeeper.troubleshooting_guide && (
                <p className="mt-1 rounded bg-muted p-2 text-xs whitespace-pre-wrap">
                  {result.gatekeeper.troubleshooting_guide}
                </p>
              )}
            </div>
          )}
          {result.recommended_action && (
            <div>
              <span className="font-medium text-muted-foreground">Action: </span>
              <span>{result.recommended_action}</span>
            </div>
          )}
          {result.cost_low != null && result.cost_high != null && (
            <div>
              <span className="font-medium text-muted-foreground">Cost: </span>
              <span className="font-mono">${result.cost_low} - ${result.cost_high}</span>
            </div>
          )}
          {result.error && (
            <div className="text-destructive">
              <span className="font-medium">Error: </span>
              <span>{result.error}</span>
            </div>
          )}
        </>
      )}
      {result?.status === "error" && result.error && (
        <div className="text-destructive">
          <span className="font-medium">Error: </span>
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Shield, Settings } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExecutedAction } from "@/lib/types/rules";

interface LogEntry {
  id: string;
  request_id: string;
  rule_id: string;
  matched: boolean;
  conditions_result: unknown;
  actions_executed: ExecutedAction[];
  evaluated_at: string;
  rule_name: string | null;
  request_category: string | null;
}

interface RuleAuditCardProps {
  requestId: string;
}

function inferActionType(action: ExecutedAction): string {
  const detail = (action.result as { detail?: string })?.detail ?? "";
  if (detail.includes("auto-approved") || detail.includes("escalate takes priority")) {
    return "auto_approve";
  }
  if (detail.includes("vendor") && (detail.includes("assigned") || detail.includes("already assigned"))) {
    return "assign_vendor";
  }
  if (detail.includes("notification") || detail.includes("notify")) {
    return "notify_landlord";
  }
  if (detail.includes("escalated")) {
    return "escalate";
  }
  return "unknown";
}

function ActionBadge({ action }: { action: ExecutedAction }) {
  const type = inferActionType(action);

  switch (type) {
    case "auto_approve":
      return (
        <Badge
          className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
          aria-label="Auto-approved action"
        >
          Auto-Approved
        </Badge>
      );
    case "assign_vendor":
      return (
        <Badge
          className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
          aria-label="Vendor assigned action"
        >
          Vendor Assigned
        </Badge>
      );
    case "escalate":
      return (
        <Badge
          className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
          aria-label="Escalated action"
        >
          Escalated
        </Badge>
      );
    case "notify_landlord":
      return (
        <Badge
          className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
          aria-label="Landlord notified action"
        >
          Notified Landlord
        </Badge>
      );
    default:
      return null;
  }
}

function MatchedRuleEntry({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const actions = log.actions_executed ?? [];

  return (
    <section className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-1.5 text-left w-full group"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
        )}
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium leading-tight group-hover:underline">
            {log.rule_name ?? "Unnamed Rule"}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            {log.rule_id}
          </p>
        </div>
      </button>

      <div className="flex flex-wrap gap-1.5 pl-5">
        {actions.map((action, i) => (
          <ActionBadge key={i} action={action} />
        ))}
      </div>

      {expanded && (
        <div className="pl-5 mt-2 space-y-2">
          {log.conditions_result != null && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Conditions
              </p>
              <pre className="text-[11px] bg-muted rounded-md p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(log.conditions_result, null, 2)}
              </pre>
            </div>
          )}
          {actions.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Actions
              </p>
              <pre className="text-[11px] bg-muted rounded-md p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(actions, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function RuleAuditCard({ requestId }: RuleAuditCardProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/rules/logs?request_id=${encodeURIComponent(requestId)}&matched_only=true`
        );
        if (!res.ok) {
          throw new Error("Failed to load rule logs");
        }
        const data = await res.json();
        if (!cancelled) {
          setLogs(data.logs ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load automation rules data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLogs();
    return () => { cancelled = true; };
  }, [requestId]);

  const editRulesLink = (
    <Link
      href="/settings?tab=automation"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Settings className="size-3" />
      Edit rules
    </Link>
  );

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground shrink-0" />
          <p className="text-sm font-semibold">Automation Rules</p>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-3">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && logs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No automation rules matched this request
          </p>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <MatchedRuleEntry key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0">
        {editRulesLink}
      </CardFooter>
    </Card>
  );
}

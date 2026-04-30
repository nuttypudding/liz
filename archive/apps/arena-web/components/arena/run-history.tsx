"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { X, RefreshCw } from "lucide-react";

interface HistoryEntry {
  id: string;
  model_id: string;
  sample_id: string;
  category: string;
  urgency: string;
  recommended_action: string;
  confidence_score: number;
  execution_time_ms: number | null;
  photo_count: number;
  error: string | null;
  created_at: string;
}

interface RunHistoryProps {
  onClose: () => void;
}

export function RunHistory({ onClose }: RunHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState<string>("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const url = filterModel
        ? `/api/arena/history?model=${encodeURIComponent(filterModel)}`
        : "/api/arena/history";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      // Failed to load
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [filterModel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get unique models for filter
  const uniqueModels = [...new Set(entries.map((e) => e.model_id))].sort();

  // Group by model for summary stats
  const modelStats = new Map<string, { total: number; catCorrect: number; urgCorrect: number }>();

  // We don't have ground truth here, but we can show counts
  for (const entry of entries) {
    if (!modelStats.has(entry.model_id)) {
      modelStats.set(entry.model_id, { total: 0, catCorrect: 0, urgCorrect: 0 });
    }
    const stats = modelStats.get(entry.model_id)!;
    stats.total++;
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Run History</h3>
          <div className="flex items-center gap-2">
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="text-xs rounded border border-input bg-background px-2 py-1"
            >
              <option value="">All models</option>
              {uniqueModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={fetchHistory}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{entries.length} total results</span>
          <span>{modelStats.size} models</span>
          <span>{new Set(entries.map((e) => e.sample_id)).size} unique samples</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results yet. Run the arena to start collecting data.</p>
        ) : (
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Model</TableHead>
                  <TableHead className="text-xs">Sample</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Urgency</TableHead>
                  <TableHead className="text-xs">Conf</TableHead>
                  <TableHead className="text-xs">Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">
                      {entry.model_id}
                    </TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">
                      {entry.sample_id.replace("sample_", "#").split("_").slice(0, 2).join("_")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          entry.urgency === "emergency"
                            ? "bg-red-100 text-red-800"
                            : entry.urgency === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {entry.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {Math.round(entry.confidence_score * 100)}%
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.execution_time_ms
                        ? `${(entry.execution_time_ms / 1000).toFixed(1)}s`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ModelConfig } from "@/lib/models";

const TIER_LABELS: Record<number, string> = {
  1: "Best",
  2: "Good",
  3: "Basic",
};

const TIER_BADGES: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-gray-100 text-gray-800",
};

interface ModelComparisonTableProps {
  models: ModelConfig[];
}

export function ModelComparisonTable({ models }: ModelComparisonTableProps) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-foreground transition-colors">
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        Model Comparison
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Vision</TableHead>
                <TableHead className="text-right">Input $/1M</TableHead>
                <TableHead className="text-right">Output $/1M</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => (
                <TableRow key={m.model_id}>
                  <TableCell className="font-mono text-xs">
                    {m.model_id}
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {m.provider}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TIER_BADGES[m.vision_tier] || ""}`}
                    >
                      {TIER_LABELS[m.vision_tier] || "?"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${m.cost_input_1m.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${m.cost_output_1m.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {m.vision_note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

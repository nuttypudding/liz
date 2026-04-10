"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreVertical,
  Pencil,
  FlaskConical,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AutomationRule } from "@/lib/types/rules";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface RuleCardProps {
  rule: AutomationRule;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (rule: AutomationRule) => void;
  onTest: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  disableDrag: boolean;
}

export function RuleCard({
  rule,
  onToggle,
  onEdit,
  onTest,
  onDelete,
  disableDrag,
}: RuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow ${
        isDragging ? "z-10 shadow-lg opacity-80" : "shadow-sm"
      } ${!rule.enabled ? "opacity-60" : ""}`}
      role="listitem"
      aria-label={`Rule: ${rule.name}`}
    >
      {/* Drag handle */}
      {!disableDrag && (
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      {/* Enable/disable checkbox */}
      <Checkbox
        checked={rule.enabled}
        onCheckedChange={(checked) => onToggle(rule.id, checked as boolean)}
        aria-label={`${rule.enabled ? "Disable" : "Enable"} rule: ${rule.name}`}
      />

      {/* Rule info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{rule.name}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {ordinal(rule.priority + 1)}
          </Badge>
        </div>
        {rule.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {rule.description}
          </p>
        )}
      </div>

      {/* Overflow menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${rule.name}`}
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onClick={() => onEdit(rule)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTest(rule)}>
            <FlaskConical className="size-4" />
            Test
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(rule)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

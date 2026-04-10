"use client";

import { useCallback, useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, Workflow } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RuleList } from "@/components/rules/RuleList";
import { DeleteRuleDialog } from "@/components/rules/DeleteRuleDialog";
import { RuleBuilder } from "@/components/rules/RuleBuilder";
import type { AutomationRule } from "@/lib/types/rules";

const RULE_LIMIT = 25;

export function RulesManager() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AutomationRule | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/rules");
      if (!res.ok) throw new Error("Failed to fetch");
      const { rules } = (await res.json()) as { rules: AutomationRule[] };
      setRules(rules);
    } catch {
      toast.error("Failed to load automation rules");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      // Optimistic update
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled } : r))
      );

      try {
        const res = await fetch(`/api/rules/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });

        if (!res.ok) throw new Error("Failed to update");
        toast.success(`Rule ${enabled ? "enabled" : "disabled"}`);
      } catch {
        // Revert
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r))
        );
        toast.error("Failed to update rule");
      }
    },
    []
  );

  const handleReorder = useCallback(
    async (ruleId: string, newIndex: number) => {
      const oldIndex = rules.findIndex((r) => r.id === ruleId);
      if (oldIndex === -1 || oldIndex === newIndex) return;

      // Optimistic update
      const reordered = arrayMove(rules, oldIndex, newIndex).map((r, i) => ({
        ...r,
        priority: i,
      }));
      setRules(reordered);

      try {
        const res = await fetch(`/api/rules/${ruleId}/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_priority: newIndex }),
        });

        if (!res.ok) throw new Error("Failed to reorder");
      } catch {
        // Revert
        setRules(rules);
        toast.error("Failed to reorder rule");
      }
    },
    [rules]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    // Optimistic removal
    const prev = rules;
    setRules((r) => r.filter((rule) => rule.id !== deleteTarget.id));

    try {
      const res = await fetch(`/api/rules/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Rule deleted");
      setDeleteTarget(null);
    } catch {
      setRules(prev);
      toast.error("Failed to delete rule");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, rules]);

  const handleEdit = useCallback((rule: AutomationRule) => {
    setEditTarget(rule);
    setBuilderOpen(true);
  }, []);

  const handleTest = useCallback((_rule: AutomationRule) => {
    // Rule Test Panel (task 131) — placeholder
    toast.info("Rule Test Panel coming soon");
  }, []);

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setBuilderOpen(true);
  }, []);

  const handleBuilderSaved = useCallback(() => {
    fetchRules();
  }, [fetchRules]);

  const activeCount = rules.filter((r) => r.enabled).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {activeCount} active rule{activeCount !== 1 ? "s" : ""}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {rules.length} / {RULE_LIMIT}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={rules.length >= RULE_LIMIT}
        >
          <Plus className="size-4" />
          Create Rule
        </Button>
      </div>

      {/* Limit warning */}
      {rules.length >= RULE_LIMIT && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          You&apos;ve reached the {RULE_LIMIT}-rule limit. Delete an existing
          rule to create a new one.
        </p>
      )}

      {/* Rule list or empty state */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
          <Workflow className="size-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium">No automation rules yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create rules to automatically handle maintenance requests based on
            category, urgency, cost, and more.
          </p>
          <Button size="sm" className="mt-4" onClick={handleCreate}>
            <Plus className="size-4" />
            Create your first rule
          </Button>
        </div>
      ) : (
        <RuleList
          rules={rules}
          onReorder={handleReorder}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onTest={handleTest}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Rule Builder sheet/dialog */}
      <RuleBuilder
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) setEditTarget(null);
        }}
        rule={editTarget}
        onSaved={handleBuilderSaved}
      />

      {/* Delete confirmation dialog */}
      <DeleteRuleDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        ruleName={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}

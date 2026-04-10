"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import { RuleCard } from "./RuleCard";
import type { AutomationRule } from "@/lib/types/rules";

interface RuleListProps {
  rules: AutomationRule[];
  onReorder: (ruleId: string, newIndex: number) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (rule: AutomationRule) => void;
  onTest: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
}

export function RuleList({
  rules,
  onReorder,
  onToggle,
  onEdit,
  onTest,
  onDelete,
}: RuleListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onReorder(active.id as string, newIndex);
    },
    [rules, onReorder]
  );

  const disableDrag = rules.length <= 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext
        items={rules.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2" role="list" aria-label="Automation rules">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={onToggle}
              onEdit={onEdit}
              onTest={onTest}
              onDelete={onDelete}
              disableDrag={disableDrag}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { RuleTestPanel } from "@/components/rules/RuleTestPanel";
import {
  RuleConditionType,
  ConditionOperator,
  RuleActionType,
  NotificationMethod,
  NotificationRecipient,
} from "@/lib/types/rules";
import type {
  AutomationRule,
  RuleCondition,
  RuleAction,
  RuleActionParams,
} from "@/lib/types/rules";
import { ZodAutomationRuleCreate } from "@/lib/schemas/rules";

// --- Constants ---

const CATEGORIES = [
  "plumbing",
  "electrical",
  "hvac",
  "structural",
  "pest",
  "appliance",
  "general",
] as const;

const URGENCY_LEVELS = ["low", "medium", "emergency"] as const;

const CONDITION_TYPE_LABELS: Record<RuleConditionType, string> = {
  [RuleConditionType.CATEGORY]: "Category",
  [RuleConditionType.URGENCY]: "Urgency",
  [RuleConditionType.COST_RANGE]: "Cost Range",
  [RuleConditionType.PROPERTY_SELECTOR]: "Property",
  [RuleConditionType.VENDOR_AVAILABLE]: "Vendor",
};

const ACTION_TYPE_LABELS: Record<RuleActionType, string> = {
  [RuleActionType.AUTO_APPROVE]: "Auto-approve",
  [RuleActionType.ASSIGN_VENDOR]: "Assign Vendor",
  [RuleActionType.NOTIFY_LANDLORD]: "Notify Landlord",
  [RuleActionType.ESCALATE]: "Escalate",
};

const ACTION_TYPE_DESCRIPTIONS: Record<RuleActionType, string> = {
  [RuleActionType.AUTO_APPROVE]: "Automatically approve and dispatch",
  [RuleActionType.ASSIGN_VENDOR]: "Assign a specific vendor",
  [RuleActionType.NOTIFY_LANDLORD]: "Send a notification",
  [RuleActionType.ESCALATE]: "Flag for immediate attention",
};

// Default operators per condition type
function defaultOperator(type: RuleConditionType): ConditionOperator {
  switch (type) {
    case RuleConditionType.COST_RANGE:
      return ConditionOperator.RANGE;
    case RuleConditionType.VENDOR_AVAILABLE:
      return ConditionOperator.EQUALS;
    default:
      return ConditionOperator.IN;
  }
}

// Default value per condition type
function defaultConditionValue(type: RuleConditionType): unknown {
  switch (type) {
    case RuleConditionType.CATEGORY:
    case RuleConditionType.URGENCY:
    case RuleConditionType.PROPERTY_SELECTOR:
    case RuleConditionType.VENDOR_AVAILABLE:
      return [];
    case RuleConditionType.COST_RANGE:
      return { min: 0, max: 500 };
  }
}

function emptyCondition(): RuleCondition {
  return {
    type: RuleConditionType.CATEGORY,
    operator: ConditionOperator.IN,
    value: [],
  };
}

function emptyAction(): RuleAction {
  return {
    type: RuleActionType.AUTO_APPROVE,
    params: {},
  };
}

// --- Props ---

interface RuleBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AutomationRule | null;
  onSaved: () => void;
}

// --- Form state ---

interface FormState {
  name: string;
  description: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

interface FormErrors {
  name?: string;
  conditions?: string;
  actions?: string;
}

// --- Component ---

export function RuleBuilder({
  open,
  onOpenChange,
  rule,
  onSaved,
}: RuleBuilderProps) {
  const isMobile = useIsMobile();
  const isEdit = !!rule;

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    conditions: [emptyCondition()],
    actions: [emptyAction()],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name,
        description: rule.description ?? "",
        conditions: rule.conditions.length > 0 ? rule.conditions : [emptyCondition()],
        actions: rule.actions.length > 0 ? rule.actions : [emptyAction()],
      });
      setDirty(false);
      setErrors({});
    } else {
      setForm({
        name: "",
        description: "",
        conditions: [emptyCondition()],
        actions: [emptyAction()],
      });
      setDirty(false);
      setErrors({});
    }
  }, [rule, open]);

  // --- Validation ---

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim()) {
      e.name = "Rule name is required";
    } else if (form.name.length > 255) {
      e.name = "Rule name must be 255 characters or less";
    }
    if (form.conditions.length === 0) {
      e.conditions = "At least one condition required";
    }
    if (form.actions.length === 0) {
      e.actions = "At least one action required";
    }
    return e;
  }, [form]);

  const validationErrors = useMemo(() => validate(), [validate]);
  const isValid = Object.keys(validationErrors).length === 0;

  // --- Updaters ---

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function updateCondition(index: number, condition: RuleCondition) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => (i === index ? condition : c)),
    }));
    setDirty(true);
    if (errors.conditions) setErrors((prev) => ({ ...prev, conditions: undefined }));
  }

  function addCondition() {
    setForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, emptyCondition()],
    }));
    setDirty(true);
    if (errors.conditions) setErrors((prev) => ({ ...prev, conditions: undefined }));
  }

  function removeCondition(index: number) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
    setDirty(true);
  }

  function updateAction(index: number, action: RuleAction) {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((a, i) => (i === index ? action : a)),
    }));
    setDirty(true);
    if (errors.actions) setErrors((prev) => ({ ...prev, actions: undefined }));
  }

  function addAction() {
    setForm((prev) => ({
      ...prev,
      actions: [...prev.actions, emptyAction()],
    }));
    setDirty(true);
    if (errors.actions) setErrors((prev) => ({ ...prev, actions: undefined }));
  }

  function removeAction(index: number) {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
    setDirty(true);
  }

  // --- Save ---

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Build payload
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      conditions: form.conditions,
      actions: form.actions,
    };

    // Client-side Zod validation
    const result = ZodAutomationRuleCreate.safeParse({
      ...payload,
      description: payload.description ?? undefined,
    });
    if (!result.success) {
      toast.error("Validation failed", {
        description: result.error.issues[0]?.message ?? "Check your inputs",
      });
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/rules/${rule!.id}` : "/api/rules";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save rule");
      }

      toast.success(isEdit ? "Rule updated" : "Rule created");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save rule"
      );
    } finally {
      setSaving(false);
    }
  }

  // --- Cancel with dirty check ---

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && dirty) {
      if (!window.confirm("You have unsaved changes. Discard?")) return;
    }
    onOpenChange(nextOpen);
  }

  // --- Render form content ---

  const staleRefs = rule?.stale_references ?? [];

  const formContent = (
    <div className="flex flex-col gap-6">
      {/* Stale reference warning */}
      {staleRefs.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-medium">This rule references deleted vendors/properties. Edit the affected fields below and save to resolve.</p>
            <ul className="space-y-0.5 list-disc list-inside">
              {staleRefs.map((ref, i) => (
                <li key={i}>{ref.message} — <code className="font-mono">{ref.location}</code></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Rule Name */}
      <div className="space-y-1.5">
        <Label htmlFor="rule-name">
          Rule name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="rule-name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g., Auto-approve cheap plumbing"
          maxLength={255}
          aria-invalid={!!validationErrors.name}
        />
        {validationErrors.name && (
          <p className="text-xs text-destructive">{validationErrors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="rule-description">Description</Label>
        <Textarea
          id="rule-description"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Optional — describe what this rule does"
          maxLength={1000}
          rows={2}
        />
      </div>

      <Separator />

      {/* Conditions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">
              IF all of the following match:
            </h3>
            {validationErrors.conditions && (
              <p className="text-xs text-destructive mt-0.5">
                {validationErrors.conditions}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        <div
          className="space-y-2"
          role="list"
          aria-label="Rule conditions"
        >
          {form.conditions.map((condition, idx) => (
            <ConditionRow
              key={idx}
              condition={condition}
              onChange={(c) => updateCondition(idx, c)}
              onRemove={() => removeCondition(idx)}
              canRemove={form.conditions.length > 1}
            />
          ))}
        </div>

        {form.conditions.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            This rule will match ALL requests. Add a condition to narrow it down.
          </p>
        )}
      </div>

      <Separator />

      {/* Actions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">
              THEN perform these actions:
            </h3>
            {validationErrors.actions && (
              <p className="text-xs text-destructive mt-0.5">
                {validationErrors.actions}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAction}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        <div
          className="space-y-2"
          role="list"
          aria-label="Rule actions"
        >
          {form.actions.map((action, idx) => (
            <ActionRow
              key={idx}
              action={action}
              onChange={(a) => updateAction(idx, a)}
              onRemove={() => removeAction(idx)}
              canRemove={form.actions.length > 1}
            />
          ))}
        </div>

        {form.actions.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Add at least one action to define what happens when conditions match.
          </p>
        )}
      </div>

      <Separator />

      {/* Test Panel */}
      <RuleTestPanel
        ruleId={rule?.id}
        conditions={form.conditions}
        actions={form.actions}
        isFormValid={isValid}
      />
    </div>
  );

  const footer = (
    <>
      <Button
        variant="outline"
        onClick={() => handleClose(false)}
        disabled={saving}
      >
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={!isValid || saving}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        {isEdit ? "Update Rule" : "Create Rule"}
      </Button>
    </>
  );

  // --- Responsive wrapper ---

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Rule" : "Create Rule"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Modify the conditions and actions for this rule."
                : "Define conditions and actions for your automation rule."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-4 px-4 overflow-y-auto max-h-[60vh]">
            {formContent}
          </ScrollArea>
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="sm:max-w-lg flex flex-col"
        showCloseButton={false}
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Rule" : "Create Rule"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modify the conditions and actions for this rule."
              : "Define conditions and actions for your automation rule."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 overflow-y-auto px-4">
          {formContent}
        </ScrollArea>
        <SheetFooter className="flex-row justify-end gap-2">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// --- Condition Row ---

interface ConditionRowProps {
  condition: RuleCondition;
  onChange: (c: RuleCondition) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
  canRemove,
}: ConditionRowProps) {
  function handleTypeChange(type: RuleConditionType | null) {
    if (!type) return;
    const condType = type;
    onChange({
      type: condType,
      operator: defaultOperator(condType),
      value: defaultConditionValue(condType),
    });
  }

  return (
    <div
      className="rounded-lg border bg-muted/30 p-3 space-y-2"
      role="listitem"
    >
      <div className="flex items-center gap-2">
        <Select
          value={condition.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-full" aria-label="Condition type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONDITION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label="Remove condition"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Type-specific value editor */}
      <ConditionValueEditor condition={condition} onChange={onChange} />
    </div>
  );
}

// --- Condition Value Editor ---

function ConditionValueEditor({
  condition,
  onChange,
}: {
  condition: RuleCondition;
  onChange: (c: RuleCondition) => void;
}) {
  const value = condition.value;

  switch (condition.type) {
    case RuleConditionType.CATEGORY: {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Match any of:
          </Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const checked = selected.includes(cat);
              return (
                <label
                  key={cat}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      const updated = next
                        ? [...selected, cat]
                        : selected.filter((c) => c !== cat);
                      onChange({ ...condition, value: updated });
                    }}
                  />
                  <span className="capitalize">{cat}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case RuleConditionType.URGENCY: {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Match any of:
          </Label>
          <div className="flex flex-wrap gap-3">
            {URGENCY_LEVELS.map((level) => {
              const checked = selected.includes(level);
              return (
                <label
                  key={level}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      const updated = next
                        ? [...selected, level]
                        : selected.filter((l) => l !== level);
                      onChange({ ...condition, value: updated });
                    }}
                  />
                  <span className="capitalize">{level}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case RuleConditionType.COST_RANGE: {
      const range = (value as { min: number; max: number }) ?? {
        min: 0,
        max: 500,
      };
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Estimated cost between:
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                value={range.min}
                onChange={(e) =>
                  onChange({
                    ...condition,
                    value: { ...range, min: Number(e.target.value) },
                  })
                }
                className="pl-5"
                aria-label="Minimum cost"
              />
            </div>
            <span className="text-xs text-muted-foreground">to</span>
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                value={range.max}
                onChange={(e) =>
                  onChange({
                    ...condition,
                    value: { ...range, max: Number(e.target.value) },
                  })
                }
                className="pl-5"
                aria-label="Maximum cost"
              />
            </div>
          </div>
        </div>
      );
    }

    case RuleConditionType.PROPERTY_SELECTOR: {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Property IDs (comma-separated):
          </Label>
          <Input
            value={ids.join(", ")}
            onChange={(e) => {
              const updated = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              onChange({ ...condition, value: updated });
            }}
            placeholder="Enter property IDs..."
            aria-label="Property IDs"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to match all properties.
          </p>
        </div>
      );
    }

    case RuleConditionType.VENDOR_AVAILABLE: {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Vendor IDs (comma-separated):
          </Label>
          <Input
            value={ids.join(", ")}
            onChange={(e) => {
              const updated = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              onChange({ ...condition, value: updated });
            }}
            placeholder="Enter vendor IDs..."
            aria-label="Vendor IDs"
          />
        </div>
      );
    }

    default:
      return null;
  }
}

// --- Action Row ---

interface ActionRowProps {
  action: RuleAction;
  onChange: (a: RuleAction) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ActionRow({ action, onChange, onRemove, canRemove }: ActionRowProps) {
  function handleTypeChange(type: RuleActionType | null) {
    if (!type) return;
    const actionType = type;
    const params: RuleActionParams = {};
    // Set default params based on type
    switch (actionType) {
      case RuleActionType.AUTO_APPROVE:
        break;
      case RuleActionType.ASSIGN_VENDOR:
        params.assign_vendor = { vendor_id: "" };
        break;
      case RuleActionType.NOTIFY_LANDLORD:
        params.notify_landlord = {
          method: NotificationMethod.IN_APP,
          recipients: [NotificationRecipient.LANDLORD],
        };
        break;
      case RuleActionType.ESCALATE:
        params.escalate = { priority: "high" };
        break;
    }
    onChange({ type: actionType, params });
  }

  return (
    <div
      className="rounded-lg border bg-muted/30 p-3 space-y-2"
      role="listitem"
    >
      <div className="flex items-center gap-2">
        <Select
          value={action.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-full" aria-label="Action type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label="Remove action"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Type-specific parameter editor */}
      <ActionParamsEditor action={action} onChange={onChange} />
    </div>
  );
}

// --- Action Params Editor ---

function ActionParamsEditor({
  action,
  onChange,
}: {
  action: RuleAction;
  onChange: (a: RuleAction) => void;
}) {
  switch (action.type) {
    case RuleActionType.AUTO_APPROVE:
      return (
        <p className="text-xs text-muted-foreground">
          {ACTION_TYPE_DESCRIPTIONS[RuleActionType.AUTO_APPROVE]}.
          No additional configuration needed.
        </p>
      );

    case RuleActionType.ASSIGN_VENDOR: {
      const vendorId = action.params.assign_vendor?.vendor_id ?? "";
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Vendor ID:</Label>
          <Input
            value={vendorId}
            onChange={(e) =>
              onChange({
                ...action,
                params: {
                  ...action.params,
                  assign_vendor: { vendor_id: e.target.value.trim() },
                },
              })
            }
            placeholder="Enter vendor ID..."
            aria-label="Vendor ID"
          />
        </div>
      );
    }

    case RuleActionType.NOTIFY_LANDLORD: {
      const config = action.params.notify_landlord ?? {
        method: NotificationMethod.IN_APP,
        recipients: [NotificationRecipient.LANDLORD],
      };
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Method:</Label>
            <Select
              value={config.method}
              onValueChange={(method: NotificationMethod | null) => {
                if (!method) return;
                onChange({
                  ...action,
                  params: {
                    ...action.params,
                    notify_landlord: {
                      ...config,
                      method,
                    },
                  },
                });
              }}
            >
              <SelectTrigger className="w-full" aria-label="Notification method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NotificationMethod.IN_APP}>
                  In-app
                </SelectItem>
                <SelectItem value={NotificationMethod.EMAIL}>Email</SelectItem>
                <SelectItem value={NotificationMethod.SMS}>SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Recipients:
            </Label>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  [NotificationRecipient.LANDLORD, "Landlord"],
                  [NotificationRecipient.VENDOR, "Vendor"],
                  [NotificationRecipient.TENANT, "Tenant"],
                ] as const
              ).map(([recipient, label]) => {
                const checked = config.recipients.includes(recipient);
                return (
                  <label
                    key={recipient}
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const updated = next
                          ? [...config.recipients, recipient]
                          : config.recipients.filter((r) => r !== recipient);
                        onChange({
                          ...action,
                          params: {
                            ...action.params,
                            notify_landlord: { ...config, recipients: updated },
                          },
                        });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case RuleActionType.ESCALATE: {
      const priority = action.params.escalate?.priority ?? "high";
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Priority:</Label>
          <Select
            value={priority}
            onValueChange={(p: "high" | "critical" | null) => {
              if (!p) return;
              onChange({
                ...action,
                params: {
                  ...action.params,
                  escalate: {
                    ...action.params.escalate,
                    priority: p,
                  },
                },
              });
            }}
          >
            <SelectTrigger className="w-full" aria-label="Escalation priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    default:
      return null;
  }
}

"use client";

import { useCallback, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  FlaskConical,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RuleConditionType,
  ConditionOperator,
  RuleActionType,
} from "@/lib/types/rules";
import type {
  RuleCondition,
  RuleAction,
  RuleTestRequest,
  RuleTestResponse,
  ConditionResult,
} from "@/lib/types/rules";

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

interface Preset {
  label: string;
  data: RuleTestRequest;
}

const PRESETS: Preset[] = [
  {
    label: "Cheap plumbing",
    data: { category: "plumbing", urgency: "low", cost: 150 },
  },
  {
    label: "Expensive electrical",
    data: { category: "electrical", urgency: "medium", cost: 2500 },
  },
  {
    label: "Emergency HVAC",
    data: { category: "hvac", urgency: "emergency", cost: 1500 },
  },
];

const ACTION_DESCRIPTIONS: Record<RuleActionType, string> = {
  [RuleActionType.AUTO_APPROVE]: "Auto-approve this request",
  [RuleActionType.ASSIGN_VENDOR]: "Assign vendor",
  [RuleActionType.NOTIFY_LANDLORD]: "Send notification",
  [RuleActionType.ESCALATE]: "Escalate to emergency",
};

// --- Props ---

interface RuleTestPanelProps {
  ruleId?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isFormValid: boolean;
}

// --- Client-side evaluation for unsaved rules ---

function evaluateConditionLocally(
  condition: RuleCondition,
  request: RuleTestRequest,
  index: number
): ConditionResult {
  const { type, operator, value } = condition;
  let matched = false;
  let description = "";

  switch (type) {
    case RuleConditionType.CATEGORY: {
      if (request.category === undefined) {
        description = "category not provided in test data";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = request.category === value;
        description = `category "${request.category}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(request.category);
        description = `category "${request.category}" ${matched ? "is" : "is not"} in [${vals.join(", ")}]`;
      }
      break;
    }
    case RuleConditionType.URGENCY: {
      if (request.urgency === undefined) {
        description = "urgency not provided in test data";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = request.urgency === value;
        description = `urgency "${request.urgency}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(request.urgency);
        description = `urgency "${request.urgency}" ${matched ? "is" : "is not"} in [${vals.join(", ")}]`;
      }
      break;
    }
    case RuleConditionType.COST_RANGE: {
      if (request.cost === undefined) {
        description = "cost not provided in test data";
      } else if (operator === ConditionOperator.RANGE) {
        const range = value as { min: number; max: number };
        matched = request.cost >= range.min && request.cost <= range.max;
        description = `cost ${request.cost} ${matched ? "is" : "is not"} in range [$${range.min}, $${range.max}]`;
      }
      break;
    }
    case RuleConditionType.PROPERTY_SELECTOR: {
      if (request.property_id === undefined) {
        description = "property_id not provided in test data";
      } else if (operator === ConditionOperator.EQUALS) {
        matched = request.property_id === value;
        description = `property "${request.property_id}" ${matched ? "matches" : "does not match"} "${value}"`;
      } else if (operator === ConditionOperator.IN) {
        const vals = value as string[];
        matched = vals.includes(request.property_id);
        description = `property "${request.property_id}" ${matched ? "is" : "is not"} in property list`;
      }
      break;
    }
    case RuleConditionType.VENDOR_AVAILABLE: {
      const conditionVendors = value as string[];
      if (!request.vendor_ids || request.vendor_ids.length === 0) {
        description = "vendor_ids not provided in test data";
      } else {
        matched = conditionVendors.some((v) => request.vendor_ids!.includes(v));
        description = `vendor_ids ${matched ? "include" : "do not include"} any required vendor`;
      }
      break;
    }
    default:
      description = `unknown condition type: ${type}`;
  }

  return { condition_index: index, matched, details: { description } };
}

function evaluateLocally(
  conditions: RuleCondition[],
  actions: RuleAction[],
  request: RuleTestRequest
): RuleTestResponse {
  const conditions_breakdown = conditions.map((c, i) =>
    evaluateConditionLocally(c, request, i)
  );
  const matched = conditions_breakdown.every((c) => c.matched);
  return {
    matched,
    conditions_breakdown,
    actions_preview: actions,
  };
}

// --- Helpers ---

function describeAction(action: RuleAction): string {
  switch (action.type) {
    case RuleActionType.AUTO_APPROVE:
      return ACTION_DESCRIPTIONS[RuleActionType.AUTO_APPROVE];
    case RuleActionType.ASSIGN_VENDOR: {
      const vendorId = action.params.assign_vendor?.vendor_id;
      return vendorId
        ? `Assign to vendor ${vendorId.slice(0, 8)}...`
        : ACTION_DESCRIPTIONS[RuleActionType.ASSIGN_VENDOR];
    }
    case RuleActionType.NOTIFY_LANDLORD: {
      const method = action.params.notify_landlord?.method ?? "in_app";
      const recipients =
        action.params.notify_landlord?.recipients?.join(", ") ?? "landlord";
      return `Send ${method.replace("_", "-")} notification to ${recipients}`;
    }
    case RuleActionType.ESCALATE: {
      const priority = action.params.escalate?.priority ?? "high";
      return `Escalate to ${priority} priority`;
    }
    default:
      return "Unknown action";
  }
}

function describeCondition(
  condition: RuleCondition,
  index: number
): string {
  switch (condition.type) {
    case RuleConditionType.CATEGORY: {
      const vals = Array.isArray(condition.value)
        ? (condition.value as string[]).join(", ")
        : String(condition.value);
      return `Category ${condition.operator === ConditionOperator.IN ? "is one of" : "equals"} ${vals}`;
    }
    case RuleConditionType.URGENCY: {
      const vals = Array.isArray(condition.value)
        ? (condition.value as string[]).join(", ")
        : String(condition.value);
      return `Urgency ${condition.operator === ConditionOperator.IN ? "is one of" : "equals"} ${vals}`;
    }
    case RuleConditionType.COST_RANGE: {
      const range = condition.value as { min: number; max: number };
      return `Cost between $${range.min} and $${range.max}`;
    }
    case RuleConditionType.PROPERTY_SELECTOR: {
      const vals = Array.isArray(condition.value)
        ? (condition.value as string[])
        : [String(condition.value)];
      return vals.length > 0
        ? `Property in [${vals.length} selected]`
        : "Any property";
    }
    case RuleConditionType.VENDOR_AVAILABLE: {
      const vals = condition.value as string[];
      return vals.length > 0
        ? `Vendor available (${vals.length} vendors)`
        : "Any vendor";
    }
    default:
      return `Condition #${index + 1}`;
  }
}

// --- Component ---

export function RuleTestPanel({
  ruleId,
  conditions,
  actions,
  isFormValid,
}: RuleTestPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [testRequest, setTestRequest] = useState<RuleTestRequest>({
    category: undefined,
    urgency: undefined,
    cost: undefined,
    property_id: undefined,
  });
  const [testResult, setTestResult] = useState<RuleTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreateMode = !ruleId;

  const applyPreset = useCallback((preset: Preset) => {
    setTestRequest({ ...preset.data });
    setTestResult(null);
    setError(null);
  }, []);

  const runTest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      if (isCreateMode) {
        // Client-side evaluation for unsaved rules
        const result = evaluateLocally(conditions, actions, testRequest);
        setTestResult(result);
      } else {
        // API call for saved rules
        const res = await fetch(`/api/rules/${ruleId}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testRequest),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Test failed (${res.status})`);
        }

        const result: RuleTestResponse = await res.json();
        setTestResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setIsLoading(false);
    }
  }, [isCreateMode, ruleId, conditions, actions, testRequest]);

  const canRunTest =
    isFormValid && conditions.length > 0 && actions.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between py-2 text-sm font-medium hover:opacity-80 cursor-pointer"
        aria-label="Toggle test panel"
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="size-4" />
          Test Rule
        </span>
        {isOpen ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 pt-2">
          {isCreateMode && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              Note: This rule hasn&apos;t been saved yet. Testing uses current
              form values.
            </p>
          )}

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Quick presets
            </Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Request Fields */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Sample request data
            </Label>

            {/* Category */}
            <div className="space-y-1">
              <Label htmlFor="test-category" className="text-xs">
                Category
              </Label>
              <Select
                value={testRequest.category ?? ""}
                onValueChange={(v) =>
                  setTestRequest((prev) => ({
                    ...prev,
                    category: v || undefined,
                  }))
                }
              >
                <SelectTrigger id="test-category" aria-label="Test category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="capitalize">{cat}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div className="space-y-1">
              <Label htmlFor="test-urgency" className="text-xs">
                Urgency
              </Label>
              <Select
                value={testRequest.urgency ?? ""}
                onValueChange={(v) =>
                  setTestRequest((prev) => ({
                    ...prev,
                    urgency: v || undefined,
                  }))
                }
              >
                <SelectTrigger id="test-urgency" aria-label="Test urgency">
                  <SelectValue placeholder="Select urgency..." />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      <span className="capitalize">{level}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost */}
            <div className="space-y-1">
              <Label htmlFor="test-cost" className="text-xs">
                Estimated cost ($)
              </Label>
              <Input
                id="test-cost"
                type="number"
                min={0}
                value={testRequest.cost ?? ""}
                onChange={(e) =>
                  setTestRequest((prev) => ({
                    ...prev,
                    cost: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="0"
                aria-label="Test estimated cost"
              />
            </div>

            {/* Property ID */}
            <div className="space-y-1">
              <Label htmlFor="test-property" className="text-xs">
                Property ID (optional)
              </Label>
              <Input
                id="test-property"
                value={testRequest.property_id ?? ""}
                onChange={(e) =>
                  setTestRequest((prev) => ({
                    ...prev,
                    property_id: e.target.value || undefined,
                  }))
                }
                placeholder="Enter property ID..."
                aria-label="Test property ID"
              />
            </div>
          </div>

          {/* Run Test Button */}
          <Button
            type="button"
            onClick={runTest}
            disabled={!canRunTest || isLoading}
            className="w-full"
            aria-label="Run test"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FlaskConical className="size-4" />
            )}
            {isLoading ? "Running..." : "Run Test"}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm text-destructive">Test failed: {error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runTest}
                disabled={isLoading}
              >
                <RefreshCw className="size-3.5" />
                Try again
              </Button>
            </div>
          )}

          {/* Results Display */}
          {testResult && <TestResults result={testResult} conditions={conditions} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// --- Results Component ---

function TestResults({
  result,
  conditions,
}: {
  result: RuleTestResponse;
  conditions: RuleCondition[];
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      {/* Overall Result */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Result:</span>
        {result.matched ? (
          <Badge className="bg-green-600 text-white hover:bg-green-600">
            <Check className="size-3" />
            MATCHED
          </Badge>
        ) : (
          <Badge variant="secondary">
            <X className="size-3" />
            NOT MATCHED
          </Badge>
        )}
      </div>

      {/* Conditions Breakdown */}
      {result.conditions_breakdown.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Conditions
          </h4>
          <div className="space-y-1.5">
            {result.conditions_breakdown.map((cr, idx) => {
              const condition = conditions[cr.condition_index];
              const desc = condition
                ? describeCondition(condition, cr.condition_index)
                : `Condition #${cr.condition_index + 1}`;
              const detail =
                (cr.details as { description?: string })?.description ?? "";

              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs"
                >
                  {cr.matched ? (
                    <Check className="size-3.5 mt-0.5 shrink-0 text-green-600" />
                  ) : (
                    <X className="size-3.5 mt-0.5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{desc}</p>
                    {detail && (
                      <p className="text-muted-foreground">{detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions Preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Actions that will execute:
        </h4>
        {result.matched && result.actions_preview.length > 0 ? (
          <ul className="space-y-1" aria-label="Actions preview">
            {result.actions_preview.map((action, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs">
                <span className="size-1.5 rounded-full bg-primary shrink-0" />
                {describeAction(action)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {result.matched
              ? "No actions configured"
              : "Rule did not match — no actions will execute"}
          </p>
        )}
      </div>
    </div>
  );
}

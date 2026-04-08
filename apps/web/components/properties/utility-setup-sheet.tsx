"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  Info,
  Loader2,
  RefreshCw,
  Trash2,
  Wifi,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  PropertyUtility,
  UtilityType,
  ConfirmationStatus,
  AiConfidence,
  UtilitySuggestion,
} from "@/lib/types";

interface UtilitySetupSheetProps {
  propertyId: string;
  address: string;
  existingUtilities: PropertyUtility[];
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const UTILITY_CONFIG: Record<
  UtilityType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  electric: { label: "Electric", icon: Zap },
  gas: { label: "Gas", icon: Flame },
  water_sewer: { label: "Water / Sewer", icon: Droplets },
  trash_recycling: { label: "Trash / Recycling", icon: Trash2 },
  internet_cable: { label: "Internet / Cable", icon: Wifi },
  hoa: { label: "HOA", icon: Building2 },
};

const UTILITY_ORDER: UtilityType[] = [
  "electric",
  "gas",
  "water_sewer",
  "trash_recycling",
  "internet_cable",
  "hoa",
];

// Only these types get AI suggestions
const AI_SUGGESTED_TYPES: UtilityType[] = [
  "electric",
  "gas",
  "water_sewer",
  "trash_recycling",
];

interface UtilityFormRow {
  utility_type: UtilityType;
  provider_name: string;
  provider_phone: string;
  provider_website: string;
  account_number: string;
  confirmation_status: ConfirmationStatus;
  ai_confidence: AiConfidence | null;
  notes: string;
  // Track if the row was touched by the user (to detect edits)
  dirty: boolean;
}

function buildEmptyRow(type: UtilityType): UtilityFormRow {
  return {
    utility_type: type,
    provider_name: "",
    provider_phone: "",
    provider_website: "",
    account_number: "",
    confirmation_status: "ai_suggested",
    ai_confidence: null,
    notes: "",
    dirty: false,
  };
}

function buildRowFromExisting(u: PropertyUtility): UtilityFormRow {
  return {
    utility_type: u.utility_type,
    provider_name: u.provider_name ?? "",
    provider_phone: u.provider_phone ?? "",
    provider_website: u.provider_website ?? "",
    account_number: u.account_number ?? "",
    confirmation_status: u.confirmation_status,
    ai_confidence: u.ai_confidence,
    notes: u.notes ?? "",
    dirty: false,
  };
}

function ConfidenceBadge({ confidence }: { confidence: AiConfidence }) {
  const config = {
    high: {
      dotClass: "bg-green-500",
      text: "High confidence — common provider for this area",
    },
    medium: {
      dotClass: "bg-amber-500",
      text: "Medium confidence — please verify",
    },
    low: {
      dotClass: "bg-red-500",
      text: "Low confidence — we recommend checking with the local government",
    },
  };
  const c = config[confidence];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <span className={`size-2 rounded-full ${c.dotClass}`} />
          <Info className="size-3" />
        </TooltipTrigger>
        <TooltipContent>{c.text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UtilityTypeSection({
  row,
  onChange,
  loading,
}: {
  row: UtilityFormRow;
  onChange: (updates: Partial<UtilityFormRow>) => void;
  loading: boolean;
}) {
  const [showAccount, setShowAccount] = useState(false);
  const config = UTILITY_CONFIG[row.utility_type];
  const Icon = config.icon;
  const isNA = row.confirmation_status === "not_applicable";

  function handleFieldChange(field: keyof UtilityFormRow, value: string) {
    onChange({ [field]: value, dirty: true });
  }

  function handleNAToggle(checked: boolean) {
    onChange({
      confirmation_status: checked ? "not_applicable" : "ai_suggested",
      dirty: true,
    });
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{config.label}</span>
          {row.ai_confidence && !isNA && (
            <ConfidenceBadge confidence={row.ai_confidence} />
          )}
          {row.confirmation_status === "ai_suggested" && !isNA && (
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] px-1.5 py-0"
            >
              AI
            </Badge>
          )}
          {row.confirmation_status === "confirmed" && (
            <Badge className="bg-green-600 hover:bg-green-600 text-[10px] px-1.5 py-0">
              Confirmed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`na-${row.utility_type}`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            N/A
          </Label>
          <Switch
            id={`na-${row.utility_type}`}
            size="sm"
            checked={isNA}
            onCheckedChange={handleNAToggle}
          />
        </div>
      </div>

      {/* Form fields — collapsed when N/A or loading */}
      {loading ? (
        <div className="space-y-2 pl-6">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ) : !isNA ? (
        <div className="space-y-2 pl-6">
          <div>
            <Label
              htmlFor={`name-${row.utility_type}`}
              className="text-xs text-muted-foreground mb-1"
            >
              Company name
            </Label>
            <Input
              id={`name-${row.utility_type}`}
              value={row.provider_name}
              onChange={(e) =>
                handleFieldChange("provider_name", e.target.value)
              }
              placeholder="e.g. ComEd"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label
                htmlFor={`phone-${row.utility_type}`}
                className="text-xs text-muted-foreground mb-1"
              >
                Phone
              </Label>
              <Input
                id={`phone-${row.utility_type}`}
                value={row.provider_phone}
                onChange={(e) =>
                  handleFieldChange("provider_phone", e.target.value)
                }
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label
                htmlFor={`website-${row.utility_type}`}
                className="text-xs text-muted-foreground mb-1"
              >
                Website
              </Label>
              <Input
                id={`website-${row.utility_type}`}
                value={row.provider_website}
                onChange={(e) =>
                  handleFieldChange("provider_website", e.target.value)
                }
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <Label
              htmlFor={`account-${row.utility_type}`}
              className="text-xs text-muted-foreground mb-1"
            >
              Account number
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`account-${row.utility_type}`}
                type={showAccount ? "text" : "password"}
                value={row.account_number}
                onChange={(e) =>
                  handleFieldChange("account_number", e.target.value)
                }
                placeholder="Optional"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowAccount(!showAccount)}
                aria-label={
                  showAccount ? "Hide account number" : "Show account number"
                }
              >
                {showAccount ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pl-6 italic">
          Marked as not applicable
        </p>
      )}
    </div>
  );
}

export function UtilitySetupSheet({
  propertyId,
  address,
  existingUtilities,
  open,
  onClose,
  onSave,
}: UtilitySetupSheetProps) {
  const [rows, setRows] = useState<UtilityFormRow[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);

  // Initialize rows when sheet opens
  const initializeRows = useCallback(() => {
    const existingByType = new Map(
      existingUtilities.map((u) => [u.utility_type, u])
    );
    const newRows = UTILITY_ORDER.map((type) => {
      const existing = existingByType.get(type);
      return existing ? buildRowFromExisting(existing) : buildEmptyRow(type);
    });
    setRows(newRows);
  }, [existingUtilities]);

  useEffect(() => {
    if (open) {
      initializeRows();
      initializedRef.current = true;
    } else {
      initializedRef.current = false;
    }
  }, [open, initializeRows]);

  // Auto-fetch suggestions when opening with no existing data
  useEffect(() => {
    if (
      open &&
      initializedRef.current &&
      existingUtilities.length === 0 &&
      address
    ) {
      fetchSuggestions();
    }
    // Only run once when sheet opens with no data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchSuggestions() {
    setSuggestLoading(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/utilities/suggest`,
        { method: "POST" }
      );
      const data = await res.json();

      if (data.suggestions) {
        applySuggestions(data.suggestions);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to fetch utility suggestions");
    } finally {
      setSuggestLoading(false);
    }
  }

  function applySuggestions(suggestions: UtilitySuggestion[]) {
    setRows((prev) =>
      prev.map((row) => {
        // Only apply suggestions to AI-suggestable types
        if (!AI_SUGGESTED_TYPES.includes(row.utility_type)) return row;

        // Re-detect: only overwrite ai_suggested rows, not confirmed/N/A
        if (
          row.confirmation_status !== "ai_suggested" &&
          row.confirmation_status !== "not_applicable" &&
          row.dirty
        ) {
          return row;
        }

        // If already confirmed, don't overwrite
        if (row.confirmation_status === "confirmed") return row;
        if (row.confirmation_status === "not_applicable") return row;

        const suggestion = suggestions.find(
          (s) => s.utility_type === row.utility_type
        );
        if (!suggestion) return row;

        return {
          ...row,
          provider_name: suggestion.provider_name ?? "",
          provider_phone: suggestion.provider_phone ?? "",
          provider_website: suggestion.provider_website ?? "",
          confirmation_status: "ai_suggested" as ConfirmationStatus,
          ai_confidence: suggestion.confidence,
          dirty: false,
        };
      })
    );
  }

  function handleRowChange(
    type: UtilityType,
    updates: Partial<UtilityFormRow>
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.utility_type !== type) return row;
        const updated = { ...row, ...updates };
        // If user edited a field on an ai_suggested row, mark confirmed
        if (
          updates.dirty &&
          row.confirmation_status === "ai_suggested" &&
          updates.confirmation_status === undefined
        ) {
          updated.confirmation_status = "confirmed";
        }
        return updated;
      })
    );
  }

  function handleConfirmAll() {
    setRows((prev) =>
      prev.map((row) => {
        if (row.confirmation_status === "ai_suggested") {
          return { ...row, confirmation_status: "confirmed" as ConfirmationStatus, dirty: true };
        }
        return row;
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        utilities: rows.map((row) => ({
          utility_type: row.utility_type,
          provider_name: row.provider_name || null,
          provider_phone: row.provider_phone || null,
          provider_website: row.provider_website || null,
          account_number: row.account_number || null,
          confirmation_status: row.confirmation_status,
          notes: row.notes || null,
        })),
      };

      const res = await fetch(`/api/properties/${propertyId}/utilities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Utilities saved");
        onSave();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save utilities");
      }
    } catch {
      toast.error("Failed to save utilities");
    } finally {
      setSaving(false);
    }
  }

  const hasAiSuggested = rows.some(
    (r) => r.confirmation_status === "ai_suggested"
  );
  const hasExistingData = existingUtilities.length > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-lg flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Utility Providers</SheetTitle>
          <SheetDescription>
            {address
              ? `Providers for ${address}. Confirm or edit.`
              : "Add utility provider information."}
          </SheetDescription>
          <div className="flex items-center gap-2 pt-1">
            {hasAiSuggested && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-8"
                onClick={handleConfirmAll}
              >
                Confirm All
              </Button>
            )}
            {hasExistingData && (
              <Button
                size="sm"
                variant="ghost"
                className="min-h-8 text-muted-foreground"
                onClick={fetchSuggestions}
                disabled={suggestLoading || !address}
              >
                {suggestLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Re-Detect
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1">
            {rows.map((row, index) => (
              <div key={row.utility_type}>
                <UtilityTypeSection
                  row={row}
                  onChange={(updates) =>
                    handleRowChange(row.utility_type, updates)
                  }
                  loading={
                    suggestLoading &&
                    AI_SUGGESTED_TYPES.includes(row.utility_type)
                  }
                />
                {index < rows.length - 1 && <Separator className="my-3" />}
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="border-t">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 min-h-9"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 min-h-9"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

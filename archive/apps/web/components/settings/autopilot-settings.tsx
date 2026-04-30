"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Gauge,
  DollarSign,
  Grid3X3,
  Users,
  Receipt,
  Siren,
  Clock,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AutonomySettings } from "@/lib/types/autonomy";

const ALL_CATEGORIES = [
  "plumbing",
  "electrical",
  "hvac",
  "structural",
  "pest",
  "appliance",
  "general",
] as const;

type FieldErrors = {
  confidence_threshold?: string;
  per_decision_cap?: string;
  monthly_cap?: string;
  rollback_window_hours?: string;
};

export function AutopilotSettings() {
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Settings state
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [perDecisionCap, setPerDecisionCap] = useState(500);
  const [monthlyCap, setMonthlyCap] = useState(5000);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [preferredVendorsOnly, setPreferredVendorsOnly] = useState(false);
  const [requireCostEstimate, setRequireCostEstimate] = useState(true);
  const [emergencyAutoDispatch, setEmergencyAutoDispatch] = useState(true);
  const [rollbackWindowHours, setRollbackWindowHours] = useState(24);
  const [paused, setPaused] = useState(true);

  // Track whether user has ever changed a setting (for first-enable dialog)
  const initialPausedRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/autonomy/settings");
      if (!res.ok) throw new Error("Failed to fetch");
      const { settings } = (await res.json()) as { settings: AutonomySettings };
      setConfidenceThreshold(settings.confidence_threshold);
      setPerDecisionCap(settings.per_decision_cap);
      setMonthlyCap(settings.monthly_cap);
      setExcludedCategories(settings.excluded_categories);
      setPreferredVendorsOnly(settings.preferred_vendors_only);
      setRequireCostEstimate(settings.require_cost_estimate);
      setEmergencyAutoDispatch(settings.emergency_auto_dispatch);
      setRollbackWindowHours(settings.rollback_window_hours);
      setPaused(settings.paused);
      initialPausedRef.current = settings.paused;
      hasLoadedRef.current = true;
    } catch {
      toast.error("Failed to load autopilot settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  function validate(updates: Partial<AutonomySettings>): FieldErrors {
    const newErrors: FieldErrors = {};
    const ct =
      updates.confidence_threshold !== undefined
        ? updates.confidence_threshold
        : confidenceThreshold;
    const pdc =
      updates.per_decision_cap !== undefined
        ? updates.per_decision_cap
        : perDecisionCap;
    const mc =
      updates.monthly_cap !== undefined ? updates.monthly_cap : monthlyCap;
    const rwh =
      updates.rollback_window_hours !== undefined
        ? updates.rollback_window_hours
        : rollbackWindowHours;

    if (ct < 0 || ct > 1) newErrors.confidence_threshold = "Must be 0–100%";
    if (pdc <= 0) newErrors.per_decision_cap = "Must be greater than 0";
    if (mc <= 0) newErrors.monthly_cap = "Must be greater than 0";
    if (rwh < 0 || rwh > 72)
      newErrors.rollback_window_hours = "Must be 0–72 hours";

    return newErrors;
  }

  function saveSettings(updates: Partial<AutonomySettings>) {
    const validationErrors = validate(updates);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Check for first-enable dialog
    if (initialPausedRef.current && hasLoadedRef.current) {
      setShowEnableDialog(true);
      return;
    }

    debouncedPut(updates);
  }

  function debouncedPut(updates: Partial<AutonomySettings>) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch("/api/autonomy/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("Failed to save");
        setSaveState("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
        toast.error("Failed to save settings. Please try again.");
      }
    }, 300);
  }

  function handleConfidenceChange(value: number | readonly number[]) {
    const v = typeof value === "number" ? value : value[0];
    setConfidenceThreshold(v);
    saveSettings({ confidence_threshold: v });
  }

  function handlePerDecisionCapChange(rawValue: string) {
    const v = Number(rawValue);
    if (Number.isNaN(v)) return;
    setPerDecisionCap(v);
    saveSettings({ per_decision_cap: v });
  }

  function handleMonthlyCapChange(rawValue: string) {
    const v = Number(rawValue);
    if (Number.isNaN(v)) return;
    setMonthlyCap(v);
    saveSettings({ monthly_cap: v });
  }

  function handleCategoryToggle(category: string, checked: boolean) {
    const updated = checked
      ? [...excludedCategories, category]
      : excludedCategories.filter((c) => c !== category);
    setExcludedCategories(updated);
    saveSettings({ excluded_categories: updated });
  }

  function handlePreferredVendorsToggle(checked: boolean) {
    setPreferredVendorsOnly(checked);
    saveSettings({ preferred_vendors_only: checked });
  }

  function handleCostEstimateToggle(checked: boolean) {
    setRequireCostEstimate(checked);
    saveSettings({ require_cost_estimate: checked });
  }

  function handleEmergencyToggle(checked: boolean) {
    setEmergencyAutoDispatch(checked);
    saveSettings({ emergency_auto_dispatch: checked });
  }

  function handleRollbackChange(rawValue: string) {
    const v = Number(rawValue);
    if (Number.isNaN(v)) return;
    setRollbackWindowHours(v);
    saveSettings({ rollback_window_hours: v });
  }

  function handleEnableConfirm() {
    initialPausedRef.current = false;
    setPaused(false);
    setShowEnableDialog(false);
    // Save paused=false along with current state
    debouncedPut({
      confidence_threshold: confidenceThreshold,
      per_decision_cap: perDecisionCap,
      monthly_cap: monthlyCap,
      excluded_categories: excludedCategories,
      preferred_vendors_only: preferredVendorsOnly,
      require_cost_estimate: requireCostEstimate,
      emergency_auto_dispatch: emergencyAutoDispatch,
      rollback_window_hours: rollbackWindowHours,
      paused: false,
    });
  }

  function handleEnableCancel() {
    setShowEnableDialog(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Save indicator */}
      {saveState !== "idle" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saveState === "saving" && (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="size-4 text-green-600" />
              <span className="text-green-600">Saved</span>
            </>
          )}
        </div>
      )}

      {/* Confidence Threshold */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-5" />
            Confidence Threshold
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              AI must be this confident to auto-dispatch
            </span>
            <span className="font-semibold text-base">
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>
          <Slider
            value={[confidenceThreshold]}
            onValueChange={handleConfidenceChange}
            min={0}
            max={1}
            step={0.05}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher = safer but less autonomous.
          </p>
          {errors.confidence_threshold && (
            <p className="text-xs text-destructive">
              {errors.confidence_threshold}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Spending Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Spending Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Prevents overspending on individual decisions or monthly total.
          </p>
          <div className="space-y-2">
            <Label htmlFor="per-decision-cap">Per-decision cap ($)</Label>
            <Input
              id="per-decision-cap"
              type="number"
              min={1}
              step={10}
              value={perDecisionCap}
              onChange={(e) => handlePerDecisionCapChange(e.target.value)}
            />
            {errors.per_decision_cap && (
              <p className="text-xs text-destructive">
                {errors.per_decision_cap}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly-cap">Monthly cap ($)</Label>
            <Input
              id="monthly-cap"
              type="number"
              min={1}
              step={100}
              value={monthlyCap}
              onChange={(e) => handleMonthlyCapChange(e.target.value)}
            />
            {errors.monthly_cap && (
              <p className="text-xs text-destructive">{errors.monthly_cap}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="size-5" />
            Category Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Exclude these categories from autopilot (require manual review).
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ALL_CATEGORIES.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={excludedCategories.includes(cat)}
                  onCheckedChange={(next) =>
                    handleCategoryToggle(cat, next as boolean)
                  }
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Vendor Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Preferred vendors only</div>
              <div className="text-xs text-muted-foreground">
                AI only uses your preferred vendors list.
              </div>
            </div>
            <Switch
              checked={preferredVendorsOnly}
              onCheckedChange={handlePreferredVendorsToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            Cost Estimates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">
                Require cost estimate before dispatch
              </div>
              <div className="text-xs text-muted-foreground">
                AI waits for vendor quote before deciding.
              </div>
            </div>
            <Switch
              checked={requireCostEstimate}
              onCheckedChange={handleCostEstimateToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Handling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Siren className="size-5" />
            Emergency Handling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">
                Auto-dispatch emergencies
              </div>
              <div className="text-xs text-muted-foreground">
                Emergency requests auto-dispatch even with lower confidence.
              </div>
            </div>
            <Switch
              checked={emergencyAutoDispatch}
              onCheckedChange={handleEmergencyToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rollback Window */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Rollback Window
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Time window to cancel a dispatch after auto-dispatch.
          </p>
          <div className="space-y-2">
            <Label htmlFor="rollback-hours">Hours (0–72)</Label>
            <Input
              id="rollback-hours"
              type="number"
              min={0}
              max={72}
              step={1}
              value={rollbackWindowHours}
              onChange={(e) => handleRollbackChange(e.target.value)}
            />
            {errors.rollback_window_hours && (
              <p className="text-xs text-destructive">
                {errors.rollback_window_hours}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* First-enable confirmation dialog */}
      <AlertDialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Autopilot?</AlertDialogTitle>
            <AlertDialogDescription>
              Autopilot is currently disabled. Saving settings will enable it.
              The AI will begin making autonomous decisions based on your
              configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleEnableCancel}>
              Keep Disabled
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleEnableConfirm}>
              Enable Autopilot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

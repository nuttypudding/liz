"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarIcon,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { Property } from "@/lib/types";

// ── Types ──────────────────────────────────────────────

type NoticeType = "entry" | "lease_violation" | "rent_increase" | "eviction";

interface PropertyWithJurisdiction extends Property {
  jurisdiction?: { state_code: string; city: string | null } | null;
}

interface NoticeContext {
  tenant_name: string;
  // Entry
  entry_purpose?: string;
  proposed_date?: Date;
  // Lease violation
  violation_type?: string;
  violation_description?: string;
  // Rent increase
  current_rent?: string;
  new_rent?: string;
  effective_date?: Date;
  reason?: string;
  // Eviction
  eviction_reason?: string;
  eviction_details?: string;
  cure_deadline?: Date;
  // Shared
  additional_details?: string;
}

interface GeneratedNotice {
  id: string | null;
  content: string;
  statutory_citations: string[];
  notice_period_days: number;
  effective_date: string | null;
  generated_at: string;
}

interface SentNotice {
  id: string;
  sent_at: string;
  delivery_method: string;
}

const STEPS = [
  "Select Property",
  "Notice Type",
  "Notice Details",
  "Preview Notice",
  "Send Notice",
] as const;

const NOTICE_TYPES: {
  value: NoticeType;
  label: string;
  description: string;
}[] = [
  {
    value: "entry",
    label: "Entry Notice",
    description: "Notify tenant of planned landlord entry to the unit",
  },
  {
    value: "lease_violation",
    label: "Lease Violation",
    description: "Notify tenant of a violation of lease terms",
  },
  {
    value: "rent_increase",
    label: "Rent Increase",
    description: "Notify tenant of an upcoming rent increase",
  },
  {
    value: "eviction",
    label: "Eviction Notice",
    description: "Begin eviction proceedings against a tenant",
  },
];

// ── Component ──────────────────────────────────────────

export default function NoticeCreatePage() {
  const router = useRouter();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Property
  const [properties, setProperties] = useState<PropertyWithJurisdiction[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyWithJurisdiction | null>(null);

  // Step 2: Notice type
  const [noticeType, setNoticeType] = useState<NoticeType | null>(null);

  // Step 3: Context
  const [context, setContext] = useState<NoticeContext>({ tenant_name: "" });
  const [contextErrors, setContextErrors] = useState<Record<string, string>>(
    {}
  );

  // Step 4: Preview
  const [generatedNotice, setGeneratedNotice] =
    useState<GeneratedNotice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Step 5: Send
  const [deliveryMethod, setDeliveryMethod] = useState("email");
  const [legalReviewChecked, setLegalReviewChecked] = useState(false);
  const [sending, setSending] = useState(false);

  // Success
  const [sentNotice, setSentNotice] = useState<SentNotice | null>(null);

  // ── Data fetching ──

  const fetchProperties = useCallback(async () => {
    setPropertiesLoading(true);
    try {
      const res = await fetch("/api/properties");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const props: Property[] = data.properties ?? [];

      // Fetch jurisdictions for each property
      const withJurisdictions = await Promise.all(
        props.map(async (p) => {
          try {
            const alertRes = await fetch(`/api/compliance/alerts/${p.id}`);
            if (alertRes.ok) {
              const alertData = await alertRes.json();
              return {
                ...p,
                jurisdiction: alertData.jurisdiction,
              } as PropertyWithJurisdiction;
            }
          } catch {
            // ignore
          }
          return { ...p, jurisdiction: null } as PropertyWithJurisdiction;
        })
      );

      setProperties(withJurisdictions);
    } catch {
      toast.error("Failed to load properties");
    } finally {
      setPropertiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // ── Validation helpers ──

  const validateContext = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!context.tenant_name.trim()) {
      errors.tenant_name = "Tenant name is required";
    }

    if (noticeType === "entry") {
      if (!context.entry_purpose) {
        errors.entry_purpose = "Purpose of entry is required";
      }
      if (!context.proposed_date) {
        errors.proposed_date = "Proposed entry date is required";
      }
    }

    if (noticeType === "lease_violation") {
      if (!context.violation_description?.trim()) {
        errors.violation_description = "Violation description is required";
      }
      if (!context.violation_type) {
        errors.violation_type = "Type of violation is required";
      }
    }

    if (noticeType === "rent_increase") {
      if (!context.current_rent?.trim()) {
        errors.current_rent = "Current rent amount is required";
      }
      if (!context.new_rent?.trim()) {
        errors.new_rent = "New rent amount is required";
      }
      if (!context.effective_date) {
        errors.effective_date = "Effective date is required";
      }
    }

    if (noticeType === "eviction") {
      if (!context.eviction_reason) {
        errors.eviction_reason = "Reason for eviction is required";
      }
      if (!context.eviction_details?.trim()) {
        errors.eviction_details = "Issue details are required";
      }
    }

    setContextErrors(errors);
    return Object.keys(errors).length === 0;
  }, [context, noticeType]);

  // ── Build API context ──

  const buildApiContext = useCallback(() => {
    const base: Record<string, string | undefined> = {
      tenant_name: context.tenant_name,
    };

    if (noticeType === "entry") {
      base.issue_description = `Purpose: ${context.entry_purpose}`;
      base.proposed_date = context.proposed_date
        ? format(context.proposed_date, "yyyy-MM-dd")
        : undefined;
      if (context.additional_details) {
        base.additional_details = context.additional_details;
      }
    }

    if (noticeType === "lease_violation") {
      base.issue_description = `${context.violation_type}: ${context.violation_description}`;
      if (context.additional_details) {
        base.additional_details = context.additional_details;
      }
    }

    if (noticeType === "rent_increase") {
      base.issue_description = `Rent increase from $${context.current_rent} to $${context.new_rent}`;
      base.rent_increase_amount = context.new_rent;
      base.effective_date = context.effective_date
        ? format(context.effective_date, "yyyy-MM-dd")
        : undefined;
      if (context.reason) {
        base.additional_details = context.reason;
      }
    }

    if (noticeType === "eviction") {
      base.issue_description = `${context.eviction_reason}: ${context.eviction_details}`;
      base.effective_date = context.cure_deadline
        ? format(context.cure_deadline, "yyyy-MM-dd")
        : undefined;
    }

    return base;
  }, [context, noticeType]);

  // ── Generate notice ──

  const handleGenerate = useCallback(async () => {
    if (!selectedProperty || !noticeType) return;

    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/compliance/notices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: selectedProperty.id,
          notice_type: noticeType,
          context: buildApiContext(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate notice"
        );
      }

      const data = await res.json();
      setGeneratedNotice({
        id: data.id,
        content: data.content,
        statutory_citations: data.statutory_citations ?? [],
        notice_period_days: data.notice_period_days ?? 0,
        effective_date: data.effective_date,
        generated_at: data.generated_at,
      });
      setCurrentStep(3);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate notice"
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedProperty, noticeType, buildApiContext]);

  // ── Send notice ──

  const handleSend = useCallback(async () => {
    if (!generatedNotice?.id) {
      toast.error("Notice ID not available. Please regenerate the notice.");
      return;
    }

    setSending(true);

    try {
      const res = await fetch(
        `/api/compliance/notices/${generatedNotice.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delivery_method: deliveryMethod }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send notice");
      }

      const data = await res.json();
      setSentNotice({
        id: data.id,
        sent_at: data.sent_at,
        delivery_method: data.delivery_method,
      });
      toast.success("Notice sent successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send notice"
      );
    } finally {
      setSending(false);
    }
  }, [generatedNotice, deliveryMethod]);

  // ── Navigation ──

  const handleNext = useCallback(() => {
    if (currentStep === 2) {
      if (!validateContext()) return;
      handleGenerate();
      return; // handleGenerate sets step on success
    }
    setCurrentStep((s) => Math.min(s + 1, 4));
  }, [currentStep, validateContext, handleGenerate]);

  const handleBack = useCallback(() => {
    if (currentStep === 3) {
      // Going back from preview clears generated notice
      setGeneratedNotice(null);
      setGenerateError(null);
    }
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, [currentStep]);

  // ── Step validation ──

  const canProceed = useMemo(() => {
    if (currentStep === 0) return selectedProperty !== null;
    if (currentStep === 1) return noticeType !== null;
    if (currentStep === 2) return true; // validated on submit
    if (currentStep === 3) return generatedNotice !== null;
    return false;
  }, [currentStep, selectedProperty, noticeType, generatedNotice]);

  const progressPercent = sentNotice
    ? 100
    : ((currentStep + 1) / STEPS.length) * 100;

  const noticeTypeLabel =
    NOTICE_TYPES.find((t) => t.value === noticeType)?.label ?? "";

  // ── Success state ──

  if (sentNotice) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
              <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">Notice Sent Successfully</h2>
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>
                Sent on{" "}
                {new Date(sentNotice.sent_at).toLocaleString()}
              </p>
              <p>
                Delivery method:{" "}
                <span className="capitalize">{sentNotice.delivery_method}</span>
              </p>
            </div>
            <Separator className="my-2" />
            <DisclaimerBanner
              type="warning"
              text={COMPLIANCE_DISCLAIMERS.REVIEW_BEFORE_SEND}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/compliance/${selectedProperty?.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <ArrowLeft className="mr-2 size-4" />
                View Audit Log
              </Link>
              <Button
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedProperty(null);
                  setNoticeType(null);
                  setContext({ tenant_name: "" });
                  setContextErrors({});
                  setGeneratedNotice(null);
                  setGenerateError(null);
                  setDeliveryMethod("email");
                  setLegalReviewChecked(false);
                  setSentNotice(null);
                }}
              >
                <Plus className="mr-2 size-4" />
                Create Another Notice
              </Button>
              <Link
                href="/compliance"
                className={buttonVariants({ variant: "outline" })}
              >
                Back to Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/compliance")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Compliance
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Notice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a legally-templated notice for your property
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {currentStep + 1} of {STEPS.length}:{" "}
            {STEPS[currentStep]}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep]}</CardTitle>
          {currentStep > 0 && selectedProperty && (
            <CardDescription className="flex items-center gap-2">
              <Building2 className="size-3.5" />
              {selectedProperty.name}
              {noticeType && currentStep > 1 && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <FileText className="size-3.5" />
                  {noticeTypeLabel}
                </>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <DisclaimerBanner
            type="warning"
            text={COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE}
            dismissable
          />

          {/* Step 1: Select Property */}
          {currentStep === 0 && (
            <StepSelectProperty
              properties={properties}
              loading={propertiesLoading}
              selected={selectedProperty}
              onSelect={(p) => {
                setSelectedProperty(p);
                if (p.jurisdiction) {
                  setCurrentStep(1);
                }
              }}
            />
          )}

          {/* Step 2: Notice Type */}
          {currentStep === 1 && (
            <StepNoticeType
              value={noticeType}
              onChange={setNoticeType}
            />
          )}

          {/* Step 3: Context */}
          {currentStep === 2 && noticeType && (
            <StepContext
              noticeType={noticeType}
              context={context}
              errors={contextErrors}
              onChange={setContext}
            />
          )}

          {/* Step 4: Preview */}
          {currentStep === 3 && (
            <StepPreview
              notice={generatedNotice}
              generating={generating}
              error={generateError}
              onRetry={handleGenerate}
              jurisdiction={selectedProperty?.jurisdiction}
            />
          )}

          {/* Step 5: Send */}
          {currentStep === 4 && generatedNotice && (
            <StepSend
              notice={generatedNotice}
              deliveryMethod={deliveryMethod}
              onDeliveryMethodChange={setDeliveryMethod}
              legalReviewChecked={legalReviewChecked}
              onLegalReviewChange={setLegalReviewChecked}
              sending={sending}
              onSend={handleSend}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep < 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={
              currentStep === 0
                ? () => router.push("/compliance")
                : handleBack
            }
            disabled={generating}
          >
            <ArrowLeft className="mr-2 size-4" />
            {currentStep === 0 ? "Cancel" : "Back"}
          </Button>

          {currentStep < 3 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : currentStep === 2 ? (
                <>
                  Generate
                  <ArrowRight className="ml-2 size-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          )}

          {currentStep === 3 && generatedNotice && (
            <Button onClick={() => setCurrentStep(4)}>
              Send Notice
              <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 1: Select Property ──────────────────────────

function StepSelectProperty({
  properties,
  loading,
  selected,
  onSelect,
}: {
  properties: PropertyWithJurisdiction[];
  loading: boolean;
  selected: PropertyWithJurisdiction | null;
  onSelect: (p: PropertyWithJurisdiction) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Building2 className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No properties found. Add a property first.
        </p>
        <Link
          href="/properties"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Add Property
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {properties.map((p) => {
        const hasJurisdiction = !!p.jurisdiction;
        const isSelected = selected?.id === p.id;

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => hasJurisdiction && onSelect(p)}
            disabled={!hasJurisdiction}
            className={`rounded-lg border p-4 text-left transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : hasJurisdiction
                  ? "hover:border-primary/50 hover:bg-accent/50"
                  : "cursor-not-allowed opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.address_line1}, {p.city}, {p.state}
                </p>
              </div>
              {hasJurisdiction ? (
                <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                  <MapPin className="size-3" />
                  {p.jurisdiction!.state_code}
                  {p.jurisdiction!.city
                    ? ` / ${p.jurisdiction!.city}`
                    : ""}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 text-xs text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="size-3" />
                  No jurisdiction
                </Badge>
              )}
            </div>
            {!hasJurisdiction && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Configure jurisdiction before creating notices
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Step 2: Notice Type ──────────────────────────────

function StepNoticeType({
  value,
  onChange,
}: {
  value: NoticeType | null;
  onChange: (v: NoticeType) => void;
}) {
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(v) => onChange(v as NoticeType)}
      className="gap-3"
    >
      {NOTICE_TYPES.map((type) => (
        <label
          key={type.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            value === type.value
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "hover:border-primary/50 hover:bg-accent/50"
          }`}
        >
          <RadioGroupItem value={type.value} className="mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{type.label}</p>
            <p className="text-xs text-muted-foreground">
              {type.description}
            </p>
          </div>
        </label>
      ))}
    </RadioGroup>
  );
}

// ── Step 3: Context Form ─────────────────────────────

function StepContext({
  noticeType,
  context,
  errors,
  onChange,
}: {
  noticeType: NoticeType;
  context: NoticeContext;
  errors: Record<string, string>;
  onChange: (ctx: NoticeContext) => void;
}) {
  const update = (patch: Partial<NoticeContext>) =>
    onChange({ ...context, ...patch });

  return (
    <div className="space-y-4">
      {/* Shared: Tenant name */}
      <div className="space-y-1.5">
        <Label htmlFor="tenant_name">Tenant Name *</Label>
        <Input
          id="tenant_name"
          value={context.tenant_name}
          onChange={(e) => update({ tenant_name: e.target.value })}
          placeholder="e.g. John Smith"
          aria-invalid={!!errors.tenant_name}
        />
        {errors.tenant_name && (
          <p className="text-xs text-destructive">{errors.tenant_name}</p>
        )}
      </div>

      {/* Entry Notice fields */}
      {noticeType === "entry" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="entry_purpose">Purpose of Entry *</Label>
            <Select
              value={context.entry_purpose ?? ""}
              onValueChange={(v) => update({ entry_purpose: v ?? undefined })}
            >
              <SelectTrigger
                id="entry_purpose"
                aria-invalid={!!errors.entry_purpose}
              >
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inspection">Inspection</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Showing">Showing</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.entry_purpose && (
              <p className="text-xs text-destructive">
                {errors.entry_purpose}
              </p>
            )}
          </div>

          <DatePickerField
            label="Proposed Entry Date *"
            value={context.proposed_date}
            onChange={(d) => update({ proposed_date: d })}
            error={errors.proposed_date}
          />

          <div className="space-y-1.5">
            <Label htmlFor="additional_details">
              Additional Details (optional)
            </Label>
            <Textarea
              id="additional_details"
              value={context.additional_details ?? ""}
              onChange={(e) =>
                update({ additional_details: e.target.value })
              }
              placeholder="Any additional context for the notice..."
              rows={3}
            />
          </div>
        </>
      )}

      {/* Lease Violation fields */}
      {noticeType === "lease_violation" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="violation_type">Type of Violation *</Label>
            <Select
              value={context.violation_type ?? ""}
              onValueChange={(v) => update({ violation_type: v ?? undefined })}
            >
              <SelectTrigger
                id="violation_type"
                aria-invalid={!!errors.violation_type}
              >
                <SelectValue placeholder="Select violation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Non-payment">Non-payment</SelectItem>
                <SelectItem value="Property damage">
                  Property damage
                </SelectItem>
                <SelectItem value="Nuisance">Nuisance</SelectItem>
                <SelectItem value="Unauthorized occupant">
                  Unauthorized occupant
                </SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.violation_type && (
              <p className="text-xs text-destructive">
                {errors.violation_type}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="violation_description">
              Violation Description *
            </Label>
            <Textarea
              id="violation_description"
              value={context.violation_description ?? ""}
              onChange={(e) =>
                update({ violation_description: e.target.value })
              }
              placeholder="Describe the lease violation..."
              rows={3}
              aria-invalid={!!errors.violation_description}
            />
            {errors.violation_description && (
              <p className="text-xs text-destructive">
                {errors.violation_description}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="additional_details">
              Additional Details (optional)
            </Label>
            <Textarea
              id="additional_details"
              value={context.additional_details ?? ""}
              onChange={(e) =>
                update({ additional_details: e.target.value })
              }
              placeholder="Any additional context..."
              rows={2}
            />
          </div>
        </>
      )}

      {/* Rent Increase fields */}
      {noticeType === "rent_increase" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="current_rent">Current Rent ($) *</Label>
              <Input
                id="current_rent"
                type="number"
                min="0"
                step="0.01"
                value={context.current_rent ?? ""}
                onChange={(e) =>
                  update({ current_rent: e.target.value })
                }
                placeholder="1500.00"
                aria-invalid={!!errors.current_rent}
              />
              {errors.current_rent && (
                <p className="text-xs text-destructive">
                  {errors.current_rent}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_rent">New Rent ($) *</Label>
              <Input
                id="new_rent"
                type="number"
                min="0"
                step="0.01"
                value={context.new_rent ?? ""}
                onChange={(e) =>
                  update({ new_rent: e.target.value })
                }
                placeholder="1600.00"
                aria-invalid={!!errors.new_rent}
              />
              {errors.new_rent && (
                <p className="text-xs text-destructive">
                  {errors.new_rent}
                </p>
              )}
            </div>
          </div>

          <DatePickerField
            label="Effective Date *"
            value={context.effective_date}
            onChange={(d) => update({ effective_date: d })}
            error={errors.effective_date}
          />

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={context.reason ?? ""}
              onChange={(e) => update({ reason: e.target.value })}
              placeholder="Reason for the rent increase..."
              rows={2}
            />
          </div>
        </>
      )}

      {/* Eviction fields */}
      {noticeType === "eviction" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="eviction_reason">Reason *</Label>
            <Select
              value={context.eviction_reason ?? ""}
              onValueChange={(v) => update({ eviction_reason: v ?? undefined })}
            >
              <SelectTrigger
                id="eviction_reason"
                aria-invalid={!!errors.eviction_reason}
              >
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Non-payment">Non-payment</SelectItem>
                <SelectItem value="Lease violation">
                  Lease violation
                </SelectItem>
                <SelectItem value="No-cause termination">
                  No-cause termination
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.eviction_reason && (
              <p className="text-xs text-destructive">
                {errors.eviction_reason}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eviction_details">Issue Details *</Label>
            <Textarea
              id="eviction_details"
              value={context.eviction_details ?? ""}
              onChange={(e) =>
                update({ eviction_details: e.target.value })
              }
              placeholder="Describe the issue in detail..."
              rows={3}
              aria-invalid={!!errors.eviction_details}
            />
            {errors.eviction_details && (
              <p className="text-xs text-destructive">
                {errors.eviction_details}
              </p>
            )}
          </div>

          {context.eviction_reason !== "No-cause termination" && (
            <DatePickerField
              label="Cure Deadline (optional)"
              value={context.cure_deadline}
              onChange={(d) => update({ cure_deadline: d })}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Step 4: Preview ──────────────────────────────────

function StepPreview({
  notice,
  generating,
  error,
  onRetry,
  jurisdiction,
}: {
  notice: GeneratedNotice | null;
  generating: boolean;
  error: string | null;
  onRetry: () => void;
  jurisdiction?: { state_code: string; city: string | null } | null;
}) {
  if (generating) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Generating your notice...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!notice) return null;

  return (
    <div className="space-y-4">
      {/* Notice content */}
      <div className="rounded-lg border bg-white p-6 font-mono text-sm whitespace-pre-wrap dark:bg-zinc-950">
        {notice.content}
      </div>

      {/* Metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        {jurisdiction && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Jurisdiction
            </p>
            <p className="mt-1 text-sm">
              {jurisdiction.state_code}
              {jurisdiction.city ? ` / ${jurisdiction.city}` : ""}
            </p>
          </div>
        )}

        {notice.notice_period_days > 0 && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Required Notice Period
            </p>
            <p className="mt-1 text-sm">
              {notice.notice_period_days} days
            </p>
          </div>
        )}

        {notice.statutory_citations.length > 0 && (
          <div className="rounded-lg border p-3 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">
              Statute Citations
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {notice.statutory_citations.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Generated At
          </p>
          <p className="mt-1 text-sm">
            {new Date(notice.generated_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Send ─────────────────────────────────────

function StepSend({
  notice,
  deliveryMethod,
  onDeliveryMethodChange,
  legalReviewChecked,
  onLegalReviewChange,
  sending,
  onSend,
}: {
  notice: GeneratedNotice;
  deliveryMethod: string;
  onDeliveryMethodChange: (v: string) => void;
  legalReviewChecked: boolean;
  onLegalReviewChange: (v: boolean) => void;
  sending: boolean;
  onSend: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review the notice one more time before sending.
      </p>

      {/* Read-only preview */}
      <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs whitespace-pre-wrap">
        {notice.content}
      </div>

      {/* Delivery method */}
      <div className="space-y-2">
        <Label>Delivery Method</Label>
        <RadioGroup
          value={deliveryMethod}
          onValueChange={onDeliveryMethodChange}
        >
          <label className="flex cursor-pointer items-center gap-2 rounded border p-3 hover:bg-accent/50">
            <RadioGroupItem value="email" />
            <span className="text-sm">Email</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded border p-3 hover:bg-accent/50">
            <RadioGroupItem value="print" />
            <span className="text-sm">Print (I&apos;ll deliver)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded border p-3 hover:bg-accent/50">
            <RadioGroupItem value="other" />
            <span className="text-sm">Other</span>
          </label>
        </RadioGroup>
      </div>

      {/* Legal review checkbox */}
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          checked={legalReviewChecked}
          onCheckedChange={(v) => onLegalReviewChange(v === true)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            I have reviewed this notice with a legal professional
          </p>
          <p className="text-xs text-muted-foreground">
            Recommended but not required
          </p>
        </div>
      </div>

      {/* Warning */}
      <DisclaimerBanner
        type="error"
        text="This notice was generated by an AI tool. It should be reviewed by a qualified attorney before delivery."
      />

      {/* Send button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          onClick={onSend}
          disabled={sending}
          className="gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send Notice
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Shared: Date Picker Field ────────────────────────

function DatePickerField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: Date;
  onChange: (d: Date | undefined) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={`flex h-8 w-full items-center gap-2 rounded-lg border px-2.5 text-sm ${
            value ? "" : "text-muted-foreground"
          } ${error ? "border-destructive" : "border-input"}`}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {value ? format(value, "PPP") : "Select a date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
            disabled={(date) => date < new Date()}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

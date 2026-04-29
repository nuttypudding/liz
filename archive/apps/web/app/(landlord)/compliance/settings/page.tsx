"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarIcon,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Property, Tenant } from "@/lib/types";

// --- Types ---

interface JurisdictionData {
  property_id: string;
  state_code: string | null;
  city: string | null;
  suggestion: {
    suggested_state_code: string;
    suggested_city: string | null;
  } | null;
}

interface ChecklistItem {
  id: string;
  topic: string;
  description: string;
  completed: boolean;
}

interface LeaseFormData {
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: string;
  security_deposit: string;
  lease_type: "yearly" | "month_to_month" | "";
  tenant_name: string;
  unit_number: string;
}

interface FormErrors {
  state?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent?: string;
  security_deposit?: string;
}

const INITIAL_LEASE_FORM: LeaseFormData = {
  lease_start_date: "",
  lease_end_date: "",
  monthly_rent: "",
  security_deposit: "",
  lease_type: "",
  tenant_name: "",
  unit_number: "",
};

// --- Page ---

export default function ComplianceSettingsPage() {
  // Property state
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Jurisdiction state
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [citiesByState, setCitiesByState] = useState<Record<string, string[]>>({});
  const [jurisdiction, setJurisdiction] = useState<JurisdictionData | null>(null);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [jurisdictionLoading, setJurisdictionLoading] = useState(false);
  const [savingJurisdiction, setSavingJurisdiction] = useState(false);

  // Lease terms state
  const [leaseForm, setLeaseForm] = useState<LeaseFormData>(INITIAL_LEASE_FORM);
  const [savingLease, setSavingLease] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Checklist preview
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Validation
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const tenants = selectedProperty?.tenants ?? [];
  const availableCities = selectedState ? (citiesByState[selectedState] ?? []) : [];

  // --- Data fetching ---

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch("/api/properties");
      if (!res.ok) return;
      const { properties: props } = (await res.json()) as { properties: Property[] };
      setProperties(props ?? []);
      if (props?.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(props[0].id);
      }
    } catch {
      // handled by empty state
    }
  }, [selectedPropertyId]);

  const fetchJurisdictions = useCallback(async () => {
    try {
      const res = await fetch("/api/compliance/jurisdictions");
      if (!res.ok) return;
      const data = (await res.json()) as { states: string[]; cities: Record<string, string[]> };
      setAvailableStates(data.states);
      setCitiesByState(data.cities);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchJurisdictionForProperty = useCallback(async (propertyId: string) => {
    setJurisdictionLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/jurisdiction`);
      if (!res.ok) return;
      const data = (await res.json()) as JurisdictionData;
      setJurisdiction(data);
      setSelectedState(data.state_code ?? "");
      setSelectedCity(data.city ?? "");
    } catch {
      // handled by empty state
    } finally {
      setJurisdictionLoading(false);
    }
  }, []);

  const fetchChecklist = useCallback(async (propertyId: string) => {
    setChecklistLoading(true);
    try {
      const res = await fetch(`/api/compliance/${propertyId}/checklist`);
      if (!res.ok) {
        setChecklistItems([]);
        return;
      }
      const data = (await res.json()) as { items: ChecklistItem[] };
      setChecklistItems(data.items ?? []);
    } catch {
      setChecklistItems([]);
    } finally {
      setChecklistLoading(false);
    }
  }, []);

  const loadLeaseTerms = useCallback(
    (property: Property, tenant: Tenant | undefined) => {
      setLeaseForm({
        lease_start_date: tenant?.lease_start_date ?? "",
        lease_end_date: tenant?.lease_end_date ?? "",
        monthly_rent: property.monthly_rent?.toString() ?? "",
        security_deposit: tenant?.custom_fields?.security_deposit ?? "",
        lease_type: (tenant?.lease_type as LeaseFormData["lease_type"]) ?? "",
        tenant_name: tenant
          ? `${tenant.first_name} ${tenant.last_name}`
          : "",
        unit_number: tenant?.unit_number ?? "",
      });
    },
    []
  );

  // Initial load
  useEffect(() => {
    Promise.all([fetchProperties(), fetchJurisdictions()]).finally(() =>
      setLoading(false)
    );
  }, [fetchProperties, fetchJurisdictions]);

  // When property changes, load jurisdiction + checklist + lease
  useEffect(() => {
    if (!selectedPropertyId) return;
    fetchJurisdictionForProperty(selectedPropertyId);
    fetchChecklist(selectedPropertyId);

    const property = properties.find((p) => p.id === selectedPropertyId);
    if (property) {
      const firstTenant = property.tenants?.[0];
      setSelectedTenantId(firstTenant?.id ?? "");
      loadLeaseTerms(property, firstTenant);
    }
  }, [selectedPropertyId, properties, fetchJurisdictionForProperty, fetchChecklist, loadLeaseTerms]);

  // When tenant selection changes, update lease form
  useEffect(() => {
    if (!selectedProperty) return;
    const tenant = tenants.find((t) => t.id === selectedTenantId);
    loadLeaseTerms(selectedProperty, tenant);
  }, [selectedTenantId, selectedProperty, tenants, loadLeaseTerms]);

  // --- Actions ---

  function handleAcceptSuggestion() {
    if (!jurisdiction?.suggestion) return;
    setSelectedState(jurisdiction.suggestion.suggested_state_code);
    setSelectedCity(jurisdiction.suggestion.suggested_city ?? "");
  }

  async function handleSaveJurisdiction() {
    if (!selectedPropertyId) return;

    // Validate
    const newErrors: FormErrors = {};
    if (!selectedState) {
      newErrors.state = "State is required";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    setSavingJurisdiction(true);
    setErrors((prev) => ({ ...prev, state: undefined }));
    try {
      const res = await fetch(`/api/properties/${selectedPropertyId}/jurisdiction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state_code: selectedState,
          city: selectedCity || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save jurisdiction");
        return;
      }

      toast.success("Jurisdiction updated. Checklist items generated.");

      // Refresh jurisdiction and checklist
      await Promise.all([
        fetchJurisdictionForProperty(selectedPropertyId),
        fetchChecklist(selectedPropertyId),
      ]);
    } catch {
      toast.error("Failed to save jurisdiction");
    } finally {
      setSavingJurisdiction(false);
    }
  }

  function validateLeaseForm(): FormErrors {
    const newErrors: FormErrors = {};
    if (leaseForm.lease_start_date && leaseForm.lease_end_date) {
      if (new Date(leaseForm.lease_end_date) <= new Date(leaseForm.lease_start_date)) {
        newErrors.lease_end_date = "End date must be after start date";
      }
    }
    if (leaseForm.monthly_rent && Number(leaseForm.monthly_rent) < 0) {
      newErrors.monthly_rent = "Rent must be a positive number";
    }
    if (leaseForm.security_deposit && Number(leaseForm.security_deposit) < 0) {
      newErrors.security_deposit = "Deposit must be a positive number";
    }
    return newErrors;
  }

  async function handleSaveLease() {
    if (!selectedPropertyId || !selectedProperty) return;

    const validationErrors = validateLeaseForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...validationErrors }));
      return;
    }
    setErrors({});

    setSavingLease(true);
    try {
      const promises: Promise<Response>[] = [];

      // Update property monthly_rent if changed
      if (leaseForm.monthly_rent !== (selectedProperty.monthly_rent?.toString() ?? "")) {
        promises.push(
          fetch(`/api/properties/${selectedPropertyId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              monthly_rent: leaseForm.monthly_rent
                ? Number(leaseForm.monthly_rent)
                : null,
            }),
          })
        );
      }

      // Update tenant lease terms if tenant selected
      if (selectedTenantId) {
        const existingTenant = tenants.find((t) => t.id === selectedTenantId);
        const existingCustom = existingTenant?.custom_fields ?? {};
        promises.push(
          fetch(`/api/tenants/${selectedTenantId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lease_start_date: leaseForm.lease_start_date || null,
              lease_end_date: leaseForm.lease_end_date || null,
              lease_type: leaseForm.lease_type || null,
              unit_number: leaseForm.unit_number || null,
              custom_fields: {
                ...existingCustom,
                security_deposit: leaseForm.security_deposit || undefined,
              },
            }),
          })
        );
      }

      const results = await Promise.all(promises);
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const err = await failed.json().catch(() => ({}));
        toast.error(err.error || "Failed to save lease terms");
        return;
      }

      toast.success("Lease terms saved");

      // Refresh properties to get updated data
      await fetchProperties();
    } catch {
      toast.error("Failed to save lease terms");
    } finally {
      setSavingLease(false);
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Compliance Settings"
          description="Configure jurisdictions and lease terms for each property"
        />
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Compliance Settings"
          description="Configure jurisdictions and lease terms for each property"
        />
        <DisclaimerBanner
          type="warning"
          text={COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE}
          dismissable
        />
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Create a property to configure compliance settings."
          action={{ label: "Go to Properties", href: "/properties" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Settings"
        description="Configure jurisdictions and lease terms for each property"
      />

      <DisclaimerBanner
        type="warning"
        text={COMPLIANCE_DISCLAIMERS.JURISDICTION_SPECIFIC}
        dismissable
      />

      {/* Property selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="size-5 text-muted-foreground" />
              <div>
                <Label htmlFor="property-select" className="text-sm font-medium">
                  Select Property
                </Label>
                <p className="text-xs text-muted-foreground">
                  Choose which property to configure
                </p>
              </div>
            </div>
            <Select value={selectedPropertyId} onValueChange={(v) => v && setSelectedPropertyId(v)}>
              <SelectTrigger id="property-select" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedProperty && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {selectedProperty.address_line1}, {selectedProperty.city},{" "}
              {selectedProperty.state} {selectedProperty.postal_code}
              {jurisdiction?.state_code && (
                <Badge variant="secondary" className="ml-2">
                  {jurisdiction.state_code}
                  {jurisdiction.city ? ` / ${jurisdiction.city}` : ""}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Jurisdiction section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property Jurisdiction</CardTitle>
            <CardDescription>
              Jurisdiction determines which rules apply to your property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jurisdictionLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <>
                {/* Auto-detect suggestion */}
                {jurisdiction?.suggestion && !jurisdiction.state_code && (
                  <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900/30 dark:bg-blue-950/40">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1 space-y-2">
                      <p className="text-blue-900 dark:text-blue-200">
                        Auto-detected from address:{" "}
                        <strong>{jurisdiction.suggestion.suggested_state_code}</strong>
                        {jurisdiction.suggestion.suggested_city &&
                          ` / ${jurisdiction.suggestion.suggested_city}`}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAcceptSuggestion}
                      >
                        Accept Suggestion
                      </Button>
                    </div>
                  </div>
                )}

                {/* State dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="state-select">State</Label>
                  <Select value={selectedState} onValueChange={(v) => {
                    setSelectedState(v ?? "");
                    setSelectedCity("");
                    setErrors((prev) => ({ ...prev, state: undefined }));
                  }}>
                    <SelectTrigger
                      id="state-select"
                      className={errors.state ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStates.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && (
                    <p className="text-xs text-destructive">{errors.state}</p>
                  )}
                </div>

                {/* City dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="city-select">City (optional)</Label>
                  <Select
                    value={selectedCity}
                    onValueChange={(v) => setSelectedCity(v ?? "")}
                    disabled={availableCities.length === 0}
                  >
                    <SelectTrigger id="city-select">
                      <SelectValue
                        placeholder={
                          availableCities.length === 0
                            ? "No city rules for this state"
                            : "Select city"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Save jurisdiction */}
                <Button
                  onClick={handleSaveJurisdiction}
                  disabled={savingJurisdiction || !selectedState}
                  className="w-full"
                >
                  {savingJurisdiction ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Save Jurisdiction
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lease terms section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lease Information</CardTitle>
            <CardDescription>
              Used for compliance checks (e.g., notice periods, deposit limits)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tenant selector (if multiple tenants) */}
            {tenants.length > 1 && (
              <div className="space-y-1.5">
                <Label>Tenant</Label>
                <Select value={selectedTenantId} onValueChange={(v) => v && setSelectedTenantId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                        {t.unit_number ? ` (Unit ${t.unit_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tenants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No tenants found for this property. Add a tenant to configure
                lease terms.
              </p>
            )}

            {/* Lease start date */}
            <DatePickerField
              label="Lease Start Date"
              value={leaseForm.lease_start_date ? new Date(leaseForm.lease_start_date) : undefined}
              onChange={(d) =>
                setLeaseForm((prev) => ({
                  ...prev,
                  lease_start_date: d ? format(d, "yyyy-MM-dd") : "",
                }))
              }
              error={errors.lease_start_date}
            />

            {/* Lease end date */}
            <DatePickerField
              label="Lease End Date"
              value={leaseForm.lease_end_date ? new Date(leaseForm.lease_end_date) : undefined}
              onChange={(d) => {
                setLeaseForm((prev) => ({
                  ...prev,
                  lease_end_date: d ? format(d, "yyyy-MM-dd") : "",
                }));
                setErrors((prev) => ({ ...prev, lease_end_date: undefined }));
              }}
              error={errors.lease_end_date}
            />

            {/* Monthly rent */}
            <div className="space-y-1.5">
              <Label htmlFor="monthly-rent">Monthly Rent ($)</Label>
              <Input
                id="monthly-rent"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={leaseForm.monthly_rent}
                onChange={(e) => {
                  setLeaseForm((prev) => ({ ...prev, monthly_rent: e.target.value }));
                  setErrors((prev) => ({ ...prev, monthly_rent: undefined }));
                }}
                className={errors.monthly_rent ? "border-destructive" : ""}
              />
              {errors.monthly_rent && (
                <p className="text-xs text-destructive">{errors.monthly_rent}</p>
              )}
            </div>

            {/* Security deposit */}
            <div className="space-y-1.5">
              <Label htmlFor="security-deposit">Security Deposit ($)</Label>
              <Input
                id="security-deposit"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={leaseForm.security_deposit}
                onChange={(e) => {
                  setLeaseForm((prev) => ({ ...prev, security_deposit: e.target.value }));
                  setErrors((prev) => ({ ...prev, security_deposit: undefined }));
                }}
                className={errors.security_deposit ? "border-destructive" : ""}
              />
              {errors.security_deposit && (
                <p className="text-xs text-destructive">{errors.security_deposit}</p>
              )}
            </div>

            {/* Lease type */}
            <div className="space-y-1.5">
              <Label htmlFor="lease-type">Lease Type</Label>
              <Select
                value={leaseForm.lease_type}
                onValueChange={(v) =>
                  setLeaseForm((prev) => ({
                    ...prev,
                    lease_type: v as LeaseFormData["lease_type"],
                  }))
                }
              >
                <SelectTrigger id="lease-type">
                  <SelectValue placeholder="Select lease type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Fixed Term</SelectItem>
                  <SelectItem value="month_to_month">Month-to-Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tenant name (display / optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-name">Tenant Name</Label>
              <Input
                id="tenant-name"
                placeholder="Tenant name"
                value={leaseForm.tenant_name}
                onChange={(e) =>
                  setLeaseForm((prev) => ({ ...prev, tenant_name: e.target.value }))
                }
                disabled={!!selectedTenantId}
              />
            </div>

            {/* Unit number */}
            <div className="space-y-1.5">
              <Label htmlFor="unit-number">Unit Number</Label>
              <Input
                id="unit-number"
                placeholder="e.g., 2A"
                value={leaseForm.unit_number}
                onChange={(e) =>
                  setLeaseForm((prev) => ({ ...prev, unit_number: e.target.value }))
                }
              />
            </div>

            {/* Save lease */}
            <Button
              onClick={handleSaveLease}
              disabled={savingLease || (tenants.length === 0 && !leaseForm.monthly_rent)}
              className="w-full"
            >
              {savingLease ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save Lease Terms
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Checklist preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Compliance Checklist Preview</CardTitle>
              <CardDescription>
                Items generated based on your jurisdiction
              </CardDescription>
            </div>
            {checklistItems.length > 0 && (
              <Badge variant="secondary">
                {checklistItems.length} item{checklistItems.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {checklistLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : checklistItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {jurisdiction?.state_code
                ? "No checklist items yet. Save a jurisdiction to generate them."
                : "Set a jurisdiction above to generate compliance checklist items."}
            </p>
          ) : (
            <div className="space-y-2">
              {checklistItems.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <CheckCircle2
                    className={`mt-0.5 size-4 shrink-0 ${
                      item.completed
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium capitalize">
                      {item.topic.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
              {checklistItems.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {checklistItems.length} total items.{" "}
                  <Link
                    href={`/compliance/${selectedPropertyId}`}
                    className="text-primary hover:underline"
                  >
                    View all on compliance dashboard
                  </Link>
                </p>
              )}
              {checklistItems.length <= 8 && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/compliance/${selectedPropertyId}`}>
                      <ExternalLink className="mr-2 size-3.5" />
                      View Full Dashboard
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced links */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="sm" asChild>
          <Link href="/compliance">
            <ExternalLink className="mr-2 size-3.5" />
            View All Properties
          </Link>
        </Button>
        {selectedPropertyId && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/compliance/${selectedPropertyId}`}>
              <ExternalLink className="mr-2 size-3.5" />
              View Alerts for This Property
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Date Picker component (matches pattern from notices/create) ---

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
          className={`flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm ${
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
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

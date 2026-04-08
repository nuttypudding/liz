"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PiggyBank,
  Scale,
  Zap,
  ShieldCheck,
  Sparkles,
  Bot,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  Building2,
  Users,
  Wrench,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { OptionCard } from "@/components/onboarding/option-card";

type RiskAppetite = "cost_first" | "balanced" | "speed_first";
type DelegationMode = "manual" | "assist" | "auto";
type Specialty =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "structural"
  | "pest"
  | "appliance"
  | "general";

interface PropertyDraft {
  name: string;
  address: string;
  unit_count: string;
  monthly_rent: string;
}

interface TenantEntry {
  name: string;
  email: string;
  phone: string;
  unit_number: string;
}

interface VendorEntry {
  name: string;
  phone: string;
  email: string;
  specialty: Specialty;
  notes: string;
}

const DEFAULTS = {
  risk_appetite: "balanced" as RiskAppetite,
  delegation_mode: "assist" as DelegationMode,
  max_auto_approve: 150,
};

const STEP_LABELS = [
  "AI Preferences",
  "Property",
  "Tenants",
  "Vendors",
  "Review",
];

const SPECIALTY_LABELS: Record<Specialty, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  structural: "Structural",
  pest: "Pest Control",
  appliance: "Appliance",
  general: "General",
};

const EMPTY_TENANT: TenantEntry = {
  name: "",
  email: "",
  phone: "",
  unit_number: "",
};

const EMPTY_VENDOR: VendorEntry = {
  name: "",
  phone: "",
  email: "",
  specialty: "general",
  notes: "",
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step 1: AI Preferences
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>(
    DEFAULTS.risk_appetite
  );
  const [delegationMode, setDelegationMode] = useState<DelegationMode>(
    DEFAULTS.delegation_mode
  );
  const [maxAutoApprove, setMaxAutoApprove] = useState(
    DEFAULTS.max_auto_approve
  );

  // Step 2: Property
  const [property, setProperty] = useState<PropertyDraft>({
    name: "",
    address: "",
    unit_count: "1",
    monthly_rent: "",
  });
  const [propertyErrors, setPropertyErrors] = useState<
    Record<string, string>
  >({});

  // Step 3: Tenants
  const [tenants, setTenants] = useState<TenantEntry[]>([]);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantDraft, setTenantDraft] = useState<TenantEntry>({
    ...EMPTY_TENANT,
  });
  const [tenantDraftError, setTenantDraftError] = useState("");

  // Step 4: Vendors
  const [vendors, setVendors] = useState<VendorEntry[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorDraft, setVendorDraft] = useState<VendorEntry>({
    ...EMPTY_VENDOR,
  });
  const [vendorDraftError, setVendorDraftError] = useState("");

  // Retry safety
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);
  const [savedTenantCount, setSavedTenantCount] = useState(0);
  const [savedVendorCount, setSavedVendorCount] = useState(0);

  const riskLabels: Record<RiskAppetite, string> = {
    cost_first: "Save Money",
    balanced: "Balanced",
    speed_first: "Move Fast",
  };

  const delegationLabels: Record<DelegationMode, string> = {
    manual: "I approve everything",
    assist: "Auto-approve small jobs",
    auto: "Full autopilot",
  };

  function validateProperty(): boolean {
    const errors: Record<string, string> = {};
    if (!property.name.trim()) errors.name = "Property name is required";
    if (!property.address.trim()) errors.address = "Address is required";
    setPropertyErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handlePropertyNext() {
    if (validateProperty()) setStep(3);
  }

  function addTenant() {
    if (!tenantDraft.name.trim()) {
      setTenantDraftError("Tenant name is required");
      return;
    }
    setTenants((prev) => [...prev, { ...tenantDraft }]);
    setTenantDraft({ ...EMPTY_TENANT });
    setShowTenantForm(false);
    setTenantDraftError("");
  }

  function removeTenant(index: number) {
    setTenants((prev) => prev.filter((_, i) => i !== index));
  }

  function addVendor() {
    if (!vendorDraft.name.trim()) {
      setVendorDraftError("Vendor name is required");
      return;
    }
    setVendors((prev) => [...prev, { ...vendorDraft }]);
    setVendorDraft({ ...EMPTY_VENDOR });
    setShowVendorForm(false);
    setVendorDraftError("");
  }

  function removeVendor(index: number) {
    setVendors((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSkipAI() {
    setRiskAppetite(DEFAULTS.risk_appetite);
    setDelegationMode(DEFAULTS.delegation_mode);
    setMaxAutoApprove(DEFAULTS.max_auto_approve);
    setStep(2);
  }

  async function handleSaveAll() {
    setSaving(true);
    setSaveError(null);

    try {
      // 1. Save profile
      const profileRes = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_appetite: riskAppetite,
          delegation_mode: delegationMode,
          max_auto_approve:
            delegationMode === "manual" ? 0 : maxAutoApprove,
          notify_emergencies: true,
          notify_all_requests: false,
          onboarding_completed: true,
        }),
      });
      if (!profileRes.ok) throw new Error("Failed to save AI preferences");

      // 2. Create property (skip if already saved on retry)
      let propertyId = savedPropertyId;
      if (!propertyId) {
        const propRes = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: property.name.trim(),
            address: property.address.trim(),
            unit_count: parseInt(property.unit_count, 10) || 1,
            monthly_rent: property.monthly_rent
              ? parseFloat(property.monthly_rent)
              : undefined,
          }),
        });
        if (!propRes.ok) throw new Error("Failed to create property");
        const propData = await propRes.json();
        propertyId = propData.property.id;
        setSavedPropertyId(propertyId);
      }

      // 3. Add tenants (skip already-saved ones on retry)
      for (let i = savedTenantCount; i < tenants.length; i++) {
        const t = tenants[i];
        const tRes = await fetch(`/api/properties/${propertyId}/tenants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: t.name.trim(),
            email: t.email.trim() || undefined,
            phone: t.phone.trim() || undefined,
            unit_number: t.unit_number.trim() || undefined,
          }),
        });
        if (!tRes.ok)
          throw new Error(`Failed to add tenant "${t.name}"`);
        setSavedTenantCount(i + 1);
      }

      // 4. Add vendors (skip already-saved ones on retry)
      for (let i = savedVendorCount; i < vendors.length; i++) {
        const v = vendors[i];
        const vRes = await fetch("/api/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: v.name.trim(),
            phone: v.phone.trim() || undefined,
            email: v.email.trim() || undefined,
            specialty: v.specialty,
            notes: v.notes.trim() || undefined,
          }),
        });
        if (!vRes.ok)
          throw new Error(`Failed to add vendor "${v.name}"`);
        setSavedVendorCount(i + 1);
      }

      router.push("/dashboard");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step} of 5 &mdash; {STEP_LABELS[step - 1]}
          </span>
          {step === 1 && (
            <button
              type="button"
              onClick={handleSkipAI}
              className="text-primary hover:underline"
            >
              Use default AI settings
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={() => setStep(4)}
              className="text-primary hover:underline"
            >
              Skip tenants
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              onClick={() => setStep(5)}
              className="text-primary hover:underline"
            >
              Skip vendors
            </button>
          )}
        </div>
        <Progress value={(step / 5) * 100} />
      </div>

      {/* Step 1: AI Preferences */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Welcome to Liz! How should your AI prioritize?
            </CardTitle>
            <CardDescription>
              This affects how we rank urgency and pick vendors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <OptionCard
              icon={PiggyBank}
              title="Save Money"
              description="Minimize repair costs. AI suggests the most affordable options."
              selected={riskAppetite === "cost_first"}
              onSelect={() => setRiskAppetite("cost_first")}
            />
            <OptionCard
              icon={Scale}
              title="Balanced"
              description="AI weighs both cost and speed equally."
              selected={riskAppetite === "balanced"}
              onSelect={() => setRiskAppetite("balanced")}
              badge="Recommended"
              badgeVariant="secondary"
            />
            <OptionCard
              icon={Zap}
              title="Move Fast"
              description="Minimize resolution time. AI prioritizes fast vendor response."
              selected={riskAppetite === "speed_first"}
              onSelect={() => setRiskAppetite("speed_first")}
            />

            <div className="pt-1 space-y-3">
              <p className="text-sm font-medium">
                How much should Liz handle on her own?
              </p>
              <OptionCard
                icon={ShieldCheck}
                title="I approve everything"
                description="AI classifies and suggests — you make every call."
                selected={delegationMode === "manual"}
                onSelect={() => setDelegationMode("manual")}
              />
              <OptionCard
                icon={Sparkles}
                title="Auto-approve small jobs"
                description="AI handles jobs under your threshold. You approve the rest."
                selected={delegationMode === "assist"}
                onSelect={() => setDelegationMode("assist")}
                badge="Recommended"
                badgeVariant="secondary"
              />
              {delegationMode === "assist" && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Auto-approve up to:
                    </span>
                    <span className="font-semibold">${maxAutoApprove}</span>
                  </div>
                  <Slider
                    value={[maxAutoApprove]}
                    onValueChange={(value) => {
                      if (Array.isArray(value)) setMaxAutoApprove(value[0]);
                    }}
                    min={50}
                    max={500}
                    step={25}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>$50</span>
                    <span>$500</span>
                  </div>
                </div>
              )}
              <OptionCard
                icon={Bot}
                title="Full autopilot"
                description="AI handles routine jobs. You review after."
                selected={delegationMode === "auto"}
                onSelect={() => {}}
                badge="Coming soon"
                badgeVariant="outline"
                disabled
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              className="w-full min-h-11 mt-2"
            >
              Next
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: First Property */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Add your first property
            </CardTitle>
            <CardDescription>
              Liz needs at least one property to manage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prop-name">Property name</Label>
              <Input
                id="prop-name"
                placeholder='e.g. "Oak Street Duplex"'
                value={property.name}
                onChange={(e) => {
                  setProperty((p) => ({ ...p, name: e.target.value }));
                  if (propertyErrors.name)
                    setPropertyErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                }}
              />
              {propertyErrors.name && (
                <p className="text-xs text-destructive">
                  {propertyErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-address">Address</Label>
              <Input
                id="prop-address"
                placeholder="123 Main St, City, State"
                value={property.address}
                onChange={(e) => {
                  setProperty((p) => ({ ...p, address: e.target.value }));
                  if (propertyErrors.address)
                    setPropertyErrors((prev) => {
                      const next = { ...prev };
                      delete next.address;
                      return next;
                    });
                }}
              />
              {propertyErrors.address && (
                <p className="text-xs text-destructive">
                  {propertyErrors.address}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-units">Number of units</Label>
                <Input
                  id="prop-units"
                  type="number"
                  min={1}
                  max={999}
                  value={property.unit_count}
                  onChange={(e) =>
                    setProperty((p) => ({
                      ...p,
                      unit_count: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-rent">Monthly rent ($)</Label>
                <Input
                  id="prop-rent"
                  type="number"
                  min={0}
                  placeholder="Optional"
                  value={property.monthly_rent}
                  onChange={(e) =>
                    setProperty((p) => ({
                      ...p,
                      monthly_rent: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="min-h-11"
              >
                <ArrowLeft data-icon="inline-start" />
                Back
              </Button>
              <Button
                onClick={handlePropertyNext}
                className="flex-1 min-h-11"
              >
                Next
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Add Tenants */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Add tenants
            </CardTitle>
            <CardDescription>
              Add tenants for {property.name || "your property"}. You can
              always add more later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenants.length > 0 && (
              <div className="space-y-2">
                {tenants.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[t.unit_number && `Unit ${t.unit_number}`, t.email]
                          .filter(Boolean)
                          .join(" · ") || "No details"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTenant(i)}
                      className="ml-2 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showTenantForm ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Name</Label>
                  <Input
                    id="tenant-name"
                    placeholder="Tenant name"
                    value={tenantDraft.name}
                    onChange={(e) =>
                      setTenantDraft((d) => ({
                        ...d,
                        name: e.target.value,
                      }))
                    }
                  />
                  {tenantDraftError && (
                    <p className="text-xs text-destructive">
                      {tenantDraftError}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-email">Email</Label>
                    <Input
                      id="tenant-email"
                      type="email"
                      placeholder="Optional"
                      value={tenantDraft.email}
                      onChange={(e) =>
                        setTenantDraft((d) => ({
                          ...d,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-phone">Phone</Label>
                    <Input
                      id="tenant-phone"
                      placeholder="Optional"
                      value={tenantDraft.phone}
                      onChange={(e) =>
                        setTenantDraft((d) => ({
                          ...d,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant-unit">Unit number</Label>
                  <Input
                    id="tenant-unit"
                    placeholder="Optional"
                    value={tenantDraft.unit_number}
                    onChange={(e) =>
                      setTenantDraft((d) => ({
                        ...d,
                        unit_number: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowTenantForm(false);
                      setTenantDraft({ ...EMPTY_TENANT });
                      setTenantDraftError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={addTenant}>
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowTenantForm(true)}
                className="w-full"
              >
                <Plus className="size-4 mr-1" />
                Add a tenant
              </Button>
            )}

            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="min-h-11"
              >
                <ArrowLeft data-icon="inline-start" />
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="flex-1 min-h-11"
              >
                Next
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Add Vendors */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5" />
              Add vendors
            </CardTitle>
            <CardDescription>
              Add your go-to contractors. You can always add more later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendors.length > 0 && (
              <div className="space-y-2">
                {vendors.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {v.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {SPECIALTY_LABELS[v.specialty]}
                        {v.phone && ` · ${v.phone}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVendor(i)}
                      className="ml-2 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showVendorForm ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="vendor-name">Name</Label>
                  <Input
                    id="vendor-name"
                    placeholder="Vendor or company name"
                    value={vendorDraft.name}
                    onChange={(e) =>
                      setVendorDraft((d) => ({
                        ...d,
                        name: e.target.value,
                      }))
                    }
                  />
                  {vendorDraftError && (
                    <p className="text-xs text-destructive">
                      {vendorDraftError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-specialty">Specialty</Label>
                  <Select
                    value={vendorDraft.specialty}
                    onValueChange={(val) =>
                      setVendorDraft((d) => ({
                        ...d,
                        specialty: val as Specialty,
                      }))
                    }
                  >
                    <SelectTrigger id="vendor-specialty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SPECIALTY_LABELS) as Specialty[]).map(
                        (key) => (
                          <SelectItem key={key} value={key}>
                            {SPECIALTY_LABELS[key]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="vendor-phone">Phone</Label>
                    <Input
                      id="vendor-phone"
                      placeholder="Optional"
                      value={vendorDraft.phone}
                      onChange={(e) =>
                        setVendorDraft((d) => ({
                          ...d,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-email">Email</Label>
                    <Input
                      id="vendor-email"
                      type="email"
                      placeholder="Optional"
                      value={vendorDraft.email}
                      onChange={(e) =>
                        setVendorDraft((d) => ({
                          ...d,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-notes">Notes</Label>
                  <Input
                    id="vendor-notes"
                    placeholder="Optional"
                    value={vendorDraft.notes}
                    onChange={(e) =>
                      setVendorDraft((d) => ({
                        ...d,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowVendorForm(false);
                      setVendorDraft({ ...EMPTY_VENDOR });
                      setVendorDraftError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={addVendor}>
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowVendorForm(true)}
                className="w-full"
              >
                <Plus className="size-4 mr-1" />
                Add a vendor
              </Button>
            )}

            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="min-h-11"
              >
                <ArrowLeft data-icon="inline-start" />
                Back
              </Button>
              <Button
                onClick={() => setStep(5)}
                className="flex-1 min-h-11"
              >
                Next
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review & Start */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re all set!</CardTitle>
            <CardDescription>
              Review your setup, then hit Start Managing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Preferences summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">AI Preferences</p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={saving}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Priority</span>
                <span className="font-medium">
                  {riskLabels[riskAppetite]}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mode</span>
                <span className="font-medium">
                  {delegationLabels[delegationMode]}
                </span>
              </div>
              {delegationMode === "assist" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Auto-approve</span>
                  <span className="font-medium">
                    Up to ${maxAutoApprove}
                  </span>
                </div>
              )}
              {delegationMode === "manual" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Auto-approve</span>
                  <span className="font-medium">Off</span>
                </div>
              )}
            </div>

            {/* Property summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Building2 className="size-4" />
                  Property
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={saving}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{property.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-right max-w-[60%] truncate">
                  {property.address}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Units</span>
                <span className="font-medium">{property.unit_count}</span>
              </div>
              {property.monthly_rent && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rent</span>
                  <span className="font-medium">
                    ${property.monthly_rent}/mo
                  </span>
                </div>
              )}
            </div>

            {/* Tenants summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="size-4" />
                  Tenants
                </p>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={saving}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </div>
              {tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  None added — you can add tenants later
                </p>
              ) : (
                <ul className="space-y-1">
                  {tenants.map((t, i) => (
                    <li key={i} className="text-sm">
                      {t.name}
                      {t.unit_number && (
                        <span className="text-muted-foreground">
                          {" "}
                          (Unit {t.unit_number})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Vendors summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Wrench className="size-4" />
                  Vendors
                </p>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={saving}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </div>
              {vendors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  None added — you can add vendors later
                </p>
              ) : (
                <ul className="space-y-1">
                  {vendors.map((v, i) => (
                    <li key={i} className="text-sm">
                      {v.name}
                      <span className="text-muted-foreground">
                        {" "}
                        — {SPECIALTY_LABELS[v.specialty]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {saveError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{saveError}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Press the button to retry. Already-saved items won&apos;t be
                  duplicated.
                </p>
              </div>
            )}

            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full min-h-11"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  Start Managing
                  <Check data-icon="inline-end" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

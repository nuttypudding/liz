"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { PhoneInput } from "@/components/ui/phone-input";
import { CustomFields } from "@/components/ui/custom-fields";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tenant } from "@/lib/types";

export interface TenantFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  move_in_date: string;
  lease_type: string;
  lease_start_date: string;
  lease_end_date: string;
  rent_due_day: string;
  custom_fields: Record<string, string>;
}

interface TenantFormProps {
  initialData?: Partial<Tenant>;
  onSave: (data: TenantFormData) => void;
  onCancel: () => void;
}

function hasLeaseData(data?: Partial<Tenant>): boolean {
  if (!data) return false;
  return !!(
    data.lease_type ||
    data.lease_start_date ||
    data.lease_end_date ||
    data.rent_due_day != null ||
    data.move_in_date
  );
}

const RENT_DUE_DAYS = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  const suffix =
    day === 1 || day === 21 ? "st" :
    day === 2 || day === 22 ? "nd" :
    day === 3 || day === 23 ? "rd" : "th";
  return { value: String(day), label: `${day}${suffix}` };
});

export function TenantForm({ initialData, onSave, onCancel }: TenantFormProps) {
  const [form, setForm] = useState<TenantFormData>({
    first_name: initialData?.first_name ?? "",
    last_name: initialData?.last_name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    move_in_date: initialData?.move_in_date ?? "",
    lease_type: initialData?.lease_type ?? "",
    lease_start_date: initialData?.lease_start_date ?? "",
    lease_end_date: initialData?.lease_end_date ?? "",
    rent_due_day: initialData?.rent_due_day != null ? String(initialData.rent_due_day) : "",
    custom_fields: initialData?.custom_fields ?? {},
  });

  const [leaseOpen, setLeaseOpen] = useState(hasLeaseData(initialData));

  const hasLegacyUnit = !!(initialData?.unit_number);
  const isMonthToMonth = form.lease_type === "month_to_month";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      lease_end_date: isMonthToMonth ? "" : form.lease_end_date,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
      {/* First + Last Name — 2 col, both required */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-first-name">First Name</Label>
          <Input
            id="tenant-first-name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="Jane"
            required
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenant-last-name">Last Name</Label>
          <Input
            id="tenant-last-name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            placeholder="Smith"
            required
            className="min-h-11"
          />
        </div>
      </div>

      {/* Email + Phone — 2 col */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-email">Email</Label>
          <Input
            id="tenant-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@example.com"
            required
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenant-phone">Phone</Label>
          <PhoneInput
            id="tenant-phone"
            value={form.phone}
            onValueChange={(digits) => setForm({ ...form, phone: digits })}
            className="min-h-11"
          />
        </div>
      </div>

      {/* Collapsible Lease Details */}
      <Collapsible open={leaseOpen} onOpenChange={setLeaseOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors">
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${leaseOpen ? "rotate-0" : "-rotate-90"}`}
          />
          <span>Lease Details</span>
          <span className="text-xs text-muted-foreground/70">(optional)</span>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-4">
          <p className="text-xs text-muted-foreground">
            You can add lease details now or later.
          </p>

          {/* Lease type — full width */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-lease-type">Lease Type</Label>
            <Select
              value={form.lease_type}
              onValueChange={(val) =>
                setForm({ ...form, lease_type: val ?? "" })
              }
            >
              <SelectTrigger id="tenant-lease-type" className="min-h-11">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="month_to_month">Month to Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lease start + end dates — side-by-side on tablet+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tenant-lease-start">Lease Start</Label>
              <Input
                id="tenant-lease-start"
                type="date"
                value={form.lease_start_date}
                onChange={(e) =>
                  setForm({ ...form, lease_start_date: e.target.value })
                }
                className="min-h-11"
              />
            </div>
            {!isMonthToMonth && (
              <div className="space-y-1.5">
                <Label htmlFor="tenant-lease-end">Lease End</Label>
                <Input
                  id="tenant-lease-end"
                  type="date"
                  value={form.lease_end_date}
                  onChange={(e) =>
                    setForm({ ...form, lease_end_date: e.target.value })
                  }
                  className="min-h-11"
                />
              </div>
            )}
          </div>

          {/* Rent due day + Move-in date — side-by-side on tablet+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tenant-rent-due">Rent Due Day</Label>
              <Select
                value={form.rent_due_day}
                onValueChange={(val) =>
                  setForm({ ...form, rent_due_day: val ?? "" })
                }
              >
                <SelectTrigger id="tenant-rent-due" className="min-h-11">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {RENT_DUE_DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-move-in">Move-in Date</Label>
              <Input
                id="tenant-move-in"
                type="date"
                value={form.move_in_date}
                onChange={(e) =>
                  setForm({ ...form, move_in_date: e.target.value })
                }
                className="min-h-11"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Legacy unit_number — read-only for existing tenants that had one */}
      {hasLegacyUnit && (
        <div className="space-y-1.5">
          <Label htmlFor="tenant-unit-legacy" className="text-muted-foreground">
            Unit Number <span className="text-xs">(legacy)</span>
          </Label>
          <Input
            id="tenant-unit-legacy"
            value={initialData?.unit_number ?? ""}
            readOnly
            disabled
            className="min-h-11 bg-muted"
          />
        </div>
      )}

      {/* Custom fields */}
      <div className="space-y-1.5">
        <Label>Custom Fields</Label>
        <CustomFields
          value={form.custom_fields}
          onChange={(fields) => setForm({ ...form, custom_fields: fields })}
        />
      </div>

      <SheetFooter className="px-0 mt-2">
        <Button type="submit" className="min-h-11">
          Save Tenant
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="min-h-11"
        >
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}

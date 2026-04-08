"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { PhoneInput } from "@/components/ui/phone-input";
import { CustomFields } from "@/components/ui/custom-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tenant } from "@/lib/types";

export interface TenantFormData {
  name: string;
  email: string;
  phone: string;
  move_in_date: string;
  lease_type: string;
  rent_due_day: string;
  custom_fields: Record<string, string>;
}

interface TenantFormProps {
  initialData?: Partial<Tenant>;
  onSave: (data: TenantFormData) => void;
  onCancel: () => void;
}

export function TenantForm({ initialData, onSave, onCancel }: TenantFormProps) {
  const [form, setForm] = useState<TenantFormData>({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    move_in_date: initialData?.move_in_date ?? "",
    lease_type: initialData?.lease_type ?? "",
    rent_due_day: initialData?.rent_due_day != null ? String(initialData.rent_due_day) : "",
    custom_fields: initialData?.custom_fields ?? {},
  });

  const hasLegacyUnit = !!(initialData?.unit_number);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
      {/* Name — full width, required */}
      <div className="space-y-1.5">
        <Label htmlFor="tenant-name">Full Name</Label>
        <Input
          id="tenant-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Jane Smith"
          required
          className="min-h-11"
        />
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

      {/* Move-in date + Lease type — 2 col */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-move-in">Move-in date</Label>
          <Input
            id="tenant-move-in"
            type="date"
            value={form.move_in_date}
            onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenant-lease-type">Lease type</Label>
          <Select
            value={form.lease_type}
            onValueChange={(val) => setForm({ ...form, lease_type: val ?? "" })}
          >
            <SelectTrigger id="tenant-lease-type" className="min-h-11">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="month_to_month">Month to Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rent due day — half width */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-rent-due">Rent due day</Label>
          <Input
            id="tenant-rent-due"
            type="number"
            min={1}
            max={31}
            value={form.rent_due_day}
            onChange={(e) => setForm({ ...form, rent_due_day: e.target.value })}
            placeholder="1–31"
            className="min-h-11"
          />
        </div>
      </div>

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

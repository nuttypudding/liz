"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import type { Property } from "@/lib/types";

export interface PropertyFormData {
  name: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  apt_or_unit_no: string;
  unit_count: number;
  monthly_rent: number;
}

interface PropertyFormProps {
  initialData?: Partial<Property>;
  onSave: (data: PropertyFormData) => void;
  onCancel: () => void;
}

export function PropertyForm({
  initialData,
  onSave,
  onCancel,
}: PropertyFormProps) {
  const [form, setForm] = useState<PropertyFormData>({
    name: initialData?.name ?? "",
    address_line1: initialData?.address_line1 ?? "",
    city: initialData?.city ?? "",
    state: initialData?.state ?? "",
    postal_code: initialData?.postal_code ?? "",
    apt_or_unit_no: initialData?.apt_or_unit_no ?? "",
    unit_count: initialData?.unit_count ?? 1,
    monthly_rent: initialData?.monthly_rent ?? 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="prop-name">Property Name</Label>
        <Input
          id="prop-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Oak Street House"
          required
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prop-address-line1">Street Address</Label>
        <Input
          id="prop-address-line1"
          value={form.address_line1}
          onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
          placeholder="123 Oak Street"
          required
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prop-apt-unit">Apt or Unit No.</Label>
        <Input
          id="prop-apt-unit"
          value={form.apt_or_unit_no}
          onChange={(e) =>
            setForm({ ...form, apt_or_unit_no: e.target.value })
          }
          placeholder="e.g. Suite 200, Unit B"
          className="min-h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prop-city">City</Label>
        <Input
          id="prop-city"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder="Austin"
          required
          className="min-h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prop-state">State</Label>
          <Input
            id="prop-state"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            placeholder="TX"
            required
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prop-postal">ZIP Code</Label>
          <Input
            id="prop-postal"
            value={form.postal_code}
            onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            placeholder="78701"
            required
            className="min-h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prop-units">Unit Count</Label>
          <Input
            id="prop-units"
            type="number"
            min={1}
            value={form.unit_count}
            onChange={(e) =>
              setForm({ ...form, unit_count: Number(e.target.value) })
            }
            required
            className="min-h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prop-rent">Monthly Rent ($)</Label>
          <Input
            id="prop-rent"
            type="number"
            min={0}
            value={form.monthly_rent}
            onChange={(e) =>
              setForm({ ...form, monthly_rent: Number(e.target.value) })
            }
            required
            className="min-h-11"
          />
        </div>
      </div>

      <SheetFooter className="px-0 mt-2">
        <Button type="submit" className="min-h-11">
          Save Property
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

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
  rent_due_day: number;
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
    rent_due_day: initialData?.rent_due_day ?? 1,
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

      <div className="space-y-1.5">
        <Label htmlFor="prop-rent-due-day">Rent Due Day</Label>
        <p className="text-xs text-muted-foreground">Day of the month when rent is due (1–28).</p>
        <select
          id="prop-rent-due-day"
          value={form.rent_due_day}
          onChange={(e) => setForm({ ...form, rent_due_day: Number(e.target.value) })}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
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
